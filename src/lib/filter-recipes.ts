import { RECIPE_SAMPLES, type Recipe } from '@/data/sample';
import { MAX_COOK_TIME, type Filters } from '@/store/app-store';

const anySelected = (map: Record<string, boolean>) => Object.values(map).some(Boolean);
const selectedKeys = (map: Record<string, boolean>) =>
  Object.keys(map).filter((k) => map[k]);

/**
 * Applies the filter sheet's state. Shared by the Recipes list and the
 * "Show N recipes" button so the two can never disagree.
 */
export function applyFilters(recipes: Recipe[], f: Filters): Recipe[] {
  return recipes.filter((r) => {
    // At the slider maximum the cook-time filter is off, so nothing is hidden
    // before the user has actually filtered anything.
    if (f.cookTime < MAX_COOK_TIME && r.minutes > f.cookTime) return false;

    if (anySelected(f.cuisine) && !f.cuisine[r.cuisine]) return false;
    if (anySelected(f.mealType) && !f.mealType[r.mealType]) return false;

    // "None" in the diet filter means "don't filter by diet".
    const diets = selectedKeys(f.diet).filter((d) => d !== 'None');
    if (diets.length && !diets.every((d) => r.diets.includes(d))) return false;

    if (f.ingredients.length) {
      const pantry = r.ingredients.map((i) => i.name.toLowerCase());
      const hasAll = f.ingredients.every((want) =>
        pantry.some((have) => have.includes(want.toLowerCase()))
      );
      if (!hasAll) return false;
    }

    // Every sample recipe carries nutrition, so this is a no-op today — it
    // becomes meaningful once imported recipes can lack it.
    if (f.hasNutrition && !r.calories) return false;

    return true;
  });
}

/** The quick chips above the list, applied before the filter sheet. */
export function applyChip(
  recipes: Recipe[],
  chip: string,
  isFavorite: (r: Recipe) => boolean
): Recipe[] {
  if (chip === 'Favorites') return recipes.filter(isFavorite);
  if (chip === 'Quick (<30 min)') return recipes.filter((r) => r.minutes < 30);
  if (chip === 'Recently added') return [...recipes].sort((a, b) => b.addedAt - a.addedAt).slice(0, 8);
  return recipes;
}

export function sortRecipes(recipes: Recipe[], sort: string): Recipe[] {
  const out = [...recipes];
  switch (sort) {
    case 'A–Z':
      return out.sort((a, b) => a.title.localeCompare(b.title));
    case 'Cook time':
      return out.sort((a, b) => a.minutes - b.minutes);
    case 'Rating':
      return out.sort((a, b) => b.rating - a.rating || b.cookedCount - a.cookedCount);
    case 'Most cooked':
      return out.sort((a, b) => b.cookedCount - a.cookedCount);
    default:
      return out.sort((a, b) => b.addedAt - a.addedAt);
  }
}

/** Full-text-ish search across titles, ingredients, tags and cuisine. */
export function searchRecipes(query: string): Recipe[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return RECIPE_SAMPLES.filter(
    (r) =>
      r.title.toLowerCase().includes(q) ||
      r.cuisine.toLowerCase().includes(q) ||
      r.mealType.toLowerCase().includes(q) ||
      r.tags.some((t) => t.toLowerCase().includes(q)) ||
      r.ingredients.some((i) => i.name.toLowerCase().includes(q))
  );
}
