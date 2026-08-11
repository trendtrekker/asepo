import { render, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';

import type { Recipe } from '@/data/sample';
import type { LocalSnapshot, RemoteDataCheck } from '@/lib/sync';
import { AppStoreProvider, useStore } from '@/store/app-store';

/**
 * Signing out has to take the account's data off the device.
 *
 * Two separate failures hang on this. The visible one is the next person
 * opening the app onto someone else's recipes. The worse one is silent: a
 * brand-new account has nothing in the cloud, so the store's sign-in merge
 * takes the "push local up" branch — and whatever was left over from the
 * previous account gets written into the new one's Supabase rows for good.
 *
 * Names are `mock`-prefixed because jest hoists mock factories above these
 * declarations and only allows out-of-scope references matching that prefix.
 */

let mockUser: { id: string } | null = null;
jest.mock('@/store/auth-store', () => ({
  useAuth: () => ({ user: mockUser, loading: false }),
}));

/**
 * Every factory below reaches its spy through a wrapper rather than handing
 * the spy over directly: jest hoists these above the `const`s, so a direct
 * reference is read while still in its temporal dead zone and the mocked
 * export lands as undefined.
 */

let mockSavedState: unknown = null;
const mockClearState = jest.fn(async () => {});
jest.mock('@/lib/storage', () => ({
  loadState: async () => mockSavedState,
  saveState: jest.fn(),
  clearState: () => mockClearState(),
}));

const mockHasRemoteData = jest.fn(async (_userId: string): Promise<RemoteDataCheck> => 'empty');
const mockPullRemoteState = jest.fn(async (_userId: string): Promise<LocalSnapshot | null> => null);
const mockPushLocalState = jest.fn(async (_userId: string, _snapshot: LocalSnapshot) => {});
jest.mock('@/lib/sync', () => ({
  hasRemoteData: (userId: string) => mockHasRemoteData(userId),
  pullRemoteState: (userId: string) => mockPullRemoteState(userId),
  pushLocalState: (userId: string, snapshot: LocalSnapshot) => mockPushLocalState(userId, snapshot),
}));

jest.mock('@/lib/api', () => ({ api: { listRecipes: async () => [] } }));
jest.mock('@/lib/plan-notifications', () => ({ reconcilePlanNotifications: jest.fn() }));

/** Only the fields these assertions touch — the store stores recipes verbatim. */
const recipe = (id: string, title: string) =>
  ({ id, title, favorite: false, cookbooks: [] }) as unknown as Recipe;

const savedStateFor = (title: string) => ({
  version: 1 as const,
  recipes: [recipe('r1', title)],
  cookbooks: [],
  favorites: {},
  grocery: [],
  plan: [],
  onboarding: {},
  importsUsed: 2,
  isPro: true,
  profileName: 'Ada',
  aiConsentGiven: true,
  recentSearches: ['ragu'],
});

function Probe() {
  const { recipes, profileName } = useStore();
  return (
    <>
      {recipes.map((r) => (
        <Text key={r.id}>{r.title}</Text>
      ))}
      <Text>{`name:${profileName}`}</Text>
    </>
  );
}

const tree = () => (
  <AppStoreProvider>
    <Probe />
  </AppStoreProvider>
);

/**
 * These wait on hydration and a round of async merge work, both of which run
 * on real timers. The default 1s is comfortable in isolation and not at all
 * comfortable when jest is running seven suites in parallel on a loaded
 * machine — where these suites have been observed taking six times as long.
 * A long ceiling costs nothing on a passing run.
 */
const PATIENTLY = { timeout: 15_000 };

beforeEach(() => {
  jest.clearAllMocks();
  mockUser = null;
  mockSavedState = null;
  mockHasRemoteData.mockResolvedValue('empty');
  mockPullRemoteState.mockResolvedValue(null);
});

describe('signing out', () => {
  it('takes the account’s data off the device', async () => {
    mockSavedState = savedStateFor('Ada’s Ragu');
    mockUser = { id: 'user-a' };

    const view = await render(tree());
    await waitFor(() => expect(view.getByText('Ada’s Ragu')).toBeTruthy(), PATIENTLY);
    expect(view.getByText('name:Ada')).toBeTruthy();

    mockUser = null;
    await view.rerender(tree());

    await waitFor(() => expect(view.queryByText('Ada’s Ragu')).toBeNull(), PATIENTLY);
    expect(view.getByText('name:')).toBeTruthy();
    // Cleared on disk too — not just in memory, or a relaunch restores it.
    expect(mockClearState).toHaveBeenCalled();
  });

  it('does not leave the previous account’s recipes to be pushed into the next one', async () => {
    mockSavedState = savedStateFor('Ada’s Ragu');
    mockUser = { id: 'user-a' };

    const view = await render(tree());
    await waitFor(() => expect(view.getByText('Ada’s Ragu')).toBeTruthy(), PATIENTLY);

    mockUser = null;
    await view.rerender(tree());
    await waitFor(() => expect(view.queryByText('Ada’s Ragu')).toBeNull(), PATIENTLY);

    // A different person signs in on the same handset. Nothing of theirs is in
    // the cloud, so the store migrates what's on the device up to their account.
    mockUser = { id: 'user-b' };
    await view.rerender(tree());

    await waitFor(() => expect(mockPushLocalState).toHaveBeenCalled(), PATIENTLY);
    const [userId, snapshot] = mockPushLocalState.mock.calls.at(-1)!;
    expect(userId).toBe('user-b');
    expect(snapshot.recipes).toEqual([]);
    expect(snapshot.profile.profileName).toBe('');
    expect(snapshot.profile.isPro).toBe(false);
  });

  it('leaves a guest who was never signed in holding their own library', async () => {
    // Cold start with no session looks identical to a sign-out from the outside
    // — both are `user === null` — but there is nothing here to clear.
    mockSavedState = savedStateFor('Guest Ragu');

    const view = await render(tree());

    await waitFor(() => expect(view.getByText('Guest Ragu')).toBeTruthy(), PATIENTLY);
    expect(mockClearState).not.toHaveBeenCalled();
  });

  it('keeps the data of someone whose session simply took a moment to load', async () => {
    mockSavedState = savedStateFor('Ada’s Ragu');

    // First paint has no user yet — auth is still resolving from storage.
    const view = await render(tree());
    await waitFor(() => expect(view.getByText('Ada’s Ragu')).toBeTruthy(), PATIENTLY);

    mockUser = { id: 'user-a' };
    await view.rerender(tree());

    expect(view.getByText('Ada’s Ragu')).toBeTruthy();
    expect(mockClearState).not.toHaveBeenCalled();
  });
});
