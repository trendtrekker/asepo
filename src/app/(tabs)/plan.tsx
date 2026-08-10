import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AnimatedPressable } from '@/components/animated-pressable';
import { Trash } from '@/components/icons';
import { RecipeImage } from '@/components/recipe-image';
import { Screen } from '@/components/ui';
import { timeLabel, type Recipe } from '@/data/sample';
import { addDays, formatWeekRange, fromIso, startOfWeek, todayIso, weekdayShort } from '@/lib/dates';
import { MEAL_SLOTS, useStore, type PlanEntry } from '@/store/app-store';
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
          // A slot can hold more than one meal — filter, not find, and list
          // every entry with a recipe that still resolves.
          const entries = dayEntries
            .filter((e) => e.slot === slot)
            .map((entry) => ({ entry, recipe: getRecipe(entry.recipeId) }))
            .filter((x): x is { entry: PlanEntry; recipe: Recipe } => Boolean(x.recipe));
          const isLast = i === MEAL_SLOTS.length - 1;

          return (
            <View key={slot} style={{ flexDirection: 'row' }}>
              {/* Timeline rail — slot name stands in for a clock time, since
                  a plan entry doesn't carry one. Stretches to the row's full
                  height automatically, so it still spans correctly when a
                  slot holds several cards. */}
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
                {entries.length > 0 ? (
                  <>
                    {entries.map(({ entry, recipe }) => (
                      <Swipeable
                        key={entry.id}
                        overshootRight={false}
                        renderRightActions={(_progress, dragX) => (
                          <Pressable
                            onPress={() => removeFromPlan(entry.id)}
                            accessibilityRole="button"
                            accessibilityLabel={`Remove ${recipe.title} from plan`}
                            style={{
                              width: 64,
                              marginLeft: 8,
                              borderRadius: 16,
                              backgroundColor: c.danger,
                              alignItems: 'center',
                              justifyContent: 'center',
                              opacity: dragX.interpolate({
                                inputRange: [-64, -10, 0],
                                outputRange: [1, 0.4, 0],
                                extrapolate: 'clamp',
                              }),
                            }}>
                            <Trash color="#fff" size={18} />
                          </Pressable>
                        )}>
                        <AnimatedPressable
                          onPress={() => router.push({ pathname: '/recipe/[id]', params: { id: recipe.id } })}
                          onLongPress={() => removeFromPlan(entry.id)}
                          accessibilityRole="button"
                          accessibilityHint="Swipe left, or long press, to remove from plan"
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 12,
                            padding: 10,
                            borderRadius: 16,
                            backgroundColor: c.surface,
                            borderWidth: 1,
                            borderColor: c.border,
                            marginBottom: 10,
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
                        </AnimatedPressable>
                      </Swipeable>
                    ))}
                    <Pressable
                      onPress={() => router.push('/(tabs)/recipes')}
                      accessibilityRole="button"
                      accessibilityLabel={`Add another ${slot.toLowerCase()}`}
                      style={{ alignSelf: 'flex-start', paddingVertical: 4 }}>
                      <Text style={{ fontSize: 12.5, fontWeight: '600', color: c.accent }}>
                        + Add another
                      </Text>
                    </Pressable>
                  </>
                ) : (
                  <Pressable
                    onPress={() => router.push('/(tabs)/recipes')}
                    accessibilityRole="button"
                    accessibilityLabel={`Add a ${slot.toLowerCase()}`}
                    style={{
                      borderWidth: 1,
                      borderStyle: 'dashed',
                      borderColor: c.border,
                      borderRadius: 16,
                      paddingVertical: 14,
                      alignItems: 'center',
                    }}>
                    <Text style={{ fontSize: 13, color: c.textSec }}>+ Add meal</Text>
                  </Pressable>
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </Screen>
  );
}
