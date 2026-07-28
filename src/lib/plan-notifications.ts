import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { Recipe } from '@/data/sample';
import { addDays, fromIso, todayIso } from '@/lib/dates';
import { ensureChannel, ensureNotificationPermission } from '@/lib/notification-permissions';
import type { MealSlot, PlanEntry } from '@/store/app-store';

/**
 * Meal-plan reminders — a morning summary of the day's planned meals, plus a
 * heads-up shortly before each one. PlanEntry only stores which slot a meal
 * is in (Breakfast/Lunch/Dinner/Snack), not a clock time, so SLOT_TIME below
 * is the one place that invents one, purely to time the "before the meal"
 * nudge — it's never shown to the user or stored anywhere.
 */

const CHANNEL_ID = 'plan-reminders';
const LOOKAHEAD_DAYS = 3;
const SUMMARY_TIME = { hour: 7, minute: 30 };
const MINUTES_BEFORE_MEAL = 45;
const SLOT_TIME: Record<MealSlot, { hour: number; minute: number }> = {
  Breakfast: { hour: 8, minute: 0 },
  Lunch: { hour: 12, minute: 0 },
  Dinner: { hour: 18, minute: 0 },
  Snack: { hour: 15, minute: 0 },
};

function isPlanNotification(n: Notifications.NotificationRequest): boolean {
  const kind = n.content.data?.kind;
  return typeof kind === 'string' && kind.startsWith('plan-');
}

/**
 * Fully re-derives every scheduled plan reminder from current data. Cancels
 * everything previously scheduled under the 'plan-' tag — including from a
 * prior app session, since local notifications persist natively across
 * restarts and can't be tracked by an in-memory id list — then reschedules
 * fresh ones for the next few days. Call this on app launch and whenever
 * `plan` or `recipes` changes, so an edited or removed entry, or a day
 * simply rolling over, can't leave a stale reminder behind.
 */
export async function reconcilePlanNotifications(plan: PlanEntry[], recipes: Recipe[]): Promise<void> {
  if (Platform.OS === 'web') return;

  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(
      scheduled
        .filter(isPlanNotification)
        .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier))
    );

    if (!plan.length) return;
    if (!(await ensureNotificationPermission())) return;
    await ensureChannel(CHANNEL_ID, 'Meal plan reminders');

    const recipeTitle = (id: string) => recipes.find((r) => r.id === id)?.title ?? 'a recipe';
    const now = new Date();
    const today = todayIso();

    for (let i = 0; i < LOOKAHEAD_DAYS; i++) {
      const dayIso = addDays(today, i);
      const dayEntries = plan.filter((e) => e.date === dayIso);
      if (!dayEntries.length) continue;

      const d = fromIso(dayIso);

      const summaryAt = new Date(d.getFullYear(), d.getMonth(), d.getDate(), SUMMARY_TIME.hour, SUMMARY_TIME.minute);
      if (summaryAt > now) {
        const names = dayEntries.map((e) => `${recipeTitle(e.recipeId)} (${e.slot.toLowerCase()})`);
        await Notifications.scheduleNotificationAsync({
          content: {
            title: dayEntries.length === 1 ? "Today's meal" : `${dayEntries.length} meals planned today`,
            body: names.join(', '),
            sound: true,
            data: { kind: 'plan-summary' },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: summaryAt,
            channelId: CHANNEL_ID,
          },
        });
      }

      for (const entry of dayEntries) {
        const slotTime = SLOT_TIME[entry.slot];
        const mealAt = new Date(d.getFullYear(), d.getMonth(), d.getDate(), slotTime.hour, slotTime.minute);
        const remindAt = new Date(mealAt.getTime() - MINUTES_BEFORE_MEAL * 60_000);
        if (remindAt <= now) continue;

        await Notifications.scheduleNotificationAsync({
          content: {
            title: `${entry.slot} in ${MINUTES_BEFORE_MEAL} min`,
            body: recipeTitle(entry.recipeId),
            sound: true,
            data: { kind: 'plan-meal' },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: remindAt,
            channelId: CHANNEL_ID,
          },
        });
      }
    }
  } catch {
    // Reminders are additive, not load-bearing — a scheduling hiccup
    // shouldn't be visible to the user.
  }
}
