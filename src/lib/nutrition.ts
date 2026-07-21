import type { Recipe } from '@/data/sample';

/**
 * Placeholder macro split.
 *
 * The fixture data only carries calories, so this derives a plausible
 * protein/carb/fat breakdown from the recipe's diet and meal type purely so the
 * nutrition tab has something to render. These are NOT real values — the UI
 * labels them as estimates, and the real numbers will come from a food database
 * (USDA FoodData Central / Edamam) once the backend computes them from the
 * parsed ingredient list.
 */

export type Macros = { protein: number; carbs: number; fat: number };

/** Fraction of calories from protein / carbs / fat. */
function ratioFor(recipe: Recipe): [number, number, number] {
  if (recipe.diets.includes('Keto')) return [0.3, 0.08, 0.62];
  if (recipe.mealType === 'Dessert') return [0.06, 0.55, 0.39];
  if (recipe.tags.includes('High protein')) return [0.35, 0.35, 0.3];
  if (recipe.diets.includes('Vegan')) return [0.16, 0.56, 0.28];
  if (recipe.mealType === 'Breakfast') return [0.18, 0.5, 0.32];
  return [0.24, 0.44, 0.32];
}

/** Calories per gram. */
const KCAL = { protein: 4, carbs: 4, fat: 9 };

export function estimateMacros(recipe: Recipe): Macros {
  const [p, c, f] = ratioFor(recipe);
  return {
    protein: Math.round((recipe.calories * p) / KCAL.protein),
    carbs: Math.round((recipe.calories * c) / KCAL.carbs),
    fat: Math.round((recipe.calories * f) / KCAL.fat),
  };
}
