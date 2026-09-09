import { ALL_IMPORT_METHODS, importGate } from '@/lib/import-methods';

describe('free import allowance', () => {
  it.each([false, true])('allows every method before the limit (signed in: %s)', (isSignedIn) => {
    for (const method of ALL_IMPORT_METHODS) {
      expect(
        importGate({ method, isSignedIn, unlockedMethod: null, isPro: false, importsUsed: 2, importLimit: 3 })
      ).toBeNull();
    }
  });

  it.each([false, true])('blocks every free method after three imports (signed in: %s)', (isSignedIn) => {
    for (const method of ALL_IMPORT_METHODS) {
      expect(
        importGate({ method, isSignedIn, unlockedMethod: null, isPro: false, importsUsed: 3, importLimit: 3 })
      ).toBe('count');
    }
  });

  it('keeps every method unlimited for Pro', () => {
    for (const method of ALL_IMPORT_METHODS) {
      expect(
        importGate({ method, isSignedIn: true, unlockedMethod: 'all', isPro: true, importsUsed: 99, importLimit: 3 })
      ).toBeNull();
    }
  });
});
