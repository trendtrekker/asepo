import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

/**
 * Real, background-capable alerts for the Cook Mode step timer. Before this,
 * "done" was only a toast plus a live countdown in the interval — both
 * silently do nothing the moment the app is backgrounded or the phone locks,
 * which is exactly when you'd walk away from something on the stove. Local
 * notifications (not push) work fine in Expo Go on SDK 57, so this needs no
 * dev-client build.
 *
 * Every function here fails soft: notifications are additive on top of the
 * in-app countdown, not load-bearing, so a permission denial or scheduling
 * error should never break the timer itself.
 */

const CHANNEL_ID = 'cook-timer';
let channelReady = false;

async function ensureChannel() {
  if (channelReady || Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Cooking timers',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
  });
  channelReady = true;
}

async function ensurePermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const current = await Notifications.getPermissionsAsync();
  if (current.status === 'granted') return true;
  // Don't re-prompt every single time a timer starts once the user has said no.
  if (current.status === 'denied' && !current.canAskAgain) return false;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.status === 'granted';
}

/** Schedules the "done" alert; returns the notification id to cancel it, or null if it couldn't be scheduled. */
export async function scheduleTimerDone(
  recipeTitle: string,
  stepLabel: string,
  seconds: number
): Promise<string | null> {
  if (Platform.OS === 'web' || seconds <= 0) return null;
  try {
    await ensureChannel();
    if (!(await ensurePermission())) return null;
    return await Notifications.scheduleNotificationAsync({
      content: {
        title: `${stepLabel} timer done`,
        body: recipeTitle,
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds,
        channelId: CHANNEL_ID,
      },
    });
  } catch {
    return null;
  }
}

export async function cancelTimerNotification(id: string | null) {
  if (!id || Platform.OS === 'web') return;
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch {
    // Already fired or already gone — nothing to do.
  }
}
