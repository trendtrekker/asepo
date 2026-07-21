import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Cookbook, Recipe } from '@/data/sample';
import type { GroceryItem } from '@/lib/grocery';

/**
 * Local persistence. Everything the user creates or edits lives here so it
 * survives an app restart; the API is only consulted to seed a fresh install.
 */

const KEY = 'asepo:state:v1';

export type PersistedState = {
  /** Bump when the shape changes incompatibly — mismatches are discarded. */
  version: 1;
  recipes: Recipe[];
  cookbooks: Cookbook[];
  favorites: Record<string, boolean>;
  grocery: GroceryItem[];
  plan: unknown[];
  onboarding: unknown;
  importsUsed: number;
  isPro: boolean;
};

export async function loadState(): Promise<PersistedState | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as PersistedState;
    // A stale shape is worse than a fresh start — drop it rather than crash
    // deep inside a screen on a missing field.
    if (parsed?.version !== 1 || !Array.isArray(parsed.recipes)) return null;
    return parsed;
  } catch {
    return null;
  }
}

let pending: ReturnType<typeof setTimeout> | null = null;

/**
 * Debounced write. State changes land in bursts (typing in the editor, checking
 * off groceries), and there's no value in a disk write per keystroke.
 */
export function saveState(state: PersistedState) {
  if (pending) clearTimeout(pending);
  pending = setTimeout(() => {
    AsyncStorage.setItem(KEY, JSON.stringify(state)).catch(() => {
      // Storage being full or unavailable shouldn't take the app down; the
      // user simply loses persistence for this session.
    });
  }, 400);
}

export async function clearState() {
  if (pending) clearTimeout(pending);
  await AsyncStorage.removeItem(KEY).catch(() => {});
}
