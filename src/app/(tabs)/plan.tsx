import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RecipeImage } from '@/components/recipe-image';
import { Screen } from '@/components/ui';
import { timeLabel } from '@/data/sample';
import { addDays, formatWeekRange, fromIso, startOfWeek, todayIso, weekdayShort } from '@/lib/dates';
import { MEAL_SLOTS, useStore } from '@/store/app-store';
import { useColors } from '@/theme/theme-context';

/**
 * Meal plan — a day-circle picker over a single day's meals in slot order,
 * fed by "Add to plan" on any recipe. Previously stacked all seven days in
 * one long scroll; this shows one day at a time, closer to how someone
 * actually checks "what's on today" rather than scanning a whole week.
 */
export default function Plan() {
  const c = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { plan, getRecipe, removeFromPlan } = useStore();
  // Coming from "Your week" on Home with a specific day tapped — land on
  // that day, not always today.
  const params = useLocalSearchParams<{ date?: string }>();
  const targetDate = typeof params.date === 'string' && params.date ? params.date : todayIso();

  const [weekStart, setWeekStart] = useState(() => startOfWeek(targetDate));
  const [selectedDate, setSelectedDate] = useState(targetDate);
  const today = todayIso();

  useEffect(() => {
    setWeekStart(startOfWeek(targetDate));
    setSelectedDate(targetDate);
  }, [targetDate]);

  const changeWeek = (deltaDays: number) => {
    const nextStart = addDays(weekStart, deltaDays);
    setWeekStart(nextStart);
    setSelectedDate(nextStart);
  };

  const dayEntries = plan.filter((e) => e.date === selectedDate);

  return (
    <Screen style={{ paddingTop: insets.top + 12 }}>
      <View style={{ paddingHorizontal: 20 }}>
        <Text style={{ fontSize: 30, fontWeight: '700', color: c.text, letterSpacing: -0.4 }}>
          Plan
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 }}>
          <Pressable
            onPress={() => changeWeek(-7)}
            accessibilityRole="button"
            accessibilityLabel="Previous week"
            style={{ padding: 4 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: c.textSec }}>‹</Text>
          </Pressable>
          <Text style={{ fontSize: 13, color: c.textSec, minWidth: 110, textAlign: 'center' }}>
            {formatWeekRange(weekStart)}
          </Text>
          <Pressable
            onPress={() => changeWeek(7)}
            accessibilityRole="button"
            accessibilityLabel="Next week"
            style={{ padding: 4 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: c.textSec }}>›</Text>
          </Pressable>
        </View>

        {/* Day picker — one circle per day of the visible week. */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 }}>
          {Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)).map((iso) => {
            const isSelected = iso === selectedDate;
            const isToday = iso === today;
            return (
              <Pressable
                key={iso}
                onPress={() => setSelectedDate(iso)}
                accessibilityRole="button"
                accessibilityLabel={`${weekdayShort(iso)} ${fromIso(iso).getDate()}`}
                style={{ alignItems: 'center', gap: 6, width: 36 }}>
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '600',
                    color: isSelected ? c.accent : c.textSec,
                  }}>
                  {weekdayShort(iso)[0]}
                </Text>
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: isSelected ? c.accent : 'transparent',
                    borderWidth: isToday && !isSelected ? 1.5 : 0,
                    borderColor: c.accent,
                  }}>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: '700',
                      color: isSelected ? '#fff' : c.text,
                    }}>
                    {fromIso(iso).getDate()}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 22, paddingBottom: 100 }}>
        {MEAL_SLOTS.map((slot, i) => {
          const entry = dayEntries.find((e) => e.slot === slot);
          const recipe = entry ? getRecipe(entry.recipeId) : undefined;
          const isLast = i === MEAL_SLOTS.length - 1;

          return (
            <View key={slot} style={{ flexDirection: 'row' }}>
              {/* Timeline rail — slot name stands in for a clock time, since
                  a plan entry doesn't carry one. */}
              <View style={{ width: 66, alignItems: 'flex-end' }}>
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '700',
                    color: c.textSec,
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                    marginTop: 14,
                  }}>
                  {slot}
                </Text>
              </View>
              <View style={{ alignItems: 'center', marginHorizontal: 12 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c.accent, marginTop: 16 }} />
                {!isLast ? <View style={{ width: 1, flex: 1, backgroundColor: c.border, marginTop: 4 }} /> : null}
              </View>

              <View style={{ flex: 1, paddingBottom: 22 }}>
                {recipe && entry ? (
                  <Pressable
                    onPress={() => router.push({ pathname: '/recipe/[id]', params: { id: recipe.id } })}
                    onLongPress={() => removeFromPlan(entry.id)}
                    accessibilityRole="button"
                    accessibilityHint="Long press to remove from plan"
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 12,
                      padding: 10,
                      borderRadius: 16,
                      backgroundColor: c.surface,
                      borderWidth: 1,
                      borderColor: c.border,
                    }}>
                    <RecipeImage
                      recipe={recipe}
                      glyph={20}
                      style={{ width: 44, height: 44, borderRadius: 22 }}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14.5, fontWeight: '700', color: c.text }}>
                        {recipe.title}
                      </Text>
                      <Text style={{ fontSize: 12, color: c.textSec, marginTop: 2 }}>
                        {timeLabel(recipe)} · serves {entry.servings}
                      </Text>
                    </View>
                  </Pressable>
                ) : (
                  <View
                    style={{
                      borderWidth: 1,
                      borderStyle: 'dashed',
                      borderColor: c.border,
                      borderRadius: 16,
                      paddingVertical: 14,
                      alignItems: 'center',
                    }}>
                    <Text style={{ fontSize: 13, color: c.textSec }}>Empty</Text>
                  </View>
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </Screen>
  );
}
