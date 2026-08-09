/**
 * The distinct ways a recipe can enter the app from "Add a recipe" — the URL
 * field plus each tile. Free (signed-in, non-Pro) accounts get exactly one of
 * these, picked per-account rather than per-visit so it doesn't change under
 * someone between sessions.
 */
export const ALL_IMPORT_METHODS = ['url', 'scan', 'library', 'paste', 'idea', 'suggest'] as const;
export type ImportMethodId = (typeof ALL_IMPORT_METHODS)[number];

/**
 * Deterministic per-user pick — a simple string hash, not real randomness,
 * so the same account always lands on the same method instead of it
 * reshuffling every time the store re-evaluates.
 */
export function pickUnlockedMethod(userId: string): ImportMethodId {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) >>> 0;
  }
  return ALL_IMPORT_METHODS[hash % ALL_IMPORT_METHODS.length];
}

export type ImportGateResult = 'signin' | 'locked' | 'count' | null;

/**
 * The single check every import entry point runs before doing anything —
 * opening a picker, spending a network call, or leaving the device. Checked
 * both in the "Add a recipe" sheet (so locked tiles never even open) and
 * again in each destination screen (so a deep link can't skip the sheet's
 * gating).
 */
export function importGate(opts: {
  method: ImportMethodId;
  isSignedIn: boolean;
  /** 'all' for Pro, a specific method for a free account, null for a guest. */
  unlockedMethod: ImportMethodId | 'all' | null;
  isPro: boolean;
  importsUsed: number;
  importLimit: number;
}): ImportGateResult {
  if (!opts.isSignedIn) return 'signin';
  if (opts.unlockedMethod !== 'all' && opts.unlockedMethod !== opts.method) return 'locked';
  if (!opts.isPro && opts.importsUsed >= opts.importLimit) return 'count';
  return null;
}
