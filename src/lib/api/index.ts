import { fixtureApi } from '@/lib/api/fixtures';
import { createHttpApi } from '@/lib/api/http';
import type { RecipeApi } from '@/lib/api/types';
import { supabase } from '@/lib/supabase';

export * from '@/lib/api/types';
export { ApiError } from '@/lib/api/http';

/**
 * Backend base URL. Set EXPO_PUBLIC_API_URL in .env to point the app at your
 * server; leave it unset and the app runs entirely on sample data.
 *
 * This must be your own backend, never https://api.kie.ai — see http.ts.
 */
const baseUrl = process.env.EXPO_PUBLIC_API_URL?.trim();

/**
 * The one place the API layer learns who is signed in.
 *
 * getSession() rather than a token captured at render: it returns the live
 * session and refreshes an expired one, so a long cook session cannot end up
 * sending a token that went stale while the screen was open.
 */
const currentAccessToken = async (): Promise<string | null> => {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
};

export const api: RecipeApi = baseUrl ? createHttpApi(baseUrl, currentAccessToken) : fixtureApi;

/** True when running on sample data, so the UI can say so honestly. */
export const isOffline = !baseUrl;
