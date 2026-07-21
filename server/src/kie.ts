/**
 * kie.ai client. Runs server-side only — the API key must never reach the app.
 *
 * Endpoints per https://docs.kie.ai/4o-image-api/quickstart:
 *   POST /api/v1/gpt4o-image/generate     -> { data: { taskId } }
 *   GET  /api/v1/gpt4o-image/record-info  -> successFlag 0 pending | 1 done | 2 failed
 */

const BASE = 'https://api.kie.ai';

export class KieError extends Error {}

function apiKey(): string {
  const key = process.env.KIE_API_KEY?.trim();
  if (!key) {
    throw new KieError('KIE_API_KEY is not set — add it to server/.env');
  }
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

  if (!response.ok || (body && body.code && body.code !== 200)) {
    throw new KieError(body?.msg ?? `kie.ai returned ${response.status}`);
  }
  return body as T;
}

/** Builds the prompt server-side so it can be tuned without an app release. */
export function imagePromptFor(input: {
  title: string;
  cuisine?: string;
  ingredients?: string[];
}): string {
  const parts = [
    `Overhead food photograph of ${input.title}`,
    input.cuisine ? `${input.cuisine} cuisine` : null,
    input.ingredients?.length ? `featuring ${input.ingredients.slice(0, 5).join(', ')}` : null,
    'natural window light, shallow depth of field, styled on a ceramic plate,',
    'warm neutral background, appetising, photorealistic, no text, no hands',
  ];
  return parts.filter(Boolean).join(', ');
}

export async function startImageGeneration(prompt: string, callBackUrl?: string) {
  const body = await kieFetch<{ data: { taskId: string } }>('/api/v1/gpt4o-image/generate', {
    method: 'POST',
    body: JSON.stringify({
      prompt,
      size: '1:1',
      nVariants: 1,
      ...(callBackUrl ? { callBackUrl } : {}),
    }),
  });

  if (!body?.data?.taskId) throw new KieError('kie.ai did not return a taskId');
  return body.data.taskId;
}

export type KieTaskStatus =
  | { status: 'pending'; progress?: number }
  | { status: 'ready'; urls: string[] }
  | { status: 'failed'; error: string };

export async function getImageStatus(taskId: string): Promise<KieTaskStatus> {
  const body = await kieFetch<{
    data?: {
      successFlag?: number;
      progress?: string | number;
      errorMessage?: string;
      response?: { result_urls?: string[] };
    };
  }>(`/api/v1/gpt4o-image/record-info?taskId=${encodeURIComponent(taskId)}`);

  const data = body?.data;
  const flag = data?.successFlag;

  if (flag === 1) {
    const urls = data?.response?.result_urls ?? [];
    if (!urls.length) return { status: 'failed', error: 'Completed with no images' };
    return { status: 'ready', urls };
  }
  if (flag === 2) return { status: 'failed', error: data?.errorMessage ?? 'Generation failed' };
  return { status: 'pending', progress: Number(data?.progress ?? 0) };
}
