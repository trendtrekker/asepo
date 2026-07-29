import Slider from '@react-native-community/slider';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Chip, Screen, Toggle } from '@/components/ui';
import {
  CUISINE_OPTIONS,
  DIET_OPTIONS,
  DIFFICULTY_OPTIONS,
  MEAL_TYPE_OPTIONS,
} from '@/data/sample';
import { applyFilters } from '@/lib/filter-recipes';
import { safeBack } from '@/lib/navigation';
import { MAX_COOK_TIME, useStore } from '@/store/app-store';
import { useColors } from '@/theme/theme-context';

/** Screen 16 — Filter sheet. */
export default function Filters() {
  const c = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { filters, setFilters, resetFilters, recipes: allRecipes } = useStore();
  const [ingredientInput, setIngredientInput] = useState('');

  const toggleIn = (key: 'cuisine' | 'diet' | 'mealType', value: string) =>
    setFilters((f) => ({ ...f, [key]: { ...f[key], [value]: !f[key][value] } }));

  const matchCount = applyFilters(allRecipes, filters).length;

  const addIngredient = () => {
    const v = ingredientInput.trim();
    if (!v) return;
    setFilters((f) => ({ ...f, ingredients: [...f.ingredients, v] }));
    setIngredientInput('');
  };

  return (
    <Screen>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 20,
          paddingTop: insets.top + 12,
        }}>
        <Pressable
          onPress={() => {
            resetFilters();
            setIngredientInput('');
          }}
          accessibilityRole="button">
          <Text style={{ fontSize: 14, fontWeight: '500', color: c.textSec }}>Reset</Text>
        </Pressable>
        <Text style={{ fontSize: 17, fontWeight: '700', color: c.text }}>Filters</Text>
        <Pressable onPress={() => safeBack(router, '/(tabs)/recipes')} accessibilityRole="button">
          <Text style={{ fontSize: 14, fontWeight: '600', color: c.accent }}>Done</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 20 }}>
        <Group title="Cook time">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 }}>
            <Slider
              style={{ flex: 1 }}
              minimumValue={10}
              maximumValue={MAX_COOK_TIME}
              step={5}
              value={filters.cookTime}
              onValueChange={(v) => setFilters((f) => ({ ...f, cookTime: Math.round(v) }))}
              minimumTrackTintColor={c.accent}
              maximumTrackTintColor={c.chipBg}
              thumbTintColor={c.accent}
            />
            <Text
              style={{
                fontSize: 13,
                fontWeight: '600',
                color: c.textSec,
                minWidth: 70,
                textAlign: 'right',
              }}>
              {filters.cookTime >= MAX_COOK_TIME ? 'Any' : `≤ ${filters.cookTime} min`}
            </Text>
          </View>
        </Group>

        <Group title="Cuisine">
          <ChipWrap>
            {CUISINE_OPTIONS.map((o) => (
              <Chip
                key={o}
                label={o}
                selected={!!filters.cuisine[o]}
                onPress={() => toggleIn('cuisine', o)}
              />
            ))}
          </ChipWrap>
        </Group>

        <Group title="Diet">
          <ChipWrap>
            {DIET_OPTIONS.map((o) => (
              <Chip key={o} label={o} selected={!!filters.diet[o]} onPress={() => toggleIn('diet', o)} />
            ))}
          </ChipWrap>
        </Group>

        <Group title="Meal type">
          <ChipWrap>
            {MEAL_TYPE_OPTIONS.map((o) => (
              <Chip
                key={o}
                label={o}
                selected={!!filters.mealType[o]}
                onPress={() => toggleIn('mealType', o)}
              />
            ))}
          </ChipWrap>
        </Group>

        <Group title="Difficulty">
          <View
            style={{
              flexDirection: 'row',
              gap: 8,
              marginTop: 10,
              backgroundColor: c.chipBg,
              borderRadius: 12,
              padding: 4,
            }}>
            {DIFFICULTY_OPTIONS.map((d) => {
              const active = filters.difficulty === d;
              return (
                <Pressable
                  key={d}
                  onPress={() => setFilters((f) => ({ ...f, difficulty: d }))}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  style={{
                    flex: 1,
                    paddingVertical: 9,
                    borderRadius: 9,
                    backgroundColor: active ? c.surface : 'transparent',
                    alignItems: 'center',
                  }}>
                  <Text
                    style={{ fontSize: 13.5, fontWeight: '600', color: active ? c.text : c.textSec }}>
                    {d}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Group>

        <Group title="Ingredients I have">
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              marginTop: 10,
              backgroundColor: c.inputBg,
              borderRadius: 12,
              paddingLeft: 14,
              padding: 4,
            }}>
            <TextInput
              value={ingredientInput}
              onChangeText={setIngredientInput}
              onSubmitEditing={addIngredient}
              placeholder="e.g. chicken, basil"
              placeholderTextColor={c.textSec}
              style={{ flex: 1, fontSize: 14.5, color: c.text, paddingVertical: 10 }}
            />
            <Pressable
              onPress={addIngredient}
              accessibilityRole="button"
              accessibilityLabel="Add ingredient"
              style={{
                width: 34,
                height: 34,
                borderRadius: 9,
                backgroundColor: c.accent,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>+</Text>
            </Pressable>
          </View>

          {filters.ingredients.length ? (
            <ChipWrap>
              {filters.ingredients.map((t, i) => (
                <Pressable
                  key={`${t}-${i}`}
                  onPress={() =>
                    setFilters((f) => ({
                      ...f,
                      ingredients: f.ingredients.filter((_, idx) => idx !== i),
                    }))
                  }
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${t}`}
                  style={{
                    paddingVertical: 8,
                    paddingHorizontal: 12,
                    borderRadius: 16,
                    backgroundColor: c.accentTint2,
                  }}>
                  <Text style={{ fontSize: 13, fontWeight: '500', color: c.accent }}>{t} ×</Text>
                </Pressable>
              ))}
            </ChipWrap>
          ) : null}
        </Group>

        <View
          style={{
            marginTop: 22,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
          <Text style={{ fontSize: 15, fontWeight: '600', color: c.text }}>Has nutrition data</Text>
          <Toggle
            value={filters.hasNutrition}
            onPress={() => setFilters((f) => ({ ...f, hasNutrition: !f.hasNutrition }))}
          />
        </View>
      </ScrollView>

      <View style={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: insets.bottom + 20 }}>
        <Button title={`Show ${matchCount} recipes`} onPress={() => safeBack(router, '/(tabs)/recipes')} />
      </View>
    </Screen>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  const c = useColors();
  return (
    <View style={{ marginTop: 22 }}>
      <Text style={{ fontSize: 15, fontWeight: '700', color: c.text }}>{title}</Text>
      {children}
    </View>
  );
}

function ChipWrap({ children }: { children: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>{children}</View>
  );
}
