import { useRouter } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RecipeImage } from '@/components/recipe-image';
import { Screen } from '@/components/ui';
import { timeLabel, WEEK_DAYS } from '@/data/sample';
import { MEAL_SLOTS, useStore } from '@/store/app-store';
import { useColors } from '@/theme/theme-context';

/** Weekly meal plan — fed by "Add to plan" on any recipe. */
export default function Plan() {
  const c = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { plan, getRecipe, removeFromPlan } = useStore();

  const total = plan.length;

  return (
    <Screen style={{ paddingTop: insets.top + 12 }}>
      <View style={{ paddingHorizontal: 20 }}>
        <Text style={{ fontSize: 30, fontWeight: '700', color: c.text, letterSpacing: -0.4 }}>
          Plan
        </Text>
        <Text style={{ fontSize: 13, color: c.textSec, marginTop: 2 }}>
          {total ? `${total} meal${total === 1 ? '' : 's'} this week` : 'Jul 21 – 27'}
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 18, paddingBottom: 100 }}>
        {WEEK_DAYS.map((day, dayIndex) => {
          const entries = plan.filter((e) => e.day === dayIndex);
          return (
            <View key={day} style={{ marginBottom: 22 }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 8,
                }}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: c.text }}>
                  {day} <Text style={{ color: c.textSec, fontWeight: '500' }}>{21 + dayIndex}</Text>
                </Text>
                {dayIndex === 0 ? (
                  <View
                    style={{
                      paddingVertical: 3,
                      paddingHorizontal: 8,
                      borderRadius: 8,
                      backgroundColor: c.accentTint,
                    }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: c.accent }}>TODAY</Text>
                  </View>
                ) : null}
              </View>

              {MEAL_SLOTS.map((slot) => {
                const slotEntries = entries.filter((e) => e.slot === slot);
                return (
                  <View key={slot} style={{ marginBottom: 6 }}>
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: '600',
                        color: c.textSec,
                        textTransform: 'uppercase',
                        letterSpacing: 0.5,
                        marginBottom: 4,
                      }}>
                      {slot}
                    </Text>

                    {slotEntries.length === 0 ? (
                      <View
                        style={{
                          borderWidth: 1,
                          borderStyle: 'dashed',
                          borderColor: c.border,
                          borderRadius: 12,
                          paddingVertical: 12,
                          alignItems: 'center',
                        }}>
                        <Text style={{ fontSize: 13, color: c.textSec }}>Empty</Text>
                      </View>
                    ) : (
                      slotEntries.map((entry) => {
                        const recipe = getRecipe(entry.recipeId);
                        if (!recipe) return null;
                        return (
                          <Pressable
                            key={entry.id}
                            onPress={() =>
                              router.push({
                                pathname: '/recipe/[id]',
                                params: { id: recipe.id },
                              })
                            }
                            onLongPress={() => removeFromPlan(entry.id)}
                            accessibilityRole="button"
                            accessibilityHint="Long press to remove from plan"
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 12,
                              padding: 8,
                              borderRadius: 12,
                              backgroundColor: c.chipBg,
                              marginBottom: 6,
                            }}>
                            <RecipeImage
                              recipe={recipe}
                              glyph={22}
                              style={{ width: 44, height: 44, borderRadius: 10 }}
                            />
                            <View style={{ flex: 1 }}>
                              <Text style={{ fontSize: 14.5, fontWeight: '600', color: c.text }}>
                                {recipe.title}
                              </Text>
                              <Text style={{ fontSize: 12, color: c.textSec, marginTop: 2 }}>
                                {timeLabel(recipe)} · serves {entry.servings}
                              </Text>
                            </View>
                          </Pressable>
                        );
                      })
                    )}
                  </View>
                );
              })}
            </View>
          );
        })}
      </ScrollView>
    </Screen>
  );
}
