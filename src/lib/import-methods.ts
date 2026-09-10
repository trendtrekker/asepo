/** The distinct ways a recipe can enter the app from "Add a recipe". */
export const ALL_IMPORT_METHODS = ['url', 'scan', 'library', 'paste', 'idea', 'suggest'] as const;
export type ImportMethodId = (typeof ALL_IMPORT_METHODS)[number];

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
  freeAccessExpired?: boolean;
}): ImportGateResult {
  // Guests and signed-in free accounts may use every import method. Their
  // shared allowance is enforced by the persisted importsUsed counter.
  if (!opts.isPro && (opts.freeAccessExpired || opts.importsUsed >= opts.importLimit)) return 'count';
  return null;
}
