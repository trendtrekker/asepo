import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
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
import { api, type ExtractedRecipe, type ImportSource } from '@/lib/api';
import { addIngredient, type GroceryItem } from '@/lib/grocery';
import { pickUnlockedMethod, type ImportMethodId } from '@/lib/import-methods';
import { reconcilePlanNotifications } from '@/lib/plan-notifications';
import { clearState, loadState, saveState } from '@/lib/storage';
import { hasRemoteData, pullRemoteState, pushLocalState } from '@/lib/sync';
import { useAuth } from '@/store/auth-store';

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

/**
 * Backfills missing fields against emptyOnboarding rather than trusting the
 * source wholesale — a saved blob from before a field existed, or a Supabase
 * row fetched before a migration caught up, would otherwise leave e.g.
 * `goals` undefined and crash any screen that indexes into it. Field-by-field
 * with `??` on purpose — a plain object spread doesn't repair a field that's
 * present but explicitly `undefined`, since the key still wins over the
 * earlier spread.
 */
const sanitizeOnboarding = (o: Partial<Onboarding> | null | undefined): Onboarding => ({
  goals: o?.goals ?? emptyOnboarding.goals,
  diet: o?.diet ?? emptyOnboarding.diet,
  allergies: o?.allergies ?? emptyOnboarding.allergies,
  customAllergies: o?.customAllergies ?? emptyOnboarding.customAllergies,
  peopleCount: o?.peopleCount ?? emptyOnboarding.peopleCount,
});

/**
 * How hard the sign-in merge tries before standing down for the session.
 * Signing in is exactly when a phone is likeliest to be half-connected, and
 * the alternative to retrying is a session that never syncs at all.
 */
const MERGE_ATTEMPTS = 3;
const MERGE_RETRY_MS = 2000;

export const MEAL_SLOTS = ['Breakfast', 'Lunch', 'Dinner', 'Snack'] as const;
export type MealSlot = (typeof MEAL_SLOTS)[number];

export type PlanEntry = {
  id: string;
  /** ISO date ("YYYY-MM-DD") — see src/lib/dates.ts. */
  date: string;
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
  addRecipeToCookbook: (recipeId: string, cookbookId: string) => void;
  removeRecipeFromCookbook: (recipeId: string, cookbookId: string) => void;
  renameCookbook: (id: string, name: string) => void;
  deleteCookbook: (id: string) => void;

  /* the recipe currently being imported, handed from extraction to review */
  pendingImport: ExtractedRecipe | null;
  setPendingImport: (r: ExtractedRecipe | null) => void;

  /**
   * What to import — set by the add sheet (link / pasted text / photo) and
   * read by the importing screen. A store field rather than a route param
   * because a photo's base64 payload is too large to put in a URL.
   */
  pendingImportSource: ImportSource | null;
  setPendingImportSource: (s: ImportSource | null) => void;

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

  /**
   * "Add a recipe" is registered-only. Signed-in free accounts get exactly
   * one import method — 'all' for Pro, null for a signed-out guest (nothing
   * usable until they sign in).
   */
  isSignedIn: boolean;
  unlockedMethod: ImportMethodId | 'all' | null;
  /**
   * True until the initial Supabase session check resolves. isSignedIn is
   * false during this window even for someone with a valid session, so
   * anything that redirects a signed-out user away must wait for this to
   * clear first — otherwise a real sign-in flickers to a "sign in" screen on
   * every cold load.
   */
  authLoading: boolean;

  /** Wipes local storage and reseeds — useful from Profile while developing. */
  resetEverything: () => void;

  /* profile */
  profileName: string;
  setProfileName: (name: string) => void;

  /** Shown once, before the first AI-backed import runs. */
  aiConsentGiven: boolean;
  setAiConsentGiven: (v: boolean) => void;

  /** Most recent first, deduped, capped — drives Search's idle screen. */
  recentSearches: string[];
  recordSearch: (query: string) => void;

  /**
   * Re-pulls this account's cloud data — the only way to see an edit made on
   * another device, since ongoing sync only pushes local changes up. A
   * no-op for a signed-out guest, who has nothing in the cloud to pull.
   * Returns whether it actually pulled anything, so a caller (the Home
   * refresh button) can tell a real sync from a guest tapping it.
   */
  refresh: () => Promise<boolean>;
};

const AppContext = createContext<Store | null>(null);

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
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
  const [pendingImportSource, setPendingImportSource] = useState<ImportSource | null>(null);
  const [importsUsed, setImportsUsed] = useState(0);
  const [isPro, setPro] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [aiConsentGiven, setAiConsentGiven] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  const isSignedIn = Boolean(user);
  const unlockedMethod = useMemo<ImportMethodId | 'all' | null>(() => {
    if (!user) return null;
    if (isPro) return 'all';
    return pickUnlockedMethod(user.id);
  }, [user, isPro]);

  /**
   * Search used to show four invented "recent searches" from sample data, so
   * a fresh install claimed a history the user never had. This records the
   * real thing: newest first, case-insensitively deduped so retyping a term
   * moves it up rather than listing it twice, and capped so the idle screen
   * stays short.
   */
  const recordSearch = useCallback((query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;
    setRecentSearches((current) => [
      trimmed,
      ...current.filter((s) => s.toLowerCase() !== trimmed.toLowerCase()),
    ].slice(0, 6));
  }, []);

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
        setOnboarding(sanitizeOnboarding(saved.onboarding as Partial<Onboarding>));
        setImportsUsed(saved.importsUsed ?? 0);
        setPro(saved.isPro ?? false);
        setProfileName(saved.profileName ?? '');
        setAiConsentGiven(saved.aiConsentGiven ?? false);
        setRecentSearches(saved.recentSearches ?? []);
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
      profileName,
      aiConsentGiven,
      recentSearches,
    });
  }, [
    hydrated,
    recipes,
    storedCookbooks,
    favorites,
    grocery,
    plan,
    onboarding,
    importsUsed,
    isPro,
    profileName,
    aiConsentGiven,
    recentSearches,
  ]);

  // Debounced so adding several plan entries in a row doesn't re-scan and
  // reschedule on every single one. Purely local/device — runs the same for
  // guests and signed-in users, independent of the Supabase sync above.
  useEffect(() => {
    if (!hydrated) return;
    const timer = setTimeout(() => {
      reconcilePlanNotifications(plan, recipes);
    }, 1000);
    return () => clearTimeout(timer);
  }, [hydrated, plan, recipes]);

  /**
   * Puts this device back to what a fresh install actually holds. Deliberately
   * not RECIPE_SAMPLES: the real API seeds a new install with an empty library
   * (see seedFromApi), and handing someone who just signed out a shelf of
   * invented recipes is the same dishonesty 1532f23 took off first launch.
   * Cookbooks go back to the seed shells for that same reason — those are what
   * a fresh install has. AI consent goes too; it's a permission a person gave,
   * not a property of the handset, so the next one has to be asked themselves.
   */
  const clearAccountState = useCallback(() => {
    void clearState();
    setRecipes([]);
    setStoredCookbooks(COOKBOOK_SEED);
    setFavorites({});
    setGrocery([]);
    setPlan([]);
    setOnboarding(emptyOnboarding);
    setImportsUsed(0);
    setPro(false);
    setProfileName('');
    setAiConsentGiven(false);
    setRecentSearches([]);
    setPendingImport(null);
    setPendingImportSource(null);
  }, []);

  /**
   * Which user id local state has already been reconciled against. Reset on
   * sign-out so the next sign-in (same or different account) re-runs the
   * merge below rather than treating a stale match as "already synced".
   */
  const syncedUserId = useRef<string | null>(null);

  /**
   * Whose data is currently sitting on this device. Distinguishes a real
   * sign-out from a cold start that hasn't resolved its session yet — both
   * read as `user === null` — and from a guest who was never signed in at
   * all and must keep the library they built locally.
   */
  const deviceUserId = useRef<string | null>(null);

  /**
   * Signing out has to take the account's data with it. Without this the next
   * person to sign in on this handset opened onto the previous one's recipes,
   * and — since a brand-new account has nothing in the cloud to pull — the
   * merge effect below then pushed that data up into *their* Supabase rows,
   * turning a stale screen into someone else's permanent library.
   *
   * A session Supabase ends by itself (a refresh token that can't recover)
   * lands here too. That's the right side to err on: the account's cloud copy
   * is untouched and comes back on the next sign-in, whereas leaving the data
   * on an unauthenticated device is the exact failure this closes.
   */
  useEffect(() => {
    if (user) {
      deviceUserId.current = user.id;
      return;
    }
    if (!deviceUserId.current) return;
    deviceUserId.current = null;
    syncedUserId.current = null;
    clearAccountState();
  }, [user, clearAccountState]);

  /**
   * One-time merge on sign-in: pull the account's cloud data down if it has
   * any, otherwise push whatever's on this device up (first-sign-in migration).
   *
   * `syncedUserId` is only stamped once one of those two has actually
   * happened, because stamping it is what opens the gate on the ongoing push
   * below — and that push deletes remote rows the local copy doesn't have.
   * Treating a failed check or a failed pull as "reconciled" therefore isn't a
   * stale-data problem, it's a destructive one: a device that could not read
   * the account would go on to overwrite it with whatever it was holding,
   * which on a fresh install is nothing. So an unresolved failure retries a
   * few times and then stands down for the session, leaving both copies
   * exactly as they were.
   */
  useEffect(() => {
    if (!hydrated || !user || syncedUserId.current === user.id) return;
    const userId = user.id;
    let cancelled = false;

    /**
     * Waits between attempts, but hands the teardown below a way to cut the
     * wait short — otherwise signing out mid-backoff leaves a timer armed for
     * seconds against a user who is already gone. Resolving rather than just
     * clearing lets the loop wake up and see `cancelled`.
     */
    let abortWait: (() => void) | null = null;
    const waitBeforeRetry = (ms: number) =>
      new Promise<void>((resolve) => {
        const timer = setTimeout(resolve, ms);
        abortWait = () => {
          clearTimeout(timer);
          resolve();
        };
      });

    /** One go at reconciling. Returns whether the account is now settled. */
    const attemptMerge = async (): Promise<boolean> => {
      const remote = await hasRemoteData(userId);
      if (cancelled || remote === 'unknown') return false;

      if (remote === 'has-data') {
        const snapshot = await pullRemoteState(userId);
        if (cancelled) return false;
        if (!snapshot) return false;
        setRecipes(snapshot.recipes);
        setStoredCookbooks(snapshot.cookbooks);
        setFavorites(Object.fromEntries(snapshot.recipes.map((r) => [r.id, r.favorite])));
        setGrocery(snapshot.grocery);
        setPlan(snapshot.plan);
        setProfileName(snapshot.profile.profileName);
        setOnboarding(sanitizeOnboarding(snapshot.profile.onboarding));
        setImportsUsed(snapshot.profile.importsUsed);
        setPro(snapshot.profile.isPro);
        return true;
      }

      // Established empty, so this can't delete anything that matters — which
      // is also why a push that quietly fails (pushLocalState swallows its own
      // errors) is still safe to call settled: the ongoing push retries on the
      // next local edit, against an account with nothing to lose.
      await pushLocalState(userId, {
        recipes,
        cookbooks: storedCookbooks,
        grocery,
        plan,
        profile: { profileName, onboarding, isPro, importsUsed },
      });
      return !cancelled;
    };

    (async () => {
      for (let attempt = 0; attempt < MERGE_ATTEMPTS; attempt++) {
        if (attempt > 0) {
          await waitBeforeRetry(MERGE_RETRY_MS * attempt);
          if (cancelled) return;
        }
        if (await attemptMerge()) {
          syncedUserId.current = userId;
          return;
        }
        if (cancelled) return;
      }
      // Out of attempts. The device keeps working on its local copy, and the
      // cloud copy is left untouched rather than replaced from a device that
      // never managed to read it. Signing in again re-runs this.
      console.warn('asepo: could not reconcile with the cloud for', userId);
    })();

    return () => {
      cancelled = true;
      abortWait?.();
    };
    // Only the sign-in transition should trigger this — not every local edit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, user]);

  // Ongoing sync: once merged, keep pushing local changes up. Debounced
  // separately from the AsyncStorage save above so the two don't interfere.
  useEffect(() => {
    if (!hydrated || !user || syncedUserId.current !== user.id) return;
    const userId = user.id;
    const timer = setTimeout(() => {
      pushLocalState(userId, {
        recipes,
        cookbooks: storedCookbooks,
        grocery,
        plan,
        profile: { profileName, onboarding, isPro, importsUsed },
      });
    }, 800);
    return () => clearTimeout(timer);
  }, [
    hydrated,
    user,
    recipes,
    storedCookbooks,
    grocery,
    plan,
    onboarding,
    importsUsed,
    isPro,
    profileName,
  ]);

  /**
   * Manual pull, for the Home refresh button — the ongoing sync above only
   * pushes local edits up, so an edit made on another device never appears
   * here until this runs (or the next sign-in). Applies the same fields the
   * sign-in merge does; leaves local state untouched on failure or for a
   * signed-out guest, who has no remote copy to pull.
   */
  const refresh = useCallback(async () => {
    if (!user) return false;
    const remote = await pullRemoteState(user.id);
    if (!remote) return false;
    setRecipes(remote.recipes);
    setStoredCookbooks(remote.cookbooks);
    setFavorites(Object.fromEntries(remote.recipes.map((r) => [r.id, r.favorite])));
    setGrocery(remote.grocery);
    setPlan(remote.plan);
    setProfileName(remote.profile.profileName);
    setOnboarding(sanitizeOnboarding(remote.profile.onboarding));
    setImportsUsed(remote.profile.importsUsed);
    setPro(remote.profile.isPro);
    return true;
  }, [user]);

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
      addRecipeToCookbook: (recipeId, cookbookId) =>
        setRecipes((list) =>
          list.map((r) =>
            r.id === recipeId && !r.cookbooks.includes(cookbookId)
              ? { ...r, cookbooks: [...r.cookbooks, cookbookId] }
              : r
          )
        ),
      removeRecipeFromCookbook: (recipeId, cookbookId) =>
        setRecipes((list) =>
          list.map((r) =>
            r.id === recipeId ? { ...r, cookbooks: r.cookbooks.filter((id) => id !== cookbookId) } : r
          )
        ),
      renameCookbook: (id, name) =>
        setStoredCookbooks((list) => list.map((cb) => (cb.id === id ? { ...cb, name } : cb))),
      deleteCookbook: (id) => {
        setStoredCookbooks((list) => list.filter((cb) => cb.id !== id));
        // Membership lives on the recipe, so drop the reference there too —
        // otherwise a recipe keeps pointing at a cookbook that no longer exists.
        setRecipes((list) =>
          list.map((r) =>
            r.cookbooks.includes(id) ? { ...r, cookbooks: r.cookbooks.filter((cid) => cid !== id) } : r
          )
        );
      },

      pendingImport,
      setPendingImport,
      pendingImportSource,
      setPendingImportSource,

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
          { ...entry, id: `${entry.recipeId}-${entry.date}-${entry.slot}-${Date.now()}` },
        ]),
      removeFromPlan: (id) => setPlan((entries) => entries.filter((e) => e.id !== id)),

      importsUsed,
      importLimit: 3,
      recordImport: () => setImportsUsed((n) => n + 1),
      isPro,
      setPro,
      isSignedIn,
      unlockedMethod,
      authLoading,

      resetEverything: () => {
        clearState().then(() => {
          setGrocery([]);
          setPlan([]);
          setFavorites({});
          setOnboarding(emptyOnboarding);
          setImportsUsed(0);
          setPro(false);
          setProfileName('');
          setAiConsentGiven(false);
          setRecentSearches([]);
          setRecipes(RECIPE_SAMPLES);
          setStoredCookbooks(COOKBOOK_SEED);
          setFavorites(Object.fromEntries(RECIPE_SAMPLES.map((r) => [r.id, r.favorite])));
        });
      },

      profileName,
      setProfileName,

      aiConsentGiven,
      setAiConsentGiven,

      recentSearches,
      recordSearch,
      refresh,
    }),
    [
      recipes,
      cookbooks,
      recipesLoading,
      recipesError,
      pendingImport,
      pendingImportSource,
      favorites,
      filters,
      onboarding,
      grocery,
      plan,
      importsUsed,
      isPro,
      isSignedIn,
      unlockedMethod,
      authLoading,
      profileName,
      aiConsentGiven,
      recentSearches,
      recordSearch,
      refresh,
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
