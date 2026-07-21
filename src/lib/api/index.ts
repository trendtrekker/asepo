import { fixtureApi } from '@/lib/api/fixtures';
import { createHttpApi } from '@/lib/api/http';
import type { RecipeApi } from '@/lib/api/types';

export * from '@/lib/api/types';
export { ApiError } from '@/lib/api/http';

/**
 * Backend base URL. Set EXPO_PUBLIC_API_URL in .env to point the app at your
 * server; leave it unset and the app runs entirely on sample data.
 *
 * This must be your own backend, never https://api.kie.ai — see http.ts.
 */
const baseUrl = process.env.EXPO_PUBLIC_API_URL?.trim();

export const api: RecipeApi = baseUrl ? createHttpApi(baseUrl) : fixtureApi;

/** True when running on sample data, so the UI can say so honestly. */
export const isOffline = !baseUrl;
