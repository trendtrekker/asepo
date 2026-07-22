import type { Ingredient, Recipe } from '@/data/sample';

/**
 * The contract between the app and its data source.
 *
 * Two implementations exist: `fixtures` (offline sample data, the default) and
 * `http` (a backend proxy that holds the kie.ai key). Screens and the store
 * only ever see this interface, so switching between them is a config change.
 */

/** What the user handed us to import from. */
export type ImportSource =
  | { kind: 'url'; url: string }
  | { kind: 'text'; text: string }
  | { kind: 'image'; uri: string };

/** Progress ticks during extraction, so the importing screen can show real state. */
export type ImportProgress = {
  /** Index into the step list the UI is displaying. */
  step: number;
  label: string;
  /**
   * The full stage list for this import, sent up front.
   *
   * The UI renders one row per stage, so it needs every label immediately —
   * polling only ever catches whichever stage happens to be current, and fast
   * stages are missed entirely.
   */
  labels?: string[];
};

/**
 * A recipe as returned by extraction — not yet saved, and deliberately partial:
 * an importer often can't determine servings or timings reliably.
 */
export type ExtractedRecipe = {
  title: string;
  ingredients: Ingredient[];
  instructions: string[];
  minutes?: number;
  servings?: number;
  calories?: number;
  imageUrl?: string;
  source?: { handle: string; platform: string };
  /** Extractor confidence 0–1, if the backend reports it. Drives the "double-check" banner. */
  confidence?: number;
};

/** Image generation is asynchronous — kie.ai returns a task, not an image. */
export type ImageTask = {
  taskId: string;
  status: 'pending' | 'ready' | 'failed';
  /**
   * Only set once status is 'ready'. Must be a URL on our own storage, not a
   * raw kie.ai result URL — those are deleted after 14 days.
   */
  url?: string;
  error?: string;
};

export interface RecipeApi {
  /** The user's saved library. */
  listRecipes(): Promise<Recipe[]>;

  /**
   * Turns a link, pasted text, or photo into a structured recipe.
   * `onProgress` fires as the backend works through its pipeline.
   */
  extractRecipe(source: ImportSource, onProgress?: (p: ImportProgress) => void): Promise<ExtractedRecipe>;

  /** Kicks off image generation for a recipe that has no photo. */
  generateRecipeImage(recipe: Recipe): Promise<ImageTask>;

  /** Polls a previously started image task. */
  getImageTask(taskId: string): Promise<ImageTask>;
}

/** Steps shown while extracting. The backend should emit indices into this list. */
export const IMPORT_PIPELINE = [
  'Fetching the page',
  'Reading the video',
  'Finding ingredients',
  'Structuring the recipe',
] as const;
