import type { Ingredient } from './ingredients.js';

/**
 * LLM-backed recipe extraction.
 *
 * Provider-agnostic on purpose: kie.ai's chat API speaks the OpenAI message
 * format, and so do OpenAI, OpenRouter, Groq and most others. Point
 * LLM_BASE_URL / LLM_MODEL / LLM_API_KEY wherever you like.
 *
 * Defaults to kie.ai with deepseek-chat, which is the only chat model our key
 * was accepted for — note it was returning "server is currently being
 * maintained" at the time of writing, so failures here are expected until it's
 * back, and callers fall through to the heuristic parser.
 */

export type LlmRecipe = {
  title: string;
  ingredients: Ingredient[];
  instructions: string[];
  minutes?: number;
  servings?: number;
};

export class LlmError extends Error {}

const config = () => ({
  baseUrl: (process.env.LLM_BASE_URL ?? 'https://api.kie.ai/api/v1').replace(/\/$/, ''),
  model: process.env.LLM_MODEL ?? 'deepseek-chat',
  apiKey: (process.env.LLM_API_KEY ?? process.env.KIE_API_KEY ?? '').trim(),
});

export function isLlmConfigured(): boolean {
  return Boolean(config().apiKey);
}

const SYSTEM_PROMPT = `You extract recipes from social media captions and web pages.

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
- "isRecipe" is false if the text is not a cooking recipe. Then other fields may be empty.
- Split each ingredient into quantity, unit and name. Use "" when a part is absent.
  "2 cups flour" -> {"qty":"2","unit":"cups","name":"flour"}
  "a handful of basil" -> {"qty":"","unit":"","name":"a handful of basil"}
- Keep the author's wording for ingredient names and steps. Do not invent
  quantities, steps, times or servings that are not stated. Use null when unknown.
- Split run-on instructions into separate steps. Strip emoji and hashtags.`;

type ChatResponse = {
  choices?: { message?: { content?: string } }[];
  data?: { choices?: { message?: { content?: string } }[] };
  msg?: string;
  code?: number;
};

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

export async function extractWithLlm(sourceText: string, hintTitle?: string): Promise<LlmRecipe> {
  const { baseUrl, model, apiKey } = config();
  if (!apiKey) throw new LlmError('No LLM API key configured');

  const userContent = [
    hintTitle ? `Title hint: ${hintTitle}` : null,
    'Text:',
    sourceText.slice(0, 12_000),
  ]
    .filter(Boolean)
    .join('\n');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60_000);

  let body: ChatResponse | null;
  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      signal: controller.signal,
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userContent },
        ],
        temperature: 0,
      }),
    });
    body = (await response.json().catch(() => null)) as ChatResponse | null;
  } catch {
    throw new LlmError('Could not reach the language model');
  } finally {
    clearTimeout(timer);
  }

  const content = body?.choices?.[0]?.message?.content ?? body?.data?.choices?.[0]?.message?.content;

  if (!content) {
    // kie.ai returns HTTP 200 with an error in the body, so check `msg`.
    throw new LlmError(body?.msg ?? 'The language model returned nothing');
  }

  const parsed = parseJsonReply(content);
  if (parsed?.isRecipe === false) throw new LlmError('That page does not look like a recipe');

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
    throw new LlmError('The model found no recipe in that text');
  }

  return {
    title: String(parsed.title ?? hintTitle ?? 'Imported recipe').trim(),
    ingredients,
    instructions,
    minutes: Number.isFinite(parsed.minutes) ? Number(parsed.minutes) : undefined,
    servings: Number.isFinite(parsed.servings) ? Number(parsed.servings) : undefined,
  };
}
