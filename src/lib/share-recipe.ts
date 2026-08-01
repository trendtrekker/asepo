import type { Ingredient, Recipe } from '@/data/sample';
import { convertMeasure } from '@/lib/quantity';

/**
 * Builds the plain text a recipe is shared as.
 *
 * Share used to send only `Check out "Title" on Asepo` — a bare sentence the
 * recipient could do nothing with. A link wouldn't have helped: recipe ids are
 * generated on-device at save time, so they resolve to nothing on anyone
 * else's phone, and there is no published recipe endpoint. Sending the whole
 * recipe as text is the one form that's genuinely useful with no backend.
 */

/**
 * Where the app can be downloaded. Empty until the Play listing exists, which
 * is why the sign-off below reads without a URL rather than shipping a dead
 * link — fill this in once the store page is live and it appears everywhere
 * automatically.
 */
export const APP_DOWNLOAD_URL = '';

const APP_NAME = 'Asepo';
const TAGLINE = 'save recipes from TikTok, Instagram, or any website in one tap';

/** The promo appended to everything shared out of the app. */
export function shareSignOff(): string {
  const invite = `Shared from ${APP_NAME} — ${TAGLINE}.`;
  return APP_DOWNLOAD_URL ? `${invite}\nGet it here: ${APP_DOWNLOAD_URL}` : `${invite}\nGet ${APP_NAME} to save it to your own cookbook.`;
}

function ingredientLine(ing: Ingredient, factor: number, metric: boolean): string {
  const { qty, unit } = convertMeasure(ing.qty, ing.unit, factor, metric);
  // qty and unit are each independently optional — "salt, to taste" has
  // neither, "3 eggs" has no unit. Join only what's actually there so the
  // line never carries a stray double space.
  return `• ${[qty, unit, ing.name].map((p) => p.trim()).filter(Boolean).join(' ')}`;
}

export function recipeShareText(
  recipe: Recipe,
  options: {
    /** Ingredients as currently shown — may be the healthier swap. */
    ingredients: Ingredient[];
    /** Servings the user has dialled to, which may differ from the recipe's. */
    servings: number;
    /** Scale applied to quantities for that serving count. */
    factor: number;
    metric: boolean;
  }
): string {
  const { ingredients, servings, factor, metric } = options;

  const meta = [
    recipe.minutes ? `${recipe.minutes} min` : null,
    servings ? `Serves ${servings}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const sections = [
    recipe.title,
    meta || null,
    ingredients.length ? `Ingredients\n${ingredients.map((i) => ingredientLine(i, factor, metric)).join('\n')}` : null,
    recipe.instructions.length
      ? `Steps\n${recipe.instructions.map((s, i) => `${i + 1}. ${s}`).join('\n')}`
      : null,
    shareSignOff(),
  ].filter(Boolean);

  return sections.join('\n\n');
}
