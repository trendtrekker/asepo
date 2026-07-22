import { RECIPE_SAMPLES, SAMPLE_INGREDIENTS, SAMPLE_INSTRUCTIONS } from '@/data/sample';
import type {
  ExtractedRecipe,
  ImageTask,
  ImportProgress,
  ImportSource,
  RecipeApi,
} from '@/lib/api/types';
import { IMPORT_PIPELINE } from '@/lib/api/types';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Offline implementation backed by the sample data. This is what runs until
 * EXPO_PUBLIC_API_URL is set, so the app is fully usable with no backend.
 */
export const fixtureApi: RecipeApi = {
  async listRecipes() {
    return RECIPE_SAMPLES;
  },

  async extractRecipe(source: ImportSource, onProgress?: (p: ImportProgress) => void) {
    // Walks the same pipeline the real backend reports, so the importing screen
    // behaves identically against either implementation.
    for (let step = 0; step < IMPORT_PIPELINE.length; step++) {
      onProgress?.({ step, label: IMPORT_PIPELINE[step], labels: [...IMPORT_PIPELINE] });
      await sleep(850);
    }

    const sample = RECIPE_SAMPLES[0];
    const extracted: ExtractedRecipe = {
      title: sample.title,
      ingredients: SAMPLE_INGREDIENTS,
      instructions: SAMPLE_INSTRUCTIONS,
      minutes: sample.minutes,
      servings: sample.servings,
      calories: sample.calories,
      source: sample.source,
      confidence: 0.82,
    };

    // Echo back something recognisable so pasted links are visibly honoured.
    if (source.kind === 'url' && source.url.trim()) {
      extracted.source = { handle: source.url.trim(), platform: 'Link' };
    }

    return extracted;
  },

  async generateRecipeImage() {
    // No image generation offline — callers fall back to the generated artwork.
    return { taskId: 'fixture', status: 'failed', error: 'No API configured' } satisfies ImageTask;
  },

  async getImageTask(taskId: string) {
    return { taskId, status: 'failed', error: 'No API configured' } satisfies ImageTask;
  },
};
