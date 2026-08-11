import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

/**
 * What a notification does when it arrives while the app is open.
 *
 * expo-notifications shows nothing in the foreground unless a handler says to:
 * "the default behavior when the handler is not set or does not respond in
 * time is not to show the notification" (SDK 57). Nothing set one, which
 * quietly cost the cook timer the exact case it exists for — you are stood at
 * the hob with the step on screen, the timer fires, and no banner and no sound
 * arrive. The background-capable alert timer-notifications.ts goes to the
 * trouble of scheduling only ever appeared if you had already left the app.
 *
 * Called at module scope from the root layout, because a notification that
 * arrives before a handler is registered is discarded rather than queued.
 */
export function configureNotificationHandler() {
  // Same guard as every other notification path here — there are no local
  // notifications on web, and this is the one call that would run at import.
  if (Platform.OS === 'web') return;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      // Together these are what "show it" now means: SDK 53 split the old
      // shouldShowAlert into the transient banner and the Notification Center
      // entry, and shouldShowAlert is deprecated. Both, so an alert missed
      // while the phone was face down is still there to find.
      shouldShowBanner: true,
      shouldShowList: true,
      // A timer going off across the kitchen is precisely the thing you need
      // to hear rather than see, and every notification this app schedules
      // already asks for sound in its own content.
      shouldPlaySound: true,
      // Deliberately not badging: no screen in the app displays or clears a
      // badge, so setting one would leave a count on the icon that the user
      // has no way to get rid of.
      shouldSetBadge: false,
    }),
  });
}
