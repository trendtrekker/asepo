import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Whether this device has already been through the intro — the welcome
 * carousel, the taste quiz, sign-in, the paywall, the notification primer.
 *
 * Kept in its own key rather than in lib/storage.ts's state blob, because the
 * two have different lifetimes. That blob is wiped when someone signs out, and
 * being reintroduced to an app you have used for months, purely because you
 * signed out of it, is its own bug. Same reasoning as the theme mode, which
 * lives in its own key for the same reason.
 *
 * Reads default to "already onboarded" when storage is unreadable. Between the
 * two possible mistakes — briefly showing the intro to someone who has seen it,
 * or dropping a first-time user straight into an empty app with no explanation
 * — only the second is unrecoverable, but the first is the one that had this
 * flow replaying on every single launch. A returning user is by far the more
 * common case, so that is the one to favour when we genuinely cannot tell.
 */

const KEY = 'asepo:onboarded:v1';

export async function hasOnboarded(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(KEY)) === 'true';
  } catch {
    return true;
  }
}

export async function markOnboarded(): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, 'true');
  } catch {
    // Worst case the intro shows once more next launch — not worth surfacing.
  }
}

/** Only for "Reset all data", which promises the state of a fresh install. */
export async function clearOnboarded(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    // Same again: nothing here is worth failing the reset over.
  }
}
