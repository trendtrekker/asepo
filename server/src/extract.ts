import { assertPublicUrl, fetchHtml, FetchError } from './fetch-page.js';
import { parseCaption } from './heuristic.js';
import { parseIngredient, parseIsoDuration, parseYield, type Ingredient } from './ingredients.js';
import { extractIdea, extractWithImage, extractWithLlm, isLlmConfigured, isVisionConfigured, LlmError } from './llm.js';
import { gatherSourceText, platformOf } from './source-text.js';

/**
 * Recipe extraction, in order of trustworthiness:
 *
 *   1. JSON-LD (schema.org/Recipe) — authored by the site, so exact and free.
 *   2. LLM over the caption/page text — handles TikTok, Instagram, prose pages.
 *   3. Heuristic caption parsing — no AI, exploits the near-universal
 *      "INGREDIENTS / METHOD" caption format.
 *
 * Each strategy reports a confidence the app surfaces to the user.
 */

export type ExtractedRecipe = {
  title: string;
  ingredients: Ingredient[];
  instructions: string[];
  minutes?: number;
  servings?: number;
  calories?: number;
  imageUrl?: string;
  source?: { handle: string; platform: string };
  confidence?: number;
  /** Which strategy produced this, for debugging and telemetry. */
  strategy?: 'json-ld' | 'llm' | 'llm-inferred' | 'llm-idea' | 'heuristic' | 'vision' | 'vision-inferred';
};

/**
 * A failure with a message written for the person holding the phone. Only
 * these reach the app — index.ts turns anything else into a generic message,
 * so throwing a bare Error keeps its detail server-side.
 */
export class ExtractionError extends Error {}

/**
 * Server misconfiguration. "Set LLM_API_KEY", "see server/.env" — those are
 * instructions for whoever runs the server, and useless to a cook who can't
 * act on them. Log the real reason here and tell the user the honest,
 * actionable part: it isn't working right now.
 */
function unavailable(reason: string): ExtractionError {
  console.error(`[extract] unavailable — ${reason}`);
  return new ExtractionError('Recipe import is unavailable right now. Try again shortly.');
}

/**
 * Most LlmError messages are diagnostic (malformed replies, protocol
 * mismatches, text passed through verbatim from kie.ai). Only the ones
 * deliberately marked userSafe describe something the user can understand or
 * act on; everything else is logged and replaced.
 */
function userFacing(e: unknown, fallback: string): ExtractionError {
  if (e instanceof LlmError && e.userSafe) return new ExtractionError(e.message);
  console.error('[extract] model failure —', e);
  return new ExtractionError(fallback);
}

/* ------------------------------------------------------------------ *
 * 1. JSON-LD
 * ------------------------------------------------------------------ */

function jsonLdBlocks(html: string): unknown[] {
  const blocks: unknown[] = [];
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    try {
      blocks.push(JSON.parse(m[1].trim()));
    } catch {
      // Malformed JSON-LD is common — skip rather than fail the whole import.
    }
  }
  return blocks;
}

const typeOf = (node: any): string[] => {
  const t = node?.['@type'];
  return Array.isArray(t) ? t.map(String) : t ? [String(t)] : [];
};

function findRecipeNode(input: unknown): any | null {
  const queue: any[] = [input];
  while (queue.length) {
    const node = queue.shift();
    if (!node || typeof node !== 'object') continue;
    if (Array.isArray(node)) {
      queue.push(...node);
      continue;
    }
    if (typeOf(node).includes('Recipe')) return node;
    if (Array.isArray(node['@graph'])) queue.push(...node['@graph']);
  }
  return null;
}

function instructionsFrom(node: any): string[] {
  const flatten = (item: any): string[] => {
    if (typeof item === 'string') return [item];
    if (Array.isArray(item)) return item.flatMap(flatten);
    if (item?.['@type'] === 'HowToSection' && item.itemListElement) return flatten(item.itemListElement);
    if (typeof item?.text === 'string') return [item.text];
    if (typeof item?.name === 'string') return [item.name];
    return [];
  };
  return flatten(node?.recipeInstructions ?? [])
    .map((s) => s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

function imageFrom(node: any): string | undefined {
  const img = node?.image;
  if (typeof img === 'string') return img;
  if (Array.isArray(img)) return typeof img[0] === 'string' ? img[0] : img[0]?.url;
  if (typeof img?.url === 'string') return img.url;
  return undefined;
}

function caloriesFrom(node: any): number | undefined {
  const raw = node?.nutrition?.calories;
  if (typeof raw === 'number') return raw;
  if (typeof raw !== 'string') return undefined;
  const m = raw.match(/\d+/);
  return m ? Number(m[0]) : undefined;
}

function fromJsonLd(html: string, url: URL): ExtractedRecipe | null {
  const node = jsonLdBlocks(html).map(findRecipeNode).find(Boolean);
  if (!node) return null;

  const ingredients = (node.recipeIngredient ?? node.ingredients ?? [])
    .filter((l: unknown): l is string => typeof l === 'string')
    .map(parseIngredient);

  const instructions = instructionsFrom(node);
  if (!ingredients.length && !instructions.length) return null;

  return {
    title: typeof node.name === 'string' ? node.name.trim() : 'Imported recipe',
    ingredients,
    instructions,
    minutes: parseIsoDuration(node.totalTime) ?? parseIsoDuration(node.cookTime),
    servings: parseYield(node.recipeYield),
    calories: caloriesFrom(node),
    imageUrl: imageFrom(node),
    source: { handle: url.hostname.replace(/^www\./, ''), platform: platformOf(url) },
    confidence: 1,
    strategy: 'json-ld',
  };
}

/* ------------------------------------------------------------------ *
 * Orchestration
 * ------------------------------------------------------------------ */

export async function extractFromUrl(rawUrl: string): Promise<ExtractedRecipe> {
  // Async now: judging a hostname means resolving it first — see fetch-page.ts.
  const url = await assertPublicUrl(rawUrl);
  const platform = platformOf(url);

  // Social platforms never carry JSON-LD, so don't waste a fetch on them.
  if (platform === 'Web' || platform === 'Pinterest') {
    try {
      const html = await fetchHtml(url);
      const structured = fromJsonLd(html, url);
      if (structured) return structured;
    } catch (e) {
      // A blocked page can still yield something via oEmbed/OpenGraph below.
      if (!(e instanceof FetchError)) throw e;
    }
  }

  let source;
  try {
    source = await gatherSourceText(url);
  } catch (e) {
    throw new ExtractionError(
      e instanceof FetchError
        ? `${e.message}. Try pasting the recipe text instead.`
        : 'Could not read that link'
    );
  }

  if (!source.text || source.text.length < 40) {
    throw new ExtractionError(
      `There was no readable text at that ${platform} link. Private posts and some sites block automated access — pasting the caption works.`
    );
  }

  const handle = source.author ?? url.hostname.replace(/^www\./, '');

  // 2. LLM, when one is configured and reachable.
  if (isLlmConfigured()) {
    try {
      const llm = await extractWithLlm(source.text, source.title);
      return {
        ...llm,
        imageUrl: source.imageUrl,
        source: { handle, platform },
        // Measurably better than the heuristic on real captions: it separates
        // unquantified ingredients ("Salt & pepper"), preserves ranges, and
        // keeps section labels out of the step list. Below JSON-LD, which is
        // authored by the site rather than inferred.
        confidence: 0.9,
        strategy: 'llm',
      };
    } catch (e) {
      // Fall through to the heuristic; a model outage shouldn't fail the import.
      if (!(e instanceof LlmError)) throw e;
    }
  }

  // 3. Heuristic caption parsing.
  const heuristic = parseCaption(source.text, source.title);
  if (heuristic) {
    return {
      title: heuristic.title,
      ingredients: heuristic.ingredients,
      instructions: heuristic.instructions,
      imageUrl: source.imageUrl,
      source: { handle, platform },
      confidence: heuristic.confidence,
      strategy: 'heuristic',
    };
  }

  // We read the post fine — its caption just doesn't contain a written recipe.
  // Common on Reels and TikToks where the method is only spoken aloud. Saying
  // "try pasting it" would be useless advice when there is nothing to paste.
  throw new ExtractionError(
    `We read that ${platform} post, but its caption has no ingredients or steps in it — the recipe may only be spoken in the video. You can type it in by hand.`
  );
}

/** Import from text the user pasted — same strategies, no fetching. */
export async function extractFromText(text: string): Promise<ExtractedRecipe> {
  if (!text || text.trim().length < 40) {
    throw new ExtractionError('That text is too short to be a recipe');
  }

  if (isLlmConfigured()) {
    try {
      const llm = await extractWithLlm(text);
      return {
        ...llm,
        // Inferred steps are a guess at a typical method, not something the
        // user actually wrote — flag it the same way a recognized meal photo
        // is flagged, so the "double-check this" banner is honest about it.
        source: { handle: llm.inferred ? 'Guessed from ingredients' : 'Pasted text', platform: 'Manual' },
        confidence: llm.inferred ? 0.55 : 0.9,
        strategy: llm.inferred ? 'llm-inferred' : 'llm',
      };
    } catch (e) {
      if (!(e instanceof LlmError)) throw e;
    }
  }

  const heuristic = parseCaption(text);
  if (heuristic) {
    return {
      title: heuristic.title,
      ingredients: heuristic.ingredients,
      instructions: heuristic.instructions,
      confidence: heuristic.confidence,
      strategy: 'heuristic',
      source: { handle: 'Pasted text', platform: 'Manual' },
    };
  }

  throw new ExtractionError('Could not find a recipe in that text');
}

/**
 * Import from just a dish name the user typed — "chicken alfredo". Nothing to
 * extract here, no caption or page to fall back to: the model writes the
 * whole recipe, so this is entirely dependent on it being configured.
 */
export async function extractFromIdea(dishName: string): Promise<ExtractedRecipe> {
  const trimmed = dishName.trim();
  if (!trimmed) {
    throw new ExtractionError('Type a dish first');
  }
  if (!isLlmConfigured()) {
    throw unavailable('idea import: no LLM configured (set LLM_API_KEY or KIE_API_KEY)');
  }

  const llm = await extractIdea(trimmed).catch((e) => {
    throw userFacing(e, 'Could not find a recipe for that. Try a more specific dish name.');
  });

  return {
    ...llm,
    source: { handle: 'Generated recipe', platform: 'Manual' },
    // Written from general knowledge of the dish, not read from anywhere —
    // meaningfully less certain than transcribing or extracting real text.
    confidence: 0.5,
    strategy: 'llm-idea',
  };
}

/**
 * Import from a photo — either a written recipe (cookbook page, handwritten
 * card, screenshot) to transcribe, or a photo of a prepared meal with no
 * recipe text, in which case the model identifies the dish and writes a
 * typical recipe for it. There is no text to fall back to here, so unlike the
 * URL/text paths this is entirely dependent on a vision-capable model — there
 * is no heuristic fallback for reading pixels.
 */
export async function extractFromImage(imageDataUrl: string): Promise<ExtractedRecipe> {
  if (!isVisionConfigured()) {
    throw unavailable(
      isLlmConfigured()
        ? 'photo import: needs LLM_PROTOCOL=responses'
        : 'photo import: no LLM configured (set LLM_API_KEY or KIE_API_KEY)'
    );
  }

  const llm = await extractWithImage(imageDataUrl).catch((e) => {
    throw userFacing(e, 'Could not read a recipe from that photo.');
  });

  return {
    ...llm,
    // The photo itself becomes the recipe's picture — it's a real photo of
    // the actual dish or page, better than any generated stand-in.
    imageUrl: imageDataUrl,
    source: { handle: llm.inferred ? 'Recognized from photo' : 'Scanned photo', platform: 'Photo' },
    // A recipe written from recognizing a dish is a best guess, not a read —
    // meaningfully less trustworthy than transcribing text someone else wrote.
    confidence: llm.inferred ? 0.55 : 0.85,
    strategy: llm.inferred ? 'vision-inferred' : 'vision',
  };
}
