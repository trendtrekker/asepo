/**
 * That the root layout actually registers the foreground handler.
 *
 * notification-presentation.test.ts proves the handler behaves correctly once
 * registered; this proves anything registers it. Without the call the module
 * is dead code and foreground notifications go back to being silently
 * swallowed — the original bug, with a correct-looking helper sat beside it.
 *
 * Importing the layout is the whole test: the call is at module scope, so the
 * import alone fires it, and it must be, because a notification arriving
 * before a handler exists is discarded rather than queued.
 */

const mockConfigure = jest.fn();
jest.mock('@/lib/notification-presentation', () => ({
  configureNotificationHandler: () => mockConfigure(),
}));

// The layout pulls in the whole provider stack and the navigator. None of it
// is under test here — only the module-scope call is — so it is all stood
// down to the minimum that lets the module load.
jest.mock('expo-router', () => ({ Stack: Object.assign(() => null, { Screen: () => null }) }));
jest.mock('expo-status-bar', () => ({ StatusBar: () => null }));
jest.mock('react-native-gesture-handler', () => ({ GestureHandlerRootView: () => null }));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaProvider: () => null }));
jest.mock('@/components/toast', () => ({ ToastProvider: () => null }));
jest.mock('@/store/app-store', () => ({ AppStoreProvider: () => null }));
jest.mock('@/store/auth-store', () => ({ AuthProvider: () => null }));
jest.mock('@/theme/theme-context', () => ({
  AsepoThemeProvider: () => null,
  useTheme: () => ({ colors: { bg: '#000' }, isDark: true }),
}));

describe('the root layout', () => {
  it('registers the foreground notification handler on load', () => {
    // require, not import(): jest runs these as CJS, where a dynamic import
    // needs --experimental-vm-modules, and a static import would be hoisted
    // above the jest.mock calls above — which is the point of loading it here.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('@/app/_layout');

    expect(mockConfigure).toHaveBeenCalledTimes(1);
  });
});
