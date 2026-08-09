import type { Ingredient } from './ingredients.js';

/**
 * LLM-backed recipe extraction.
 *
 * kie.ai exposes chat models through three different protocols, all verified
 * against a live key:
 *
 *   responses  POST /codex/v1/responses    { model, input: [{role, content:[{type:'input_text',text}]}] }
 *              works for gpt-5-5, gpt-5-4, grok-4-5. Also the only protocol
 *              verified to accept image input (input_image with a data: URL).
 *   messages   POST /claude/v1/messages    { model, messages: [...] }   (Anthropic shape)
 *              works for claude-fable-5
 *   chat       POST /v1/chat/completions   { model, messages: [...] }   (OpenAI shape)
 *              for pointing at OpenAI/OpenRouter directly
 *
 * Note the model ids use hyphens throughout: "gpt-5-5", not "gpt-5.5".
 */

export type LlmRecipe = {
  title: string;
  ingredients: Ingredient[];
  instructions: string[];
  minutes?: number;
  servings?: number;
  /** True when a vision call recognized a dish and wrote a typical recipe for
   * it, rather than transcribing text that was actually printed on the photo. */
  inferred?: boolean;
};

export type HealthierRecipe = {
  ingredients: Ingredient[];
  instructions: string[];
  /** Plain-language description of what changed, shown before the user applies it. */
  summary: string;
};

/** Per-serving estimate. */
export type NutritionEstimate = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

export type MealSuggestion = {
  title: string;
  /** One short sentence on why it fits what was asked. */
  description: string;
};

export class LlmError extends Error {
  /**
   * True only for messages written to be read by whoever is holding the
   * phone. Everything else here is diagnostic — missing API keys, protocol
   * mismatches, malformed replies, and text passed straight through from
   * kie.ai — and callers must not surface those. Defaults to false so a new
   * throw is private until someone deliberately decides otherwise.
   */
  constructor(
    message: string,
    readonly userSafe = false
  ) {
    super(message);
    this.name = 'LlmError';
  }
}

type Protocol = 'responses' | 'messages' | 'chat';

const config = () => ({
  baseUrl: (process.env.LLM_BASE_URL ?? 'https://api.kie.ai/codex/v1').replace(/\/$/, ''),
  model: process.env.LLM_MODEL ?? 'gpt-5-5',
  protocol: (process.env.LLM_PROTOCOL ?? 'responses') as Protocol,
  apiKey: (process.env.LLM_API_KEY ?? process.env.KIE_API_KEY ?? '').trim(),
});

export function isLlmConfigured(): boolean {
  return Boolean(config().apiKey);
}

/** Photo import only works through the verified `responses` + input_image path. */
export function isVisionConfigured(): boolean {
  const c = config();
  return Boolean(c.apiKey) && c.protocol === 'responses';
}

const SYSTEM_PROMPT = `You extract recipes from social media captions and web pages.

Return ONLY a JSON object, no prose and no markdown fence, shaped exactly:
{
  "isRecipe": boolean,
  "inferred": boolean,
  "title": string,
  "servings": number | null,
  "minutes": number | null,
  "ingredients": [{"qty": string, "unit": string, "name": string}],
  "instructions": [string]
}

Rules:
- "isRecipe" is false if the text is not a cooking recipe. Then other fields may be empty.
- Split each ingredient into quantity, unit and name. Use "" when a part is absent.
  "2 cups flour" -> {"qty":"2","unit":"cups","name":"flour"}
  "a handful of basil" -> {"qty":"","unit":"","name":"a handful of basil"}
- Every distinct ingredient gets its own entry. Never merge two ingredients into
  one line, even when the caption runs them together without punctuation.
- Keep the author's wording for ingredient names and steps. Do not invent
  quantities or times that are not stated. Use null when unknown.
- The title is the dish name only, not the caption's first sentence.
- Split run-on instructions into separate steps. Strip emoji and hashtags.
- If the text names a dish and lists ingredients but has no method at all, write
  a typical, standard method for that dish rather than leaving "instructions"
  empty — the user needs actual steps to cook from, not just a shopping list.
  Set "inferred" to true in that case. Otherwise set it to false.`;

const IDEA_SYSTEM_PROMPT = `The user names a dish they want to cook — just a name or a short
phrase ("chicken alfredo", "the pad thai from that place downtown"), nothing
else. Write a complete, standard recipe for it: typical ingredients with
realistic quantities, and clear numbered steps. This is not extraction — there
is no source text to read from, so write the recipe yourself from what you
know about the dish.

Return ONLY a JSON object, no prose and no markdown fence, shaped exactly:
{
  "isRecipe": boolean,
  "title": string,
  "servings": number | null,
  "minutes": number | null,
  "ingredients": [{"qty": string, "unit": string, "name": string}],
  "instructions": [string]
}

Rules:
- "isRecipe" is false only if the text doesn't name any real, identifiable
  dish or food (e.g. it's gibberish or unrelated to cooking). A dish you don't
  recognize by that exact name but can reasonably infer (a regional variant,
  a plausible home-cooked version) still counts — do your best rather than
  refusing.
- Split each ingredient into quantity, unit and name. Use "" when a part is
  genuinely optional or to taste, e.g. {"qty":"","unit":"","name":"salt, to taste"}.
- The title is the dish name, cleaned up (proper capitalization, no filler
  words the user typed around it).
- Give a realistic total time and serving count for the dish rather than
  leaving them null — the user is relying on you for the whole recipe.`;

const VISION_SYSTEM_PROMPT = `You get a recipe from a photograph. Two kinds of photo come in:

1. Written recipe — a cookbook page, a handwritten card, a screenshot of a recipe.
   Transcribe it exactly as printed.
2. A prepared dish or meal, with no recipe text visible — a photo someone took
   of food they made or are eating. Identify the dish and write a standard,
   typical recipe for it (usual ingredients and method for that dish).

Return ONLY a JSON object, no prose and no markdown fence, shaped exactly:
{
  "isRecipe": boolean,
  "inferred": boolean,
  "title": string,
  "servings": number | null,
  "minutes": number | null,
  "ingredients": [{"qty": string, "unit": string, "name": string}],
  "instructions": [string]
}

Rules:
- "isRecipe" is false only if the photo shows neither written recipe text nor a
  recognizable dish (e.g. an unrelated photo). Then other fields may be empty.
- "inferred" is true when you wrote the recipe from recognizing a dish (case 2),
  false when you transcribed printed/handwritten text (case 1).
- Split each ingredient into quantity, unit and name. Use "" when a part is absent.
- Case 1: transcribe the text as printed. Do not invent quantities, steps, times
  or servings that are not visible. Use null when unknown. If part of the photo
  is blurred or cut off, transcribe what is legible and skip the rest.
- Case 2: give quantities and steps typical for the dish rather than leaving
  them blank — the user is relying on you for a usable recipe, not just a title.`;

const HEALTHIER_SYSTEM_PROMPT = `You rewrite a recipe to be healthier, without turning it into a
different dish. The user still wants to recognize what they're cooking.

Prefer, where they make sense for this specific recipe:
- Less added sugar, saturated fat, and sodium.
- Lighter swaps for heavy ingredients (e.g. Greek yogurt for sour cream,
  olive oil for butter, whole-grain for refined) — only when the swap
  actually works for the dish, not automatically.
- A lighter cooking method when it fits (bake/grill/air-fry instead of
  deep-frying), and trimmed portions of the heaviest ingredients.

Return ONLY a JSON object, no prose and no markdown fence, shaped exactly:
{
  "ingredients": [{"qty": string, "unit": string, "name": string}],
  "instructions": [string],
  "summary": string
}

Rules:
- Keep the same overall dish and roughly the same number of servings' worth
  of food — this is a healthier version of their recipe, not a new recipe.
- Adjust instructions wherever an ingredient or method changed, so the steps
  still match what's actually in the ingredient list.
- "summary" is 1-2 short sentences, plain language, listing the concrete
  changes made (e.g. "Swapped butter for olive oil, cut the sugar by half,
  and baked instead of frying."). No hedging, no generic health advice.`;

const NUTRITION_SYSTEM_PROMPT = `You estimate nutrition facts for a recipe from its ingredient list.
Work out realistic totals from the actual ingredients and quantities given —
don't guess a generic split for the type of dish, reason about what's really
in it (e.g. a cup of heavy cream contributes real fat and calories; a cup of
spinach barely contributes anything).

Return ONLY a JSON object, no prose and no markdown fence, shaped exactly:
{
  "calories": number,
  "protein": number,
  "carbs": number,
  "fat": number
}

Rules:
- All four numbers are PER SERVING, using the servings count given. Divide
  your total-recipe estimate by the serving count yourself.
- protein/carbs/fat are grams. calories should be reasonably close to
  4*protein + 4*carbs + 9*fat, since that's how they're derived from grams.
- Round to whole numbers. Give your best realistic estimate rather than a
  round/generic-looking number — real recipes rarely land on exact multiples
  of 50.`;

const SUGGEST_SYSTEM_PROMPT = `The user describes what kind of meal they want, often loosely — a meal
type and time ("what can I have for breakfast today?"), a mood, an ingredient
they have on hand, a cuisine, or a dietary constraint. Suggest specific,
concrete dishes that fit — not categories or vague ideas.

Return ONLY a JSON object, no prose and no markdown fence, shaped exactly:
{
  "suggestions": [{"title": string, "description": string}]
}

Rules:
- Return exactly 5 suggestions, each a real, specific, nameable dish (e.g.
  "Greek Yogurt Parfait with Berries and Granola", not "a healthy breakfast").
- "description" is one short sentence (under 20 words) saying why it fits what
  was asked, written plainly and concretely — not generic praise.
- Vary the suggestions from each other — different main ingredients or
  styles, not five variations on the same dish.
- If the request names a time of day, a dietary need, or an ingredient, every
  suggestion must actually fit it.`;

/** Pulls the assistant's text out of whichever response shape came back. */
function textFrom(body: any): string | undefined {
  // Responses API
  if (typeof body?.output_text === 'string' && body.output_text.trim()) return body.output_text;
  if (Array.isArray(body?.output)) {
    const joined = body.output
      .flatMap((o: any) => o?.content ?? [])
      .map((c: any) => c?.text)
      .filter(Boolean)
      .join('');
    if (joined.trim()) return joined;
  }
  // Anthropic messages
  if (Array.isArray(body?.content)) {
    const joined = body.content.map((c: any) => c?.text).filter(Boolean).join('');
    if (joined.trim()) return joined;
  }
  // OpenAI chat completions
  const chat = body?.choices?.[0]?.message?.content ?? body?.data?.choices?.[0]?.message?.content;
  if (typeof chat === 'string' && chat.trim()) return chat;

  return undefined;
}

function buildRequest(protocol: Protocol, model: string, system: string, user: string) {
  switch (protocol) {
    case 'responses':
      return {
        path: '/responses',
        body: {
          model,
          stream: false,
          input: [
            { role: 'system', content: [{ type: 'input_text', text: system }] },
            { role: 'user', content: [{ type: 'input_text', text: user }] },
          ],
        },
      };
    case 'messages':
      return {
        path: '/messages',
        body: { model, max_tokens: 4096, system, messages: [{ role: 'user', content: user }] },
      };
    case 'chat':
      return {
        path: '/chat/completions',
        body: {
          model,
          temperature: 0,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user },
          ],
        },
      };
  }
}

/** Pulls the JSON object out of a reply that may be fenced or padded with prose. */
function parseJsonReply(raw: string): any {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = (fenced ? fenced[1] : raw).trim();
  try {
    return JSON.parse(candidate);
  } catch {
    const start = candidate.indexOf('{');
    const end = candidate.lastIndexOf('}');
    if (start === -1 || end <= start) throw new LlmError('Model did not return JSON');
    return JSON.parse(candidate.slice(start, end + 1));
  }
}

async function callModel(baseUrl: string, apiKey: string, path: string, body: unknown): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 90_000);

  try {
    const response = await fetch(`${baseUrl}${path}`, {
      method: 'POST',
      signal: controller.signal,
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return await response.json().catch(() => null);
  } catch {
    throw new LlmError('Could not reach the language model');
  } finally {
    clearTimeout(timer);
  }
}

/** Turns the model's parsed JSON into our shape, or throws with a reason. */
function toLlmRecipe(content: string | undefined, payload: any, hintTitle?: string): LlmRecipe {
  if (!content) {
    // kie.ai returns HTTP 200 with the error in the body.
    throw new LlmError(payload?.error?.message ?? payload?.msg ?? 'The language model returned nothing');
  }

  const parsed = parseJsonReply(content);
  if (parsed?.isRecipe === false) throw new LlmError('That does not look like a recipe', true);

  const ingredients: Ingredient[] = Array.isArray(parsed.ingredients)
    ? parsed.ingredients
        .map((i: any) => ({
          qty: String(i?.qty ?? '').trim(),
          unit: String(i?.unit ?? '').trim(),
          name: String(i?.name ?? '').trim(),
        }))
        .filter((i: Ingredient) => i.name)
    : [];

  const instructions: string[] = Array.isArray(parsed.instructions)
    ? parsed.instructions.map((s: any) => String(s).trim()).filter(Boolean)
    : [];

  if (!ingredients.length && !instructions.length) {
    throw new LlmError('The model found no recipe there', true);
  }
  // A recipe without steps isn't usable — treat it as a failed extraction so
  // callers with a fallback (the heuristic parser) get a chance to do better,
  // rather than silently handing back ingredients with nothing to do with them.
  if (!instructions.length) {
    throw new LlmError('Found ingredients but no steps to follow', true);
  }
  // The mirror image, and just as unusable: steps with nothing to cook. Left
  // unguarded this reached the review screen as a recipe with a completely
  // empty ingredient list, where the only hint anything went wrong was the
  // low-confidence "we had to guess at some of this" banner.
  if (!ingredients.length) {
    throw new LlmError('Found steps but no ingredients', true);
  }

  return {
    title: String(parsed.title ?? hintTitle ?? 'Imported recipe').trim(),
    ingredients,
    instructions,
    minutes: Number.isFinite(parsed.minutes) ? Number(parsed.minutes) : undefined,
    servings: Number.isFinite(parsed.servings) ? Number(parsed.servings) : undefined,
    inferred: parsed.inferred === true,
  };
}

export async function extractWithLlm(sourceText: string, hintTitle?: string): Promise<LlmRecipe> {
  const { baseUrl, model, protocol, apiKey } = config();
  if (!apiKey) throw new LlmError('No LLM API key configured');

  const user = [hintTitle ? `Title hint: ${hintTitle}` : null, 'Text:', sourceText.slice(0, 12_000)]
    .filter(Boolean)
    .join('\n');

  const { path, body } = buildRequest(protocol, model, SYSTEM_PROMPT, user);
  const payload = await callModel(baseUrl, apiKey, path, body);
  return toLlmRecipe(textFrom(payload), payload, hintTitle);
}

/**
 * Writes a whole recipe from nothing but a dish name — "chicken alfredo".
 * There's no source text to extract from, so this is pure generation.
 */
export async function extractIdea(dishName: string): Promise<LlmRecipe> {
  const { baseUrl, model, protocol, apiKey } = config();
  if (!apiKey) throw new LlmError('No LLM API key configured');

  const { path, body } = buildRequest(protocol, model, IDEA_SYSTEM_PROMPT, `Dish: ${dishName.slice(0, 200)}`);
  const payload = await callModel(baseUrl, apiKey, path, body);
  return toLlmRecipe(textFrom(payload), payload, dishName);
}

/**
 * Suggests a handful of specific dishes for a loose request ("what can I
 * have for breakfast today?"). Picking one hands its title to extractIdea to
 * write the full recipe — this step only names dishes, it doesn't write them.
 */
export async function suggestMeals(prompt: string): Promise<MealSuggestion[]> {
  const { baseUrl, model, protocol, apiKey } = config();
  if (!apiKey) throw new LlmError('No LLM API key configured');

  const { path, body } = buildRequest(protocol, model, SUGGEST_SYSTEM_PROMPT, prompt.slice(0, 500));
  const payload = await callModel(baseUrl, apiKey, path, body);
  const content = textFrom(payload);
  if (!content) {
    throw new LlmError(payload?.error?.message ?? payload?.msg ?? 'The language model returned nothing');
  }

  const parsed = parseJsonReply(content);
  const suggestions: MealSuggestion[] = Array.isArray(parsed.suggestions)
    ? parsed.suggestions
        .map((s: any) => ({
          title: String(s?.title ?? '').trim(),
          description: String(s?.description ?? '').trim(),
        }))
        .filter((s: MealSuggestion) => s.title)
    : [];

  if (!suggestions.length) {
    throw new LlmError('Could not come up with suggestions for that', true);
  }

  return suggestions;
}

/** Rewrites a recipe's ingredients and steps to be healthier. Pro-only feature. */
export async function healthifyRecipe(recipe: {
  title: string;
  ingredients: Ingredient[];
  instructions: string[];
  servings?: number;
}): Promise<HealthierRecipe> {
  const { baseUrl, model, protocol, apiKey } = config();
  if (!apiKey) throw new LlmError('No LLM API key configured');

  const user = [
    `Title: ${recipe.title}`,
    recipe.servings ? `Servings: ${recipe.servings}` : null,
    'Ingredients:',
    ...recipe.ingredients.map((i) => `- ${[i.qty, i.unit, i.name].filter(Boolean).join(' ')}`),
    'Instructions:',
    ...recipe.instructions.map((s, i) => `${i + 1}. ${s}`),
  ]
    .filter(Boolean)
    .join('\n');

  const { path, body } = buildRequest(protocol, model, HEALTHIER_SYSTEM_PROMPT, user);
  const payload = await callModel(baseUrl, apiKey, path, body);
  const content = textFrom(payload);
  if (!content) {
    throw new LlmError(payload?.error?.message ?? payload?.msg ?? 'The language model returned nothing');
  }

  const parsed = parseJsonReply(content);
  const ingredients: Ingredient[] = Array.isArray(parsed.ingredients)
    ? parsed.ingredients
        .map((i: any) => ({
          qty: String(i?.qty ?? '').trim(),
          unit: String(i?.unit ?? '').trim(),
          name: String(i?.name ?? '').trim(),
        }))
        .filter((i: Ingredient) => i.name)
    : [];
  const instructions: string[] = Array.isArray(parsed.instructions)
    ? parsed.instructions.map((s: any) => String(s).trim()).filter(Boolean)
    : [];

  if (!ingredients.length || !instructions.length) {
    throw new LlmError('Could not rework that recipe', true);
  }

  return {
    ingredients,
    instructions,
    summary: String(parsed.summary ?? '').trim() || 'Lightened up the ingredients and method.',
  };
}

/**
 * Estimates per-serving nutrition from a recipe's actual ingredient list —
 * not a canned macro ratio for the dish type, a real reasoning pass over
 * what's in it.
 */
export async function estimateNutrition(recipe: {
  title: string;
  ingredients: Ingredient[];
  servings: number;
}): Promise<NutritionEstimate> {
  const { baseUrl, model, protocol, apiKey } = config();
  if (!apiKey) throw new LlmError('No LLM API key configured');

  const user = [
    `Title: ${recipe.title}`,
    `Servings: ${recipe.servings}`,
    'Ingredients:',
    ...recipe.ingredients.map((i) => `- ${[i.qty, i.unit, i.name].filter(Boolean).join(' ')}`),
  ].join('\n');

  const { path, body } = buildRequest(protocol, model, NUTRITION_SYSTEM_PROMPT, user);
  const payload = await callModel(baseUrl, apiKey, path, body);
  const content = textFrom(payload);
  if (!content) {
    throw new LlmError(payload?.error?.message ?? payload?.msg ?? 'The language model returned nothing');
  }

  const parsed = parseJsonReply(content);
  const toNumber = (v: any) => (Number.isFinite(Number(v)) ? Math.max(0, Math.round(Number(v))) : NaN);
  const result: NutritionEstimate = {
    calories: toNumber(parsed.calories),
    protein: toNumber(parsed.protein),
    carbs: toNumber(parsed.carbs),
    fat: toNumber(parsed.fat),
  };

  if (Object.values(result).some((n) => Number.isNaN(n))) {
    throw new LlmError('Could not estimate nutrition for that recipe', true);
  }

  return result;
}

/**
 * Reads a recipe out of a photo. `imageDataUrl` is a full data: URL
 * (data:image/jpeg;base64,...) — verified working against gpt-5-5 via the
 * responses protocol; other protocols aren't wired for image input.
 */
export async function extractWithImage(imageDataUrl: string): Promise<LlmRecipe> {
  const { baseUrl, model, protocol, apiKey } = config();
  if (!apiKey) throw new LlmError('No LLM API key configured');
  if (protocol !== 'responses') {
    throw new LlmError('Photo import needs LLM_PROTOCOL=responses — check server/.env');
  }

  const payload = await callModel(baseUrl, apiKey, '/responses', {
    model,
    stream: false,
    input: [
      { role: 'system', content: [{ type: 'input_text', text: VISION_SYSTEM_PROMPT }] },
      {
        role: 'user',
        content: [
          { type: 'input_text', text: 'Read the recipe in this photo.' },
          { type: 'input_image', image_url: imageDataUrl },
        ],
      },
    ],
  });

  return toLlmRecipe(textFrom(payload), payload);
}
