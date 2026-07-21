import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DragHandle } from '@/components/icons';
import { useToast } from '@/components/toast';
import { Button, Screen, SectionTitle } from '@/components/ui';
import type { Ingredient } from '@/data/sample';
import { useStore } from '@/store/app-store';
import { useColors } from '@/theme/theme-context';

type Keyed<T> = T & { key: number };

/** Edits an existing recipe in place. Writes straight to the store on save. */
export default function EditRecipe() {
  const c = useColors();
  const router = useRouter();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getRecipe, updateRecipe } = useStore();

  const recipe = getRecipe(id);

  const [title, setTitle] = useState(recipe?.title ?? '');
  const [minutes, setMinutes] = useState(String(recipe?.minutes ?? ''));
  const [servings, setServings] = useState(String(recipe?.servings ?? ''));
  const [ingredients, setIngredients] = useState<Keyed<Ingredient>[]>(
    () => recipe?.ingredients.map((ing, i) => ({ ...ing, key: i })) ?? []
  );
  const [instructions, setInstructions] = useState<Keyed<{ text: string }>[]>(
    () => recipe?.instructions.map((text, i) => ({ text, key: i })) ?? []
  );

  if (!recipe) {
    return (
      <Screen style={{ alignItems: 'center', justifyContent: 'center', padding: 30 }}>
        <Text style={{ fontSize: 17, fontWeight: '700', color: c.text }}>Recipe not found</Text>
        <Button title="Go back" variant="plain" onPress={() => router.back()} />
      </Screen>
    );
  }

  const save = () => {
    const parsedMinutes = parseInt(minutes, 10);
    const parsedServings = parseInt(servings, 10);

    updateRecipe(recipe.id, {
      title: title.trim() || recipe.title,
      minutes: Number.isFinite(parsedMinutes) && parsedMinutes > 0 ? parsedMinutes : recipe.minutes,
      servings:
        Number.isFinite(parsedServings) && parsedServings > 0 ? parsedServings : recipe.servings,
      ingredients: ingredients
        .filter((i) => i.name.trim())
        .map(({ qty, unit, name }) => ({ qty: qty.trim(), unit: unit.trim(), name: name.trim() })),
      instructions: instructions.map((s) => s.text.trim()).filter(Boolean),
    });

    router.back();
    toast.show('Recipe updated');
  };

  const patchIngredient = (key: number, patch: Partial<Ingredient>) =>
    setIngredients((list) => list.map((i) => (i.key === key ? { ...i, ...patch } : i)));

  const field = {
    backgroundColor: c.inputBg,
    borderRadius: 8,
    fontSize: 14,
    color: c.text,
    paddingVertical: 8,
    paddingHorizontal: 8,
  } as const;

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
        <Pressable onPress={() => router.back()} accessibilityRole="button">
          <Text style={{ fontSize: 15, fontWeight: '500', color: c.textSec }}>Cancel</Text>
        </Pressable>
        <Text style={{ fontSize: 17, fontWeight: '700', color: c.text }}>Edit recipe</Text>
        <Pressable onPress={save} accessibilityRole="button">
          <Text style={{ fontSize: 15, fontWeight: '600', color: c.accent }}>Save</Text>
        </Pressable>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: insets.bottom + 30 }}
          keyboardShouldPersistTaps="handled">
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Recipe title"
            placeholderTextColor={c.textSec}
            accessibilityLabel="Recipe title"
            style={{ fontSize: 24, fontWeight: '700', color: c.text, letterSpacing: -0.3 }}
          />

          <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: c.textSec, marginBottom: 6 }}>
                Total minutes
              </Text>
              <TextInput
                value={minutes}
                onChangeText={setMinutes}
                keyboardType="number-pad"
                accessibilityLabel="Total minutes"
                style={[field, { height: 44, paddingHorizontal: 12, fontSize: 15 }]}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: c.textSec, marginBottom: 6 }}>
                Servings
              </Text>
              <TextInput
                value={servings}
                onChangeText={setServings}
                keyboardType="number-pad"
                accessibilityLabel="Servings"
                style={[field, { height: 44, paddingHorizontal: 12, fontSize: 15 }]}
              />
            </View>
          </View>

          <SectionTitle style={{ marginTop: 24 }}>Ingredients</SectionTitle>
          <View style={{ marginTop: 8 }}>
            {ingredients.map((ing) => (
              <View
                key={ing.key}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  paddingVertical: 9,
                  borderBottomWidth: 1,
                  borderBottomColor: c.border,
                }}>
                <DragHandle color={c.textSec} />
                <TextInput
                  value={ing.qty}
                  onChangeText={(v) => patchIngredient(ing.key, { qty: v })}
                  placeholder="qty"
                  placeholderTextColor={c.textSec}
                  accessibilityLabel="Quantity"
                  style={[field, { width: 44, textAlign: 'center' }]}
                />
                <TextInput
                  value={ing.unit}
                  onChangeText={(v) => patchIngredient(ing.key, { unit: v })}
                  placeholder="unit"
                  placeholderTextColor={c.textSec}
                  accessibilityLabel="Unit"
                  style={[field, { width: 56, textAlign: 'center' }]}
                />
                <TextInput
                  value={ing.name}
                  onChangeText={(v) => patchIngredient(ing.key, { name: v })}
                  placeholder="ingredient"
                  placeholderTextColor={c.textSec}
                  accessibilityLabel="Ingredient name"
                  style={[field, { flex: 1, paddingHorizontal: 10 }]}
                />
                <Pressable
                  onPress={() => setIngredients((l) => l.filter((i) => i.key !== ing.key))}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${ing.name}`}
                  style={{ width: 26, alignItems: 'center' }}>
                  <Text style={{ fontSize: 16, color: c.textSec }}>×</Text>
                </Pressable>
              </View>
            ))}
          </View>
          <AddRow
            label="+ Add ingredient"
            onPress={() =>
              setIngredients((l) => [...l, { key: Date.now(), qty: '', unit: '', name: '' }])
            }
          />

          <SectionTitle style={{ marginTop: 22 }}>Instructions</SectionTitle>
          <View style={{ gap: 10, marginTop: 8 }}>
            {instructions.map((step, i) => (
              <View key={step.key} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                <View
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    backgroundColor: c.accentTint2,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginTop: 2,
                  }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: c.accent }}>{i + 1}</Text>
                </View>
                <TextInput
                  value={step.text}
                  multiline
                  onChangeText={(v) =>
                    setInstructions((l) => l.map((s) => (s.key === step.key ? { ...s, text: v } : s)))
                  }
                  accessibilityLabel={`Step ${i + 1}`}
                  style={[field, { flex: 1, borderRadius: 10, paddingHorizontal: 12, fontSize: 14.5, lineHeight: 20 }]}
                />
                <Pressable
                  onPress={() => setInstructions((l) => l.filter((s) => s.key !== step.key))}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove step ${i + 1}`}
                  style={{ width: 26, alignItems: 'center', marginTop: 8 }}>
                  <Text style={{ fontSize: 16, color: c.textSec }}>×</Text>
                </Pressable>
              </View>
            ))}
          </View>
          <AddRow
            label="+ Add step"
            onPress={() => setInstructions((l) => [...l, { key: Date.now(), text: '' }])}
          />

          <Button title="Save changes" onPress={save} style={{ marginTop: 28 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function AddRow({ label, onPress }: { label: string; onPress: () => void }) {
  const c = useColors();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={{ marginTop: 10, paddingVertical: 4 }}>
      <Text style={{ fontSize: 14.5, fontWeight: '600', color: c.accent }}>{label}</Text>
    </Pressable>
  );
}
