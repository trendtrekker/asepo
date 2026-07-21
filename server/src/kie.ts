/**
 * kie.ai client. Runs server-side only — the API key must never reach the app.
 *
 * Uses the unified jobs API, verified against a live key:
 *   POST /api/v1/jobs/createTask            -> { data: { taskId } }
 *   GET  /api/v1/jobs/recordInfo?taskId=..  -> { data: { state, resultJson, failMsg } }
 *
 * Note the older /api/v1/gpt4o-image/* endpoints exist in kie.ai's docs but
 * returned "not authorized to use this model" for our key — the jobs API with
 * an explicit model name is the one that works.
 */

const BASE = 'https://api.kie.ai';

/** Verified as available. Others (nano-banana, qwen) returned 401 for our key. */
export const IMAGE_MODEL = 'gpt-image-2-text-to-image';

export class KieError extends Error {}

function apiKey(): string {
  const key = process.env.KIE_API_KEY?.trim();
  if (!key) throw new KieError('KIE_API_KEY is not set — add it to server/.env');
  return key;
}

async function kieFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });

  const body = (await response.json().catch(() => null)) as any;

  if (!response.ok || (body?.code && body.code !== 200)) {
    throw new KieError(body?.msg ?? `kie.ai returned ${response.status}`);
  }
  return body as T;
}

/** Remaining credits on the account. */
export async function getCredits(): Promise<number | null> {
  try {
    const body = await kieFetch<{ data: number }>('/api/v1/chat/credit');
    return typeof body.data === 'number' ? body.data : null;
  } catch {
    return null;
  }
}

/** Built server-side so the prompt can be tuned without an app release. */
export function imagePromptFor(input: {
  title: string;
  cuisine?: string;
  ingredients?: string[];
}): string {
  return [
    `Overhead food photograph of ${input.title}`,
    input.cuisine ? `${input.cuisine} cuisine` : null,
    input.ingredients?.length ? `featuring ${input.ingredients.slice(0, 5).join(', ')}` : null,
    'natural window light, shallow depth of field, styled on a ceramic plate,',
    'warm neutral background, appetising, photorealistic, no text, no hands',
  ]
    .filter(Boolean)
    .join(', ');
}

export async function startImageGeneration(prompt: string, callBackUrl?: string): Promise<string> {
  const body = await kieFetch<{ data: { taskId: string } }>('/api/v1/jobs/createTask', {
    method: 'POST',
    body: JSON.stringify({
      model: IMAGE_MODEL,
      input: { prompt, aspect_ratio: '1:1' },
      ...(callBackUrl ? { callBackUrl } : {}),
    }),
  });

  if (!body?.data?.taskId) throw new KieError('kie.ai did not return a taskId');
  return body.data.taskId;
}

export type KieTaskStatus =
  | { status: 'pending'; state: string }
  | { status: 'ready'; urls: string[] }
  | { status: 'failed'; error: string };

/** States that mean "still working". Anything else is terminal. */
const PENDING_STATES = new Set(['waiting', 'queuing', 'queueing', 'generating', 'processing']);

export async function getImageStatus(taskId: string): Promise<KieTaskStatus> {
  const body = await kieFetch<{
    data?: { state?: string; resultJson?: string; failMsg?: string | null };
  }>(`/api/v1/jobs/recordInfo?taskId=${encodeURIComponent(taskId)}`);

  const data = body?.data;
  const state = data?.state ?? 'unknown';

  if (PENDING_STATES.has(state)) return { status: 'pending', state };

  if (state === 'success') {
    // resultJson is a JSON *string*, not an object.
    try {
      const parsed = JSON.parse(data?.resultJson ?? '{}') as { resultUrls?: string[] };
      const urls = parsed.resultUrls ?? [];
      if (!urls.length) return { status: 'failed', error: 'Completed with no images' };
      return { status: 'ready', urls };
    } catch {
      return { status: 'failed', error: 'Could not read the result payload' };
    }
  }

  return { status: 'failed', error: data?.failMsg || `Generation ${state}` };
}
