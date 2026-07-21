import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import {
  COOKBOOK_SEED,
  RECIPE_SAMPLES,
  type Cookbook,
  type Recipe,
  type StoredCookbook,
} from '@/data/sample';
import { api, type ExtractedRecipe } from '@/lib/api';
import { addIngredient, type GroceryItem } from '@/lib/grocery';
import { clearState, loadState, saveState } from '@/lib/storage';

/**
 * App state, persisted to device storage.
 *
 * The API seeds a fresh install; after that the local copy is the source of
 * truth, so edits and deletions aren't clobbered on next launch. Syncing the
 * two properly is a backend concern.
 */

export type Filters = {
  cookTime: number;
  cuisine: Record<string, boolean>;
  diet: Record<string, boolean>;
  mealType: Record<string, boolean>;
  difficulty: string;
  hasNutrition: boolean;
  ingredients: string[];
};

/** Slider maximum — at this value the cook-time filter is treated as "any". */
export const MAX_COOK_TIME = 120;

export const emptyFilters: Filters = {
  cookTime: MAX_COOK_TIME,
  cuisine: {},
  diet: {},
  mealType: {},
  difficulty: 'Easy',
  hasNutrition: false,
  ingredients: [],
};

export type Onboarding = {
  goals: Record<string, boolean>;
  diet: string;
  allergies: Record<string, boolean>;
  customAllergies: string[];
  peopleCount: number;
};

const emptyOnboarding: Onboarding = {
  goals: {},
  diet: 'None',
  allergies: {},
  customAllergies: [],
  peopleCount: 2,
};

export const MEAL_SLOTS = ['Breakfast', 'Lunch', 'Dinner', 'Snack'] as const;
export type MealSlot = (typeof MEAL_SLOTS)[number];

export type PlanEntry = {
  id: string;
  day: number;
  slot: MealSlot;
  recipeId: string;
  servings: number;
};

export type NewCookbook = {
  name: string;
  description?: string;
  color?: string;
  emoji?: string;
  recipeIds: string[];
};

type Store = {
  /* recipes */
  recipes: Recipe[];
  recipesLoading: boolean;
  recipesError: string | null;
  getRecipe: (id?: string) => Recipe | undefined;
  addRecipe: (recipe: Recipe) => void;
  updateRecipe: (id: string, patch: Partial<Recipe>) => void;
  deleteRecipe: (id: string) => void;

  /* cookbooks */
  cookbooks: Cookbook[];
  recipesInCookbook: (id: string) => Recipe[];
  createCookbook: (input: NewCookbook) => string;

  /* the recipe currently being imported, handed from extraction to review */
  pendingImport: ExtractedRecipe | null;
  setPendingImport: (r: ExtractedRecipe | null) => void;

  /* favourites */
  isFavorite: (r: Recipe) => boolean;
  toggleFavorite: (id: string) => void;

  /* filters */
  filters: Filters;
  setFilters: (next: Filters | ((prev: Filters) => Filters)) => void;
  resetFilters: () => void;

  /* onboarding */
  onboarding: Onboarding;
  setOnboarding: (next: Onboarding | ((prev: Onboarding) => Onboarding)) => void;

  /* grocery */
  grocery: GroceryItem[];
  addRecipeToGrocery: (recipe: Recipe, servings?: number) => number;
  toggleGroceryItem: (id: string) => void;
  removeGroceryItem: (id: string) => void;
  addManualGroceryItem: (name: string) => void;
  clearCheckedGrocery: () => void;
  clearGrocery: () => void;

  /* meal plan */
  plan: PlanEntry[];
  addToPlan: (entry: Omit<PlanEntry, 'id'>) => void;
  removeFromPlan: (id: string) => void;

  /* subscription */
  importsUsed: number;
  importLimit: number;
  recordImport: () => void;
  isPro: boolean;
  setPro: (v: boolean) => void;

  /** Wipes local storage and reseeds — useful from Profile while developing. */
  resetEverything: () => void;
};

const AppContext = createContext<Store | null>(null);

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [storedCookbooks, setStoredCookbooks] = useState<StoredCookbook[]>([]);
  const [recipesLoading, setRecipesLoading] = useState(true);
  const [recipesError, setRecipesError] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [onboarding, setOnboarding] = useState<Onboarding>(emptyOnboarding);
  const [grocery, setGrocery] = useState<GroceryItem[]>([]);
  const [plan, setPlan] = useState<PlanEntry[]>([]);
  const [pendingImport, setPendingImport] = useState<ExtractedRecipe | null>(null);
  const [importsUsed, setImportsUsed] = useState(0);
  const [isPro, setPro] = useState(false);

  /** False until storage has been read, so we never save over saved data. */
  const [hydrated, setHydrated] = useState(false);

  const seedFromApi = useCallback(async () => {
    try {
      const list = await api.listRecipes();
      setRecipes(list);
      setFavorites(Object.fromEntries(list.map((r) => [r.id, r.favorite])));
      setStoredCookbooks(COOKBOOK_SEED);
    } catch (e: unknown) {
      setRecipesError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const saved = await loadState();
      if (cancelled) return;

      if (saved) {
        setRecipes(saved.recipes);
        setStoredCookbooks((saved.cookbooks as StoredCookbook[]) ?? COOKBOOK_SEED);
        setFavorites(saved.favorites ?? {});
        setGrocery(saved.grocery ?? []);
        setPlan((saved.plan as PlanEntry[]) ?? []);
        setOnboarding((saved.onboarding as Onboarding) ?? emptyOnboarding);
        setImportsUsed(saved.importsUsed ?? 0);
        setPro(saved.isPro ?? false);
      } else {
        await seedFromApi();
      }

      if (cancelled) return;
      setRecipesLoading(false);
      setHydrated(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [seedFromApi]);

  useEffect(() => {
    if (!hydrated) return;
    saveState({
      version: 1,
      recipes,
      cookbooks: storedCookbooks as Cookbook[],
      favorites,
      grocery,
      plan,
      onboarding,
      importsUsed,
      isPro,
    });
  }, [hydrated, recipes, storedCookbooks, favorites, grocery, plan, onboarding, importsUsed, isPro]);

  const addRecipeToGrocery = useCallback((recipe: Recipe, servings?: number) => {
    const factor = (servings ?? recipe.servings) / recipe.servings;
    setGrocery((list) =>
      recipe.ingredients.reduce((acc, ing) => addIngredient(acc, ing, factor, recipe.title), list)
    );
    return recipe.ingredients.length;
  }, []);

  /** Counts are derived, so a recipe joining a cookbook updates it automatically. */
  const cookbooks = useMemo<Cookbook[]>(
    () =>
      storedCookbooks.map((cb) => ({
        ...cb,
        count: recipes.filter((r) => r.cookbooks.includes(cb.id)).length,
      })),
    [storedCookbooks, recipes]
  );

  const value = useMemo<Store>(
    () => ({
      recipes,
      recipesLoading,
      recipesError,
      getRecipe: (id) => recipes.find((r) => r.id === id),
      addRecipe: (recipe) => setRecipes((list) => [recipe, ...list]),
      updateRecipe: (id, patch) =>
        setRecipes((list) => list.map((r) => (r.id === id ? { ...r, ...patch } : r))),
      deleteRecipe: (id) => {
        setRecipes((list) => list.filter((r) => r.id !== id));
        setPlan((entries) => entries.filter((e) => e.recipeId !== id));
      },

      cookbooks,
      recipesInCookbook: (id) => recipes.filter((r) => r.cookbooks.includes(id)),
      createCookbook: ({ name, description, color, emoji, recipeIds }) => {
        const id = `cb-${Date.now().toString(36)}`;
        setStoredCookbooks((list) => [...list, { id, name, description, color, emoji }]);
        // Membership lives on the recipe, so joining is a recipe patch.
        if (recipeIds.length) {
          setRecipes((list) =>
            list.map((r) =>
              recipeIds.includes(r.id) ? { ...r, cookbooks: [...r.cookbooks, id] } : r
            )
          );
        }
        return id;
      },

      pendingImport,
      setPendingImport,

      isFavorite: (r) => favorites[r.id] ?? r.favorite,
      toggleFavorite: (id) => setFavorites((f) => ({ ...f, [id]: !f[id] })),

      filters,
      setFilters,
      resetFilters: () => setFilters(emptyFilters),

      onboarding,
      setOnboarding,

      grocery,
      addRecipeToGrocery,
      toggleGroceryItem: (id) =>
        setGrocery((list) => list.map((i) => (i.id === id ? { ...i, checked: !i.checked } : i))),
      removeGroceryItem: (id) => setGrocery((list) => list.filter((i) => i.id !== id)),
      addManualGroceryItem: (name) =>
        setGrocery((list) => addIngredient(list, { qty: '', unit: '', name }, 1, 'Added by hand')),
      clearCheckedGrocery: () => setGrocery((list) => list.filter((i) => !i.checked)),
      clearGrocery: () => setGrocery([]),

      plan,
      addToPlan: (entry) =>
        setPlan((entries) => [
          ...entries,
          { ...entry, id: `${entry.recipeId}-${entry.day}-${entry.slot}-${Date.now()}` },
        ]),
      removeFromPlan: (id) => setPlan((entries) => entries.filter((e) => e.id !== id)),

      importsUsed,
      importLimit: 5,
      recordImport: () => setImportsUsed((n) => n + 1),
      isPro,
      setPro,

      resetEverything: () => {
        clearState().then(() => {
          setGrocery([]);
          setPlan([]);
          setFavorites({});
          setOnboarding(emptyOnboarding);
          setImportsUsed(0);
          setPro(false);
          setRecipes(RECIPE_SAMPLES);
          setStoredCookbooks(COOKBOOK_SEED);
          setFavorites(Object.fromEntries(RECIPE_SAMPLES.map((r) => [r.id, r.favorite])));
        });
      },
    }),
    [
      recipes,
      cookbooks,
      recipesLoading,
      recipesError,
      pendingImport,
      favorites,
      filters,
      onboarding,
      grocery,
      plan,
      importsUsed,
      isPro,
      addRecipeToGrocery,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useStore() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useStore must be used inside <AppStoreProvider>');
  return ctx;
}
