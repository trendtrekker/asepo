import { fireEvent, render } from '@testing-library/react-native';
import type { ReactElement } from 'react';

import AiConsent from '@/app/ai-consent';
import { AsepoThemeProvider } from '@/theme/theme-context';

/**
 * This screen is a privacy guarantee, not decoration: nothing reaches kie.ai
 * until someone accepts here. The behaviour that matters is which answer sets
 * consent and where each entry point returns to — declining from an import
 * must also drop the queued source, or the next screen would send it anyway.
 *
 * Names are `mock`-prefixed because jest hoists mock factories above these
 * declarations and only allows out-of-scope references matching that prefix.
 * `render` and `fireEvent` both return promises in RNTL 14, hence the awaits.
 */

const mockReplace = jest.fn();
const mockBack = jest.fn();
const mockPush = jest.fn();
let mockCanGoBack = true;
let mockParams: { from?: string } = {};

jest.mock('expo-router', () => ({
  useRouter: () => ({
    replace: mockReplace,
    back: mockBack,
    push: mockPush,
    canGoBack: () => mockCanGoBack,
  }),
  useLocalSearchParams: () => mockParams,
}));

const mockSetConsent = jest.fn();
const mockSetSource = jest.fn();
jest.mock('@/store/app-store', () => ({
  useStore: () => ({
    setAiConsentGiven: mockSetConsent,
    setPendingImportSource: mockSetSource,
  }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const renderScreen = (ui: ReactElement) => render(<AsepoThemeProvider>{ui}</AsepoThemeProvider>);

beforeEach(() => {
  jest.clearAllMocks();
  mockCanGoBack = true;
  mockParams = {};
});

describe('disclosure', () => {
  it('names the processor and every feature that sends data to it', async () => {
    const view = await renderScreen(<AiConsent />);

    // The screen previously promised imports only, while nutrition and
    // healthify shipped saved recipes to the same processor.
    expect(view.getAllByText(/kie\.ai/).length).toBeGreaterThan(0);
    expect(view.getByText(/Nutrition estimates and .Make it healthier./)).toBeTruthy();
    expect(view.getByText(/including for recipes you typed in yourself/)).toBeTruthy();
  });
});

describe('from the import flow (no `from` param)', () => {
  it('grants consent and resumes the import', async () => {
    const view = await renderScreen(<AiConsent />);
    await fireEvent.press(view.getByText('Continue'));

    expect(mockSetConsent).toHaveBeenCalledWith(true);
    expect(mockReplace).toHaveBeenCalledWith('/add/importing');
  });

  it('declining drops the queued source so nothing is left to send', async () => {
    const view = await renderScreen(<AiConsent />);
    await fireEvent.press(view.getByText('Not now'));

    expect(mockSetConsent).not.toHaveBeenCalled();
    expect(mockSetSource).toHaveBeenCalledWith(null);
    expect(mockReplace).toHaveBeenCalledWith('/add');
  });
});

describe('pushed from a screen still on the stack', () => {
  it.each(['settings', 'nutrition', 'healthify'])(
    'pops back after accepting from %s',
    async (from) => {
      mockParams = { from };
      const view = await renderScreen(<AiConsent />);
      await fireEvent.press(view.getByText('Turn on'));

      expect(mockSetConsent).toHaveBeenCalledWith(true);
      expect(mockBack).toHaveBeenCalledTimes(1);
      // Must not resume an import — there isn't one waiting.
      expect(mockReplace).not.toHaveBeenCalled();
    }
  );

  it('cancelling leaves consent untouched and keeps any queued source', async () => {
    mockParams = { from: 'settings' };
    const view = await renderScreen(<AiConsent />);
    await fireEvent.press(view.getByText('Cancel'));

    expect(mockSetConsent).not.toHaveBeenCalled();
    expect(mockSetSource).not.toHaveBeenCalled();
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('falls back to Profile when opened directly from settings with no history', async () => {
    mockParams = { from: 'settings' };
    mockCanGoBack = false;
    const view = await renderScreen(<AiConsent />);
    await fireEvent.press(view.getByText('Cancel'));

    expect(mockBack).not.toHaveBeenCalled();
    expect(mockReplace).toHaveBeenCalledWith('/profile');
  });

  it('falls back to the library for the recipe-screen entry points', async () => {
    mockParams = { from: 'nutrition' };
    mockCanGoBack = false;
    const view = await renderScreen(<AiConsent />);
    await fireEvent.press(view.getByText('Cancel'));

    expect(mockReplace).toHaveBeenCalledWith('/(tabs)/recipes');
  });
});
