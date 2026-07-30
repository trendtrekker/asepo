import type { Recipe } from '@/data/sample';
import type {
  ExtractedRecipe,
  HealthierRecipe,
  ImageTask,
  ImportProgress,
  ImportSource,
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

/** Maps a failed response to something a user can act on. */
function messageForStatus(status: number): string {
  if (status === 429) return 'Asepo is busy right now. Wait a moment and try again.';
  if (status === 408 || status === 504) return 'That took too long to load. Try again.';
  if (status >= 500) return 'Something went wrong on our end. Try again in a moment.';
  // Same wording as add/failed.tsx's default, which covers arriving there
  // without a message at all.
  return "The link might be private, deleted, or in a format we don't support yet";
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
      messageForStatus(response.status),
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

export function createHttpApi(baseUrl: string): RecipeApi {
  const base = baseUrl.replace(/\/$/, '');

  return {
    async listRecipes() {
      return request<Recipe[]>(base, '/recipes');
    },

    /**
     * Starts an extraction job and polls it. The backend is expected to expose
     * the current pipeline step so the UI can mirror real progress rather than
     * animating a guess.
     */
    async extractRecipe(source: ImportSource, onProgress?: (p: ImportProgress) => void) {
      const { taskId, labels } = await request<{ taskId: string; labels?: string[] }>(base, '/import', {
        method: 'POST',
        body: JSON.stringify(source),
      });

      const startedAt = Date.now();
      let lastStep = -1;

      // Hand the UI the full stage list before any polling begins.
      if (labels?.length) onProgress?.({ step: 0, label: labels[0], labels });

      while (Date.now() - startedAt < POLL_TIMEOUT_MS) {
        const status = await request<{
          status: 'pending' | 'ready' | 'failed';
          step?: number;
          label?: string;
          recipe?: ExtractedRecipe;
          error?: string;
        }>(base, `/import/${encodeURIComponent(taskId)}`);

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
      return request<ImageTask>(base, '/images', {
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
      return request<ImageTask>(base, `/images/${encodeURIComponent(taskId)}`);
    },

    async healthifyRecipe(recipe: Recipe, accessToken: string | null) {
      return request<HealthierRecipe>(base, '/healthify', {
        method: 'POST',
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
        body: JSON.stringify({
          title: recipe.title,
          ingredients: recipe.ingredients,
          instructions: recipe.instructions,
          servings: recipe.servings,
        }),
      });
    },

    async estimateNutrition(recipe: Recipe, accessToken: string | null) {
      return request<NutritionEstimate>(base, '/nutrition', {
        method: 'POST',
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
        body: JSON.stringify({
          title: recipe.title,
          ingredients: recipe.ingredients,
          servings: recipe.servings,
        }),
      });
    },
  };
}
