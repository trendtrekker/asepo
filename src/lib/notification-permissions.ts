import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

/**
 * Shared by every feature that schedules a local notification (the Cook Mode
 * timer, meal-plan reminders) — one permission prompt, one Android channel
 * setup per channel id, not duplicated per feature.
 */

const readyChannels = new Set<string>();

export async function ensureChannel(id: string, name: string) {
  if (Platform.OS !== 'android' || readyChannels.has(id)) return;
  await Notifications.setNotificationChannelAsync(id, {
    name,
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
  });
  readyChannels.add(id);
}

export async function ensureNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const current = await Notifications.getPermissionsAsync();
  if (current.status === 'granted') return true;
  // Don't re-prompt every time a feature wants to schedule something once the user has said no.
  if (current.status === 'denied' && !current.canAskAgain) return false;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.status === 'granted';
}
