import { fireEvent, render, waitFor } from '@testing-library/react-native';

import SplashScreen from '@/app/index';
import { AsepoThemeProvider } from '@/theme/theme-context';

/**
 * Where the splash hands off.
 *
 * It used to go to /welcome unconditionally, so every cold launch replayed the
 * whole intro — carousel, quiz, sign-in, paywall, notification primer — at
 * someone who had been using the app for weeks.
 *
 * Names are `mock`-prefixed because jest hoists mock factories above these
 * declarations and only allows out-of-scope references matching that prefix.
 */

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

const mockHasOnboarded = jest.fn(async () => false);
jest.mock('@/lib/onboarding', () => ({
  hasOnboarded: () => mockHasOnboarded(),
}));

const renderSplash = () =>
  render(
    <AsepoThemeProvider>
      <SplashScreen />
    </AsepoThemeProvider>
  );

/** The splash deliberately holds ~1.6s before handing off. */
const PATIENTLY = { timeout: 15_000 };

// That hold, plus first-render cost, puts these past jest's 5s default — and
// the ceiling above is worthless if the test itself times out underneath it.
jest.setTimeout(30_000);

/** Long enough for the storage read to have resolved into state, far short of
 *  SPLASH_MS — so a navigation seen after this came from the tap, not the hold. */
const afterTheAnswerArrives = async () => {
  await waitFor(() => expect(mockHasOnboarded).toHaveBeenCalled(), PATIENTLY);
  await new Promise((r) => setTimeout(r, 50));
};

beforeEach(() => {
  jest.clearAllMocks();
  mockHasOnboarded.mockResolvedValue(false);
});

describe('handing off from the splash', () => {
  it('sends someone who has been here before straight into the app', async () => {
    mockHasOnboarded.mockResolvedValue(true);

    await renderSplash();

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/(tabs)/home'), PATIENTLY);
    expect(mockReplace).not.toHaveBeenCalledWith('/welcome');
  });

  it('sends a first launch to the intro', async () => {
    mockHasOnboarded.mockResolvedValue(false);

    await renderSplash();

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/welcome'), PATIENTLY);
  });

  it('holds the splash briefly rather than navigating on the first frame', async () => {
    mockHasOnboarded.mockResolvedValue(true);

    await renderSplash();

    // The storage read resolves almost immediately here; the hold is what
    // keeps the fade from being cut off part-way through.
    expect(mockReplace).not.toHaveBeenCalled();
  });
});

describe('tapping to skip the wait', () => {
  it('still respects where the tapper should be going', async () => {
    // Tapping used to be hardcoded to /welcome, which would have put an
    // impatient returning user back into the intro — the same bug by hand.
    mockHasOnboarded.mockResolvedValue(true);

    const view = await renderSplash();
    await afterTheAnswerArrives();
    expect(mockReplace).not.toHaveBeenCalled(); // the hold is still running

    await fireEvent.press(view.getByText('Asepo'));

    // No waiting: the hold has not elapsed, so this navigation is the tap's.
    expect(mockReplace).toHaveBeenCalledWith('/(tabs)/home');
    expect(mockReplace).not.toHaveBeenCalledWith('/welcome');
  });

  it('ignores a tap that lands before the answer does', async () => {
    // Never resolves, standing in for storage being slow.
    mockHasOnboarded.mockReturnValue(new Promise(() => {}) as Promise<boolean>);

    const view = await renderSplash();
    await fireEvent.press(view.getByText('Asepo'));

    // Better to sit on the splash a moment longer than to guess wrong.
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
