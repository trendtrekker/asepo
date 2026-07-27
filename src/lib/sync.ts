import type { Recipe, StoredCookbook } from '@/data/sample';
import type { GroceryItem } from '@/lib/grocery';
import { supabase } from '@/lib/supabase';
import type { Onboarding, PlanEntry } from '@/store/app-store';

/**
 * Full-table-replace sync with Supabase. Given the data volumes involved (one
 * person's recipe box, not a shared dataset), re-syncing whole tables on every
 * debounced local change is simpler and safer than threading a Supabase call
 * into every mutation in app-store.tsx — there's no call site that can be
 * missed. Every function here swallows its own errors: a sync hiccup should
 * never break the local-first experience, just leave the cloud copy stale
 * until the next successful push.
 */

export type ProfileSnapshot = {
  profileName: string;
  onboarding: Onboarding;
  isPro: boolean;
  importsUsed: number;
};

export type LocalSnapshot = {
  recipes: Recipe[];
  cookbooks: StoredCookbook[];
  grocery: GroceryItem[];
  plan: PlanEntry[];
  profile: ProfileSnapshot;
};

/* ------------------------------------------------------------------ *
 * Row <-> app-type mapping
 * ------------------------------------------------------------------ */

type RecipeRow = {
  id: string;
  title: string;
  minutes: number;
  calories: number;
  servings: number;
  favorite: boolean;
  cuisine: string;
  meal_type: string;
  difficulty: string;
  diets: string[];
  tags: string[];
  cookbooks: string[];
  rating: number;
  cooked_count: number;
  added_at: number;
  source: { handle: string; platform: string } | null;
  ingredients: Recipe['ingredients'];
  instructions: string[];
  photo_url: string | null;
};

const recipeToRow = (userId: string, r: Recipe) => ({
  id: r.id,
  user_id: userId,
  title: r.title,
  minutes: r.minutes,
  calories: r.calories,
  servings: r.servings,
  favorite: r.favorite,
  cuisine: r.cuisine,
  meal_type: r.mealType,
  difficulty: r.difficulty,
  diets: r.diets,
  tags: r.tags,
  cookbooks: r.cookbooks,
  rating: r.rating,
  cooked_count: r.cookedCount,
  added_at: r.addedAt,
  source: r.source ?? null,
  ingredients: r.ingredients,
  instructions: r.instructions,
  photo_url: r.photoUrl ?? null,
});

const rowToRecipe = (row: RecipeRow): Recipe => ({
  id: row.id,
  title: row.title,
  minutes: row.minutes,
  calories: row.calories,
  servings: row.servings,
  favorite: row.favorite,
  cuisine: row.cuisine,
  mealType: row.meal_type,
  difficulty: row.difficulty as Recipe['difficulty'],
  diets: row.diets,
  tags: row.tags,
  cookbooks: row.cookbooks,
  rating: row.rating,
  cookedCount: row.cooked_count,
  addedAt: row.added_at,
  source: row.source ?? { handle: '', platform: '' },
  ingredients: row.ingredients,
  instructions: row.instructions,
  photoUrl: row.photo_url ?? undefined,
});

type CookbookRow = {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  emoji: string | null;
};

const cookbookToRow = (userId: string, c: StoredCookbook) => ({
  id: c.id,
  user_id: userId,
  name: c.name,
  description: c.description ?? null,
  color: c.color ?? null,
  emoji: c.emoji ?? null,
});

const rowToCookbook = (row: CookbookRow): StoredCookbook => ({
  id: row.id,
  name: row.name,
  description: row.description ?? undefined,
  color: row.color ?? undefined,
  emoji: row.emoji ?? undefined,
});

type GroceryRow = {
  id: string;
  name: string;
  qty: string;
  unit: string;
  checked: boolean;
  sources: string[];
};

const groceryToRow = (userId: string, g: GroceryItem) => ({
  id: g.id,
  user_id: userId,
  name: g.name,
  qty: g.qty,
  unit: g.unit,
  checked: g.checked,
  sources: g.sources,
});

const rowToGrocery = (row: GroceryRow): GroceryItem => ({
  id: row.id,
  name: row.name,
  qty: row.qty,
  unit: row.unit,
  checked: row.checked,
  sources: row.sources,
});

type PlanRow = {
  id: string;
  day: number;
  slot: string;
  recipe_id: string;
  servings: number;
};

const planToRow = (userId: string, p: PlanEntry) => ({
  id: p.id,
  user_id: userId,
  day: p.day,
  slot: p.slot,
  recipe_id: p.recipeId,
  servings: p.servings,
});

const rowToPlan = (row: PlanRow): PlanEntry => ({
  id: row.id,
  day: row.day,
  slot: row.slot as PlanEntry['slot'],
  recipeId: row.recipe_id,
  servings: row.servings,
});

type ProfileRow = {
  name: string;
  diet: string;
  people_count: number;
  allergies: Record<string, boolean>;
  custom_allergies: string[];
  goals: Record<string, boolean>;
  is_pro: boolean;
  imports_used: number;
};

const profileToRow = (userId: string, p: ProfileSnapshot) => ({
  id: userId,
  name: p.profileName,
  diet: p.onboarding.diet,
  people_count: p.onboarding.peopleCount,
  allergies: p.onboarding.allergies,
  custom_allergies: p.onboarding.customAllergies,
  goals: p.onboarding.goals,
  is_pro: p.isPro,
  imports_used: p.importsUsed,
  updated_at: new Date().toISOString(),
});

const rowToProfile = (row: ProfileRow): ProfileSnapshot => ({
  profileName: row.name,
  onboarding: {
    goals: row.goals,
    diet: row.diet,
    allergies: row.allergies,
    customAllergies: row.custom_allergies,
    peopleCount: row.people_count,
  },
  isPro: row.is_pro,
  importsUsed: row.imports_used,
});

/* ------------------------------------------------------------------ *
 * Replace-in-place: delete whatever's no longer local, upsert the rest.
 * ------------------------------------------------------------------ */

async function replaceTable<Row extends { id: string }>(
  table: 'recipes' | 'cookbooks' | 'grocery_items' | 'plan_entries',
  userId: string,
  rows: Row[]
) {
  const { data: existing, error: fetchError } = await supabase
    .from(table)
    .select('id')
    .eq('user_id', userId);
  if (fetchError) return;

  const localIds = new Set(rows.map((r) => r.id));
  const toDelete = (existing ?? []).map((r) => r.id).filter((id) => !localIds.has(id));
  if (toDelete.length) {
    await supabase.from(table).delete().eq('user_id', userId).in('id', toDelete);
  }
  if (rows.length) {
    await supabase.from(table).upsert(rows);
  }
}

export async function hasRemoteData(userId: string): Promise<boolean> {
  const tables = ['recipes', 'cookbooks', 'grocery_items', 'plan_entries'] as const;
  for (const table of tables) {
    const { count } = await supabase
      .from(table)
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);
    if (count && count > 0) return true;
  }
  return false;
}

export async function pullRemoteState(userId: string): Promise<LocalSnapshot | null> {
  try {
    const [recipesRes, cookbooksRes, groceryRes, planRes, profileRes] = await Promise.all([
      supabase.from('recipes').select('*').eq('user_id', userId),
      supabase.from('cookbooks').select('*').eq('user_id', userId),
      supabase.from('grocery_items').select('*').eq('user_id', userId),
      supabase.from('plan_entries').select('*').eq('user_id', userId),
      supabase.from('profiles').select('*').eq('id', userId).single(),
    ]);

    if (recipesRes.error || cookbooksRes.error || groceryRes.error || planRes.error) return null;

    return {
      recipes: (recipesRes.data ?? []).map(rowToRecipe),
      cookbooks: (cookbooksRes.data ?? []).map(rowToCookbook),
      grocery: (groceryRes.data ?? []).map(rowToGrocery),
      plan: (planRes.data ?? []).map(rowToPlan),
      profile: profileRes.data
        ? rowToProfile(profileRes.data)
        : { profileName: '', onboarding: emptyOnboardingFallback, isPro: false, importsUsed: 0 },
    };
  } catch {
    return null;
  }
}

// profiles always has a row (created by the on_auth_user_created trigger), so
// this only ever backstops an unexpected fetch failure, not a missing row.
const emptyOnboardingFallback: Onboarding = {
  goals: {},
  diet: 'None',
  allergies: {},
  customAllergies: [],
  peopleCount: 2,
};

export async function pushLocalState(userId: string, snapshot: LocalSnapshot): Promise<void> {
  try {
    await Promise.all([
      replaceTable('recipes', userId, snapshot.recipes.map((r) => recipeToRow(userId, r))),
      replaceTable('cookbooks', userId, snapshot.cookbooks.map((c) => cookbookToRow(userId, c))),
      replaceTable('grocery_items', userId, snapshot.grocery.map((g) => groceryToRow(userId, g))),
      replaceTable('plan_entries', userId, snapshot.plan.map((p) => planToRow(userId, p))),
      supabase.from('profiles').upsert(profileToRow(userId, snapshot.profile)),
    ]);
  } catch {
    // Local state remains the source of truth; the next debounced push retries.
  }
}
