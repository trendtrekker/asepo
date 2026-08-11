import type { Recipe } from '@/data/sample';
import type {
  ExtractedRecipe,
  HealthierRecipe,
  ImageTask,
  ImportProgress,
  ImportSource,
  MealSuggestion,
  NutritionEstimate,
  RecipeApi,
} from '@/lib/api/types';

/**
 * Talks to *our* backend, which holds the kie.ai key.
 *
 * The app must never call api.kie.ai directly: a React Native bundle can be
 * unzipped, and any key shipped inside it is public. The backend owns the key,
 * and is also responsible for copying generated images into our own storage —
 * kie.ai deletes generated images after 14 days, so their URLs cannot be
 * persisted as a recipe's photoUrl.
 */

export class ApiError extends Error {
  constructor(
    /**
     * Plain-language text, safe to render. Every screen that catches an error
     * shows `e.message` directly, so this must never carry a stack, a status
     * line, or a raw exception — "TypeError: Failed to fetch" tells a cook
     * nothing they can act on.
     */
    message: string,
    readonly status?: number,
    /** The technical cause. Logged in development, never shown. */
    readonly detail?: string
  ) {
    super(message);
    this.name = 'ApiError';
    if (__DEV__ && detail) console.warn(`[api] ${message} — ${detail}`);
  }
}

/**
 * Maps a failed response to something a user can act on. Takes the path
 * because a leftover 4xx means different things per endpoint — an unreadable
 * source on /import, but a permissions problem on the Pro-only routes, and
 * telling someone their nutrition estimate failed because "the link might be
 * private" is worse than saying nothing.
 */
function messageForStatus(status: number, path: string): string {
  // requirePro() on the server: 401 for a missing or expired session, 403 for
  // a real session without Pro.
  if (status === 401) return 'Sign in to use this.';
  if (status === 403) return 'This is an Asepo Pro feature.';
  if (status === 429) return 'Asepo is busy right now. Wait a moment and try again.';
  if (status === 408 || status === 504) return 'That took too long to load. Try again.';
  if (status >= 500) return 'Something went wrong on our end. Try again in a moment.';
  // Same wording as add/failed.tsx's default, which covers arriving there
  // without a message at all.
  if (path.startsWith('/import')) {
    return "The link might be private, deleted, or in a format we don't support yet";
  }
  return "Asepo couldn't finish that. Try again.";
}

async function request<T>(baseUrl: string, path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...init?.headers },
    });
  } catch (cause) {
    // fetch only rejects when the request never got a reply — no connection,
    // DNS failure, or the backend being down.
    throw new ApiError(
      "Asepo couldn't reach the internet. Check your connection and try again.",
      undefined,
      `${String(cause)} (${path})`
    );
  }

  if (!response.ok) {
    throw new ApiError(
      messageForStatus(response.status, path),
      response.status,
      `${response.status} ${response.statusText} (${path})`
    );
  }

  try {
    return (await response.json()) as T;
  } catch (cause) {
    // A 200 that isn't JSON — a captive portal or a proxy error page. Left
    // unwrapped this surfaces as a raw SyntaxError.
    throw new ApiError(
      'Something went wrong on our end. Try again in a moment.',
      response.status,
      `${String(cause)} (${path})`
    );
  }
}

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 120_000;

/**
 * Supplies the current session's access token, or null when signed out.
 *
 * Injected rather than imported so this module stays free of any dependency
 * on auth or storage, and so tests can drive it without a Supabase client.
 * See index.ts for the real wiring.
 */
export type AccessTokenProvider = () => Promise<string | null>;

export function createHttpApi(baseUrl: string, getAccessToken: AccessTokenProvider): RecipeApi {
  const base = baseUrl.replace(/\/$/, '');

  /**
   * A call the backend requires a session for, which is everything that costs
   * money to serve. One helper rather than a token threaded through each
   * screen: the failure mode of forgetting one is a 401 at runtime, in a
   * flow that only breaks once someone actually tries to import something.
   *
   * A missing token is still sent — as no header at all — rather than
   * short-circuited here, so the server stays the single authority on what a
   * valid session is, and the app shows its own "Sign in to use this."
   */
  const authed = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
    const token = await getAccessToken();
    return request<T>(base, path, {
      ...init,
      headers: { ...init.headers, ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    });
  };

  return {
    async listRecipes() {
      // Unauthenticated on the server, and returns an empty library — a fresh
      // install seeds from it before anyone has signed in.
      return request<Recipe[]>(base, '/recipes');
    },

    /**
     * Starts an extraction job and polls it. The backend is expected to expose
     * the current pipeline step so the UI can mirror real progress rather than
     * animating a guess.
     */
    async extractRecipe(source: ImportSource, onProgress?: (p: ImportProgress) => void) {
      const { taskId, labels } = await authed<{ taskId: string; labels?: string[] }>('/import', {
        method: 'POST',
        body: JSON.stringify(source),
      });

      const startedAt = Date.now();
      let lastStep = -1;

      // Hand the UI the full stage list before any polling begins.
      if (labels?.length) onProgress?.({ step: 0, label: labels[0], labels });

      while (Date.now() - startedAt < POLL_TIMEOUT_MS) {
        const status = await authed<{
          status: 'pending' | 'ready' | 'failed';
          step?: number;
          label?: string;
          recipe?: ExtractedRecipe;
          error?: string;
        }>(`/import/${encodeURIComponent(taskId)}`);

        if (status.step !== undefined && status.step !== lastStep) {
          lastStep = status.step;
          onProgress?.({ step: status.step, label: status.label ?? '' });
        }

        if (status.status === 'ready' && status.recipe) return status.recipe;
        if (status.status === 'failed') throw new ApiError(status.error ?? 'Extraction failed');

        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      }

      throw new ApiError(
        "This one's taking longer than expected. Try again.",
        undefined,
        `extraction exceeded ${POLL_TIMEOUT_MS}ms`
      );
    },

    async generateRecipeImage(recipe: Recipe) {
      return authed<ImageTask>('/images', {
        method: 'POST',
        // The backend builds the kie.ai prompt — keeping prompt construction
        // server-side means it can be tuned without shipping an app update.
        body: JSON.stringify({
          recipeId: recipe.id,
          title: recipe.title,
          cuisine: recipe.cuisine,
          ingredients: recipe.ingredients.map((i) => i.name),
        }),
      });
    },

    async getImageTask(taskId: string) {
      return authed<ImageTask>(`/images/${encodeURIComponent(taskId)}`);
    },

    async healthifyRecipe(recipe: Recipe) {
      return authed<HealthierRecipe>('/healthify', {
        method: 'POST',
        body: JSON.stringify({
          title: recipe.title,
          ingredients: recipe.ingredients,
          instructions: recipe.instructions,
          servings: recipe.servings,
        }),
      });
    },

    async estimateNutrition(recipe: Recipe) {
      return authed<NutritionEstimate>('/nutrition', {
        method: 'POST',
        body: JSON.stringify({
          title: recipe.title,
          ingredients: recipe.ingredients,
          servings: recipe.servings,
        }),
      });
    },

    async suggestMeals(prompt: string) {
      const { suggestions } = await authed<{ suggestions: MealSuggestion[] }>('/suggest-meals', {
        method: 'POST',
        body: JSON.stringify({ prompt }),
      });
      return suggestions;
    },
  };
}
