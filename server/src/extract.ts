import { parseIngredient, parseIsoDuration, parseYield, type Ingredient } from './ingredients.js';

/**
 * Recipe extraction from a URL.
 *
 * Most recipe sites publish schema.org/Recipe as JSON-LD, which is exact and
 * free — no AI needed. Social video (TikTok, Instagram) does not, and needs an
 * LLM over the caption and transcript; that path is not wired up yet.
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
};

export class ExtractionError extends Error {}

/**
 * Refuses URLs pointing at our own network. Without this the server would
 * happily fetch http://169.254.169.254/ (cloud metadata) or internal hosts on
 * behalf of anyone who can call /import.
 */
function assertPublicUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new ExtractionError('That does not look like a valid link');
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new ExtractionError('Only http and https links are supported');
  }

  const host = url.hostname.toLowerCase();
  const blocked =
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host === '::1' ||
    /^127\./.test(host) ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^169\.254\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host);

  if (blocked) throw new ExtractionError('That host is not reachable');
  return url;
}

/** Pulls every JSON-LD block out of the HTML. */
function jsonLdBlocks(html: string): unknown[] {
  const blocks: unknown[] = [];
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;

  while ((m = re.exec(html))) {
    try {
      blocks.push(JSON.parse(m[1].trim()));
    } catch {
      // Sites ship malformed JSON-LD surprisingly often — skip rather than fail.
    }
  }
  return blocks;
}

const typeOf = (node: any): string[] => {
  const t = node?.['@type'];
  return Array.isArray(t) ? t.map(String) : t ? [String(t)] : [];
};

/** Walks graphs and arrays looking for the Recipe node. */
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
  const raw = node?.recipeInstructions;
  if (!raw) return [];

  const flatten = (item: any): string[] => {
    if (typeof item === 'string') return [item];
    if (Array.isArray(item)) return item.flatMap(flatten);
    if (item?.['@type'] === 'HowToSection' && item.itemListElement) return flatten(item.itemListElement);
    if (typeof item?.text === 'string') return [item.text];
    if (typeof item?.name === 'string') return [item.name];
    return [];
  };

  return flatten(raw)
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

export async function extractFromUrl(rawUrl: string): Promise<ExtractedRecipe> {
  const url = assertPublicUrl(rawUrl);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);

  let html: string;
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        // Some sites serve a stub to unknown agents.
        'user-agent': 'Mozilla/5.0 (compatible; AsepoBot/1.0; +https://asepo.app)',
        accept: 'text/html,application/xhtml+xml',
      },
    });
    if (!response.ok) throw new ExtractionError(`The site returned ${response.status}`);
    html = await response.text();
  } catch (e) {
    if (e instanceof ExtractionError) throw e;
    throw new ExtractionError('Could not load that page');
  } finally {
    clearTimeout(timeout);
  }

  const node = jsonLdBlocks(html).map(findRecipeNode).find(Boolean);

  if (!node) {
    throw new ExtractionError(
      'No structured recipe found on that page. Social video needs the LLM extractor, which is not wired up yet.'
    );
  }

  const ingredients = (node.recipeIngredient ?? node.ingredients ?? [])
    .filter((l: unknown): l is string => typeof l === 'string')
    .map(parseIngredient);

  const instructions = instructionsFrom(node);

  return {
    title: typeof node.name === 'string' ? node.name.trim() : 'Imported recipe',
    ingredients,
    instructions,
    minutes: parseIsoDuration(node.totalTime) ?? parseIsoDuration(node.cookTime),
    servings: parseYield(node.recipeYield),
    calories: caloriesFrom(node),
    imageUrl: imageFrom(node),
    source: { handle: url.hostname.replace(/^www\./, ''), platform: 'Web' },
    // JSON-LD is authored by the site, so it's exact rather than inferred.
    confidence: 1,
  };
}
