import { Platform } from 'react-native';

import { configureNotificationHandler } from '@/lib/notification-presentation';

/**
 * Whether a notification is visible when it arrives with the app already open.
 *
 * The cook timer is the case that matters: you are at the hob with the step on
 * screen, so the app is in the foreground, and that is exactly the state in
 * which expo-notifications shows nothing at all unless a handler says to. With
 * no handler registered the timer's alert simply never appeared — the one
 * moment it was written for.
 *
 * Names are `mock`-prefixed because jest hoists mock factories above these
 * declarations and only allows out-of-scope references matching that prefix.
 */

const mockSetNotificationHandler = jest.fn();
jest.mock('expo-notifications', () => ({
  setNotificationHandler: (handler: unknown) => mockSetNotificationHandler(handler),
}));

type Handler = { handleNotification: () => Promise<Record<string, unknown>> };

/** The behaviour the registered handler reports for an incoming notification. */
const registeredBehaviour = async () => {
  const [handler] = mockSetNotificationHandler.mock.calls.at(-1) as [Handler];
  return handler.handleNotification();
};

beforeEach(() => jest.clearAllMocks());

describe('foreground notifications', () => {
  it('registers a handler at all, which is the whole bug', () => {
    configureNotificationHandler();

    expect(mockSetNotificationHandler).toHaveBeenCalledTimes(1);
  });

  it('shows the alert and plays its sound', async () => {
    configureNotificationHandler();

    const behaviour = await registeredBehaviour();
    expect(behaviour.shouldShowBanner).toBe(true);
    expect(behaviour.shouldPlaySound).toBe(true);
  });

  it('leaves the alert in Notification Center for anything missed', async () => {
    configureNotificationHandler();

    expect((await registeredBehaviour()).shouldShowList).toBe(true);
  });

  it('does not badge the icon, since nothing in the app can clear one', async () => {
    configureNotificationHandler();

    expect((await registeredBehaviour()).shouldSetBadge).toBe(false);
  });

  it('answers with the fields this SDK requires, not the deprecated one', async () => {
    // shouldShowAlert was split into banner/list and deprecated; a handler
    // still returning only the old field shows nothing on a current SDK.
    configureNotificationHandler();

    expect(Object.keys(await registeredBehaviour()).sort()).toEqual([
      'shouldPlaySound',
      'shouldSetBadge',
      'shouldShowBanner',
      'shouldShowList',
    ]);
  });
});

describe('on web', () => {
  it('stands down, since there are no local notifications there', () => {
    const original = Platform.OS;
    Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true });

    try {
      configureNotificationHandler();
      expect(mockSetNotificationHandler).not.toHaveBeenCalled();
    } finally {
      Object.defineProperty(Platform, 'OS', { value: original, configurable: true });
    }
  });
});
