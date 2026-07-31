import { safeBack } from '@/lib/navigation';

/**
 * safeBack exists because router.back() throws "GO_BACK was not handled" when
 * there's nothing to pop — reachable from any deep link or notification tap.
 * These lock in that it only falls back when history is genuinely absent, and
 * never overrides a normal back.
 */
function fakeRouter(canGoBack: boolean) {
  return {
    canGoBack: () => canGoBack,
    back: jest.fn(),
    replace: jest.fn(),
  };
}

describe('safeBack', () => {
  it('pops history when there is something to pop', () => {
    const router = fakeRouter(true);
    safeBack(router as never, '/(tabs)/recipes');

    expect(router.back).toHaveBeenCalledTimes(1);
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('replaces with the fallback when there is no history', () => {
    const router = fakeRouter(false);
    safeBack(router as never, '/(tabs)/recipes');

    expect(router.back).not.toHaveBeenCalled();
    expect(router.replace).toHaveBeenCalledWith('/(tabs)/recipes');
  });

  it('passes an object route through to replace untouched', () => {
    const router = fakeRouter(false);
    const fallback = { pathname: '/recipe/[id]' as const, params: { id: 'r-1' } };
    safeBack(router as never, fallback);

    expect(router.replace).toHaveBeenCalledWith(fallback);
  });
});
