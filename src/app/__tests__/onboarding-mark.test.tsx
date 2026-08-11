import { render } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import TabsLayout from '@/app/(tabs)/_layout';

/**
 * The other half of not replaying the intro: something has to record that it
 * was completed. Reading the flag correctly is worthless if nothing ever
 * writes it — the app would simply replay the intro forever, which is the
 * original bug wearing a flag.
 *
 * Reaching the tabs is the moment that counts, rather than any particular
 * button, because the intro has several exits (the notification primer, the
 * paywall's close button, a deep link straight into a tab).
 */

const mockMarkOnboarded = jest.fn(async () => {});
jest.mock('@/lib/onboarding', () => ({
  markOnboarded: () => mockMarkOnboarded(),
}));

// The real Tabs navigator needs a navigation container; TabsLayout's own
// behaviour is all that is under test here, so stand it down to its children.
jest.mock('expo-router/js-tabs', () => {
  function Tabs({ children }: { children?: ReactNode }) {
    return children ?? null;
  }
  Tabs.Screen = function TabsScreen() {
    return null;
  };
  return { Tabs };
});

jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

beforeEach(() => jest.clearAllMocks());

describe('reaching the tabs', () => {
  it('records that the intro has been completed', async () => {
    await render(<TabsLayout />);

    expect(mockMarkOnboarded).toHaveBeenCalledTimes(1);
  });

  it('does not re-record on every re-render', async () => {
    const view = await render(<TabsLayout />);
    await view.rerender(<TabsLayout />);
    await view.rerender(<TabsLayout />);

    expect(mockMarkOnboarded).toHaveBeenCalledTimes(1);
  });
});
