import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';

import type { Recipe } from '@/data/sample';
import type { LocalSnapshot, RemoteDataCheck } from '@/lib/sync';
import { AppStoreProvider, useStore, type Onboarding } from '@/store/app-store';

/**
 * The sign-in merge, and specifically what it does when the cloud can't be
 * read.
 *
 * This is a destructive decision dressed up as a read: choosing "migrate this
 * device up" runs replaceTable, which deletes every remote row the local copy
 * doesn't have. So a device that failed to find out what the account holds
 * must not act — pushing on a failed check, or on a failed pull, replaces a
 * full account with whatever the handset happened to have, which on a fresh
 * install is nothing at all.
 *
 * Names are `mock`-prefixed for jest's hoisting rule, and every factory
 * reaches its spy through a wrapper so the reference is resolved at call time
 * rather than while the `const` is still in its temporal dead zone.
 */

let mockUser: { id: string } | null = null;
jest.mock('@/store/auth-store', () => ({
  useAuth: () => ({ user: mockUser, loading: false }),
}));

let mockSavedState: unknown = null;
jest.mock('@/lib/storage', () => ({
  loadState: async () => mockSavedState,
  saveState: jest.fn(),
  clearState: jest.fn(async () => {}),
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

const onboarding: Onboarding = {
  goals: {},
  diet: 'None',
  allergies: {},
  customAllergies: [],
  peopleCount: 2,
};

const savedStateWith = (title: string) => ({
  version: 1 as const,
  recipes: [recipe('local-1', title)],
  cookbooks: [],
  favorites: {},
  grocery: [],
  plan: [],
  onboarding,
  importsUsed: 0,
  isPro: false,
  profileName: 'Ada',
  aiConsentGiven: false,
  recentSearches: [],
});

const cloudSnapshot = (title: string): LocalSnapshot => ({
  recipes: [recipe('cloud-1', title)],
  cookbooks: [],
  grocery: [],
  plan: [],
  profile: { profileName: 'Ada in the cloud', onboarding, isPro: false, importsUsed: 0 },
});

function Probe() {
  const { recipes, addRecipe } = useStore();
  return (
    <>
      {recipes.map((r) => (
        <Text key={r.id}>{r.title}</Text>
      ))}
      {/* Stands in for any ordinary edit, which is what wakes the debounced
          push — the merge marking itself reconciled is only the loaded gun. */}
      <Text onPress={() => addRecipe(recipe('local-2', 'Added after'))}>edit something</Text>
    </>
  );
}

const tree = () => (
  <AppStoreProvider>
    <Probe />
  </AppStoreProvider>
);

/**
 * Real timers throughout, and under a loaded jest these suites have been seen
 * running six times slower than in isolation — so every wait here is given a
 * ceiling far above what it needs. A long ceiling costs nothing when passing.
 */
const PATIENTLY = { timeout: 15_000 };

/**
 * Waits for the merge to have actually asked the cloud, rather than sleeping a
 * guessed interval. The assertions that follow are negative ones ("did not
 * push"), and a fixed sleep that ran out early would satisfy them by testing
 * nothing at all.
 */
const afterFirstAttempt = async () => {
  await waitFor(() => expect(mockHasRemoteData).toHaveBeenCalled(), PATIENTLY);
  // Let that attempt finish resolving before judging what it did.
  await new Promise((r) => setTimeout(r, 300));
};

beforeEach(() => {
  jest.clearAllMocks();
  mockUser = null;
  mockSavedState = null;
  mockHasRemoteData.mockResolvedValue('empty');
  mockPullRemoteState.mockResolvedValue(null);
});

describe('when the cloud cannot be read', () => {
  it('does not overwrite the account after a check that failed', async () => {
    // The dangerous shape: a device holding almost nothing, signing in to an
    // account that may well be full. Reading 'unknown' as 'empty' is what used
    // to turn that into a delete.
    mockSavedState = savedStateWith('On this phone');
    mockHasRemoteData.mockResolvedValue('unknown');
    mockUser = { id: 'user-a' };

    await render(tree());
    await afterFirstAttempt();

    expect(mockPushLocalState).not.toHaveBeenCalled();
    // Nor does it guess in the other direction and pull.
    expect(mockPullRemoteState).not.toHaveBeenCalled();
  });

  it('does not overwrite the account after a pull that failed', async () => {
    // Same danger through the other door: the check succeeded and said there
    // IS data, then fetching it failed. Marking that reconciled opened the
    // ongoing push, which would go on to delete what it had just failed to
    // read. The push is debounced off local changes rather than fired by the
    // merge itself, so the damage lands on the user's next ordinary edit —
    // which is what this presses.
    mockSavedState = savedStateWith('On this phone');
    mockHasRemoteData.mockResolvedValue('has-data');
    mockPullRemoteState.mockResolvedValue(null);
    mockUser = { id: 'user-a' };

    const view = await render(tree());
    await afterFirstAttempt();

    await fireEvent.press(view.getByText('edit something'));
    await new Promise((r) => setTimeout(r, 2500));

    expect(mockPushLocalState).not.toHaveBeenCalled();
    // The device keeps working on its own copy meanwhile.
    expect(view.getByText('On this phone')).toBeTruthy();
    expect(view.getByText('Added after')).toBeTruthy();
  });

  it('recovers once a retry gets an answer', async () => {
    mockSavedState = savedStateWith('On this phone');
    mockHasRemoteData
      .mockResolvedValueOnce('unknown')
      .mockResolvedValueOnce('empty');
    mockUser = { id: 'user-a' };

    await render(tree());

    await waitFor(() => expect(mockPushLocalState).toHaveBeenCalled(), PATIENTLY);
    const [, snapshot] = mockPushLocalState.mock.calls.at(-1)!;
    expect(snapshot.recipes.map((r) => r.title)).toEqual(['On this phone']);
  }, 30000);
});

describe('when the cloud answers', () => {
  it('migrates the device up to a genuinely empty account', async () => {
    mockSavedState = savedStateWith('On this phone');
    mockHasRemoteData.mockResolvedValue('empty');
    mockUser = { id: 'user-a' };

    await render(tree());

    await waitFor(() => expect(mockPushLocalState).toHaveBeenCalledTimes(1), PATIENTLY);
    const [userId, snapshot] = mockPushLocalState.mock.calls.at(-1)!;
    expect(userId).toBe('user-a');
    expect(snapshot.recipes.map((r) => r.title)).toEqual(['On this phone']);
  });

  it('pulls an account that already has data down onto the device', async () => {
    mockSavedState = savedStateWith('On this phone');
    mockHasRemoteData.mockResolvedValue('has-data');
    mockPullRemoteState.mockResolvedValue(cloudSnapshot('In the cloud'));
    mockUser = { id: 'user-a' };

    const view = await render(tree());

    await waitFor(() => expect(view.getByText('In the cloud')).toBeTruthy(), PATIENTLY);
    expect(view.queryByText('On this phone')).toBeNull();
    expect(mockPushLocalState).not.toHaveBeenCalled();
  });
});
