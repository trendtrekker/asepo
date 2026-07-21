import type { Recipe } from '@/data/sample';
import type {
  ExtractedRecipe,
  ImageTask,
  ImportProgress,
  ImportSource,
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
    message: string,
    readonly status?: number
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(baseUrl: string, path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...init?.headers },
    });
  } catch (cause) {
    throw new ApiError(`Could not reach the server (${String(cause)})`);
  }

  if (!response.ok) {
    throw new ApiError(`Request failed: ${response.status} ${response.statusText}`, response.status);
  }

  return (await response.json()) as T;
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
      const { taskId } = await request<{ taskId: string }>(base, '/import', {
        method: 'POST',
        body: JSON.stringify(source),
      });

      const startedAt = Date.now();
      let lastStep = -1;

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

      throw new ApiError('Extraction timed out');
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
  };
}
