import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useToast } from '@/components/toast';
import { Button, SheetHandle } from '@/components/ui';
import { addDays, formatShortDate, fromIso, todayIso, weekdayShort } from '@/lib/dates';
import { safeBack } from '@/lib/navigation';
import { MEAL_SLOTS, useStore, type MealSlot } from '@/store/app-store';
import { useColors } from '@/theme/theme-context';

/** Sheet for choosing which day and meal slot a recipe lands in. */
export default function AddToPlan() {
  const c = useColors();
  const router = useRouter();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getRecipe, addToPlan } = useStore();

  const recipe = getRecipe(id);
  const today = todayIso();
  const [date, setDate] = useState(today);
  const [slot, setSlot] = useState<MealSlot>('Dinner');
  const [servings, setServings] = useState(recipe?.servings ?? 2);

  const confirm = () => {
    if (!recipe) return;
    addToPlan({ date, slot, recipeId: recipe.id, servings });
    safeBack(router, '/(tabs)/plan');
    toast.show(`Added to ${formatShortDate(date)} ${slot.toLowerCase()}`);
  };

  return (
    <View style={{ flex: 1, justifyContent: 'flex-end' }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Close"
        onPress={() => safeBack(router, '/(tabs)/plan')}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: c.overlay }}
      />

      <View
        style={{
          backgroundColor: c.surface,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          paddingBottom: insets.bottom + 20,
          maxHeight: '82%',
        }}>
        <SheetHandle />

        <View style={{ paddingHorizontal: 20 }}>
          <Text style={{ fontSize: 20, fontWeight: '700', color: c.text }}>Add to plan</Text>
          <Text style={{ fontSize: 13.5, color: c.textSec, marginTop: 2 }} numberOfLines={1}>
            {recipe?.title ?? 'Recipe'}
          </Text>
        </View>

        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 18 }}>
          <Label>Day</Label>
          <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>
            {Array.from({ length: 7 }, (_, i) => addDays(today, i)).map((iso) => {
              const active = date === iso;
              return (
                <Pressable
                  key={iso}
                  onPress={() => setDate(iso)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    borderRadius: 12,
                    alignItems: 'center',
                    backgroundColor: active ? c.accent : c.chipBg,
                  }}>
                  <Text
                    style={{ fontSize: 11, fontWeight: '700', color: active ? '#fff' : c.text }}>
                    {iso === today ? 'Today' : weekdayShort(iso)}
                  </Text>
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: '700',
                      color: active ? '#fff' : c.textSec,
                      marginTop: 2,
                    }}>
                    {fromIso(iso).getDate()}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Label style={{ marginTop: 22 }}>Meal</Label>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
            {MEAL_SLOTS.map((s) => {
              const active = slot === s;
              return (
                <Pressable
                  key={s}
                  onPress={() => setSlot(s)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  style={{
                    flex: 1,
                    height: 42,
                    borderRadius: 21,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: active ? c.accentTint2 : c.chipBg,
                  }}>
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: '600',
                      color: active ? c.accent : c.text,
                    }}>
                    {s}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Label style={{ marginTop: 22 }}>Servings</Label>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 8 }}>
            <Round label="−" onPress={() => setServings((s) => Math.max(1, s - 1))} />
            <Text style={{ fontSize: 17, fontWeight: '700', color: c.text, minWidth: 30, textAlign: 'center' }}>
              {servings}
            </Text>
            <Round label="+" tone="accent" onPress={() => setServings((s) => Math.min(24, s + 1))} />
          </View>
        </ScrollView>

        <View style={{ paddingHorizontal: 20, paddingTop: 18 }}>
          <Button title="Add to plan" onPress={confirm} />
        </View>
      </View>
    </View>
  );
}

function Label({ children, style }: { children: string; style?: object }) {
  const c = useColors();
  return (
    <Text style={[{ fontSize: 12, fontWeight: '700', color: c.textSec, textTransform: 'uppercase', letterSpacing: 0.5 }, style]}>
      {children}
    </Text>
  );
}

function Round({
  label,
  tone = 'neutral',
  onPress,
}: {
  label: string;
  tone?: 'neutral' | 'accent';
  onPress: () => void;
}) {
  const c = useColors();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label === '+' ? 'Increase servings' : 'Decrease servings'}
      style={{
        width: 38,
        height: 38,
        borderRadius: 19,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: tone === 'accent' ? c.accent : c.chipBg,
      }}>
      <Text style={{ fontSize: 20, fontWeight: '600', color: tone === 'accent' ? '#fff' : c.text }}>
        {label}
      </Text>
    </Pressable>
  );
}
