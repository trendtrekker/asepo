import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ImagePlaceholderIcon } from '@/components/icons';
import { Button, Screen, SectionTitle } from '@/components/ui';
import type { Recipe } from '@/data/sample';
import { useStore } from '@/store/app-store';
import { useColors } from '@/theme/theme-context';
import { useToast } from '@/components/toast';

type Ingredient = { key: number; qty: string; unit: string; name: string };
type Instruction = { key: number; text: string };

/** Screen 13 — Manual recipe editor (empty state of the review screen). */
export default function ManualEditor() {
  const toast = useToast();
  const c = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { addRecipe } = useStore();

  const [title, setTitle] = useState('');
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [instructions, setInstructions] = useState<Instruction[]>([]);

  const updateIngredient = (key: number, patch: Partial<Ingredient>) =>
    setIngredients((list) => list.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  /** Commits the hand-written recipe to the library, then closes the flow. */
  const save = () => {
    const recipe: Recipe = {
      id: `r-${Date.now().toString(36)}`,
      title: title.trim() || 'Untitled recipe',
      minutes: 30,
      calories: 0,
      servings: 2,
      favorite: false,
      cuisine: 'American',
      mealType: 'Dinner',
      difficulty: 'Easy',
      diets: [],
      tags: [],
      cookbooks: [],
      rating: 0,
      cookedCount: 0,
      addedAt: Date.now(),
      source: { handle: 'Added by hand', platform: 'Manual' },
      ingredients: ingredients
        .filter((i) => i.name.trim())
        .map(({ qty, unit, name }) => ({ qty: qty.trim(), unit: unit.trim(), name: name.trim() })),
      instructions: instructions.map((s) => s.text.trim()).filter(Boolean),
    };

    addRecipe(recipe);
    if (router.canDismiss()) router.dismissAll();
    router.replace('/(tabs)/recipes');
    toast.show(`Saved “${recipe.title}”`);
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 12 }}>
        <View
          style={{
            margin: 20,
            marginBottom: 0,
            height: 180,
            borderRadius: 16,
            borderWidth: 2,
            borderStyle: 'dashed',
            borderColor: c.border,
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}>
          <ImagePlaceholderIcon color={c.textSec} />
          <Text style={{ fontSize: 13.5, fontWeight: '600', color: c.textSec }}>
            Add cover photo
          </Text>
        </View>

        <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Recipe title"
            placeholderTextColor={c.textSec}
            style={{ fontSize: 24, fontWeight: '700', color: c.text, letterSpacing: -0.3 }}
          />

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
            {['+ Prep time', '+ Cook time', '+ Servings'].map((label) => (
              <Pressable
                key={label}
                accessibilityRole="button"
                onPress={() => toast.show(`${label.replace('+ ', '')} editor isn\u2019t designed yet`)}
                style={{
                  paddingVertical: 8,
                  paddingHorizontal: 13,
                  borderRadius: 14,
                  backgroundColor: c.chipBg,
                }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: c.textSec }}>{label}</Text>
              </Pressable>
            ))}
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
                <TextInput
                  value={ing.qty}
                  onChangeText={(v) => updateIngredient(ing.key, { qty: v })}
                  placeholder="qty"
                  placeholderTextColor={c.textSec}
                  accessibilityLabel="Quantity"
                  style={{
                    width: 40,
                    paddingVertical: 8,
                    paddingHorizontal: 6,
                    backgroundColor: c.inputBg,
                    borderRadius: 8,
                    fontSize: 14,
                    color: c.text,
                    textAlign: 'center',
                  }}
                />
                <TextInput
                  value={ing.unit}
                  onChangeText={(v) => updateIngredient(ing.key, { unit: v })}
                  placeholder="unit"
                  placeholderTextColor={c.textSec}
                  accessibilityLabel="Unit"
                  style={{
                    width: 52,
                    paddingVertical: 8,
                    paddingHorizontal: 6,
                    backgroundColor: c.inputBg,
                    borderRadius: 8,
                    fontSize: 14,
                    color: c.text,
                    textAlign: 'center',
                  }}
                />
                <TextInput
                  value={ing.name}
                  onChangeText={(v) => updateIngredient(ing.key, { name: v })}
                  placeholder="ingredient name"
                  placeholderTextColor={c.textSec}
                  accessibilityLabel="Ingredient"
                  style={{
                    flex: 1,
                    paddingVertical: 8,
                    paddingHorizontal: 10,
                    backgroundColor: c.inputBg,
                    borderRadius: 8,
                    fontSize: 14,
                    color: c.text,
                  }}
                />
                <Pressable
                  onPress={() => setIngredients((l) => l.filter((r) => r.key !== ing.key))}
                  accessibilityRole="button"
                  accessibilityLabel="Remove ingredient"
                  style={{ width: 28, height: 28, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 16, color: c.textSec }}>×</Text>
                </Pressable>
              </View>
            ))}
            {ingredients.length === 0 ? (
              <Text style={{ paddingVertical: 10, fontSize: 13.5, color: c.textSec }}>
                No ingredients yet
              </Text>
            ) : null}
          </View>
          <AddRowButton
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
                  placeholder="Describe this step…"
                  placeholderTextColor={c.textSec}
                  onChangeText={(v) =>
                    setInstructions((l) => l.map((s) => (s.key === step.key ? { ...s, text: v } : s)))
                  }
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    paddingHorizontal: 12,
                    backgroundColor: c.inputBg,
                    borderRadius: 10,
                    fontSize: 14.5,
                    lineHeight: 20,
                    color: c.text,
                  }}
                />
                <Pressable
                  onPress={() => setInstructions((l) => l.filter((s) => s.key !== step.key))}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove step ${i + 1}`}
                  style={{ width: 28, height: 28, alignItems: 'center', justifyContent: 'center', marginTop: 2 }}>
                  <Text style={{ fontSize: 16, color: c.textSec }}>×</Text>
                </Pressable>
              </View>
            ))}
            {instructions.length === 0 ? (
              <Text style={{ paddingVertical: 10, fontSize: 13.5, color: c.textSec }}>
                No steps yet
              </Text>
            ) : null}
          </View>
          <AddRowButton
            label="+ Add step"
            onPress={() => setInstructions((l) => [...l, { key: Date.now(), text: '' }])}
          />
        </View>

        <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
          <Button title="Save recipe" onPress={save} />
        </View>
      </ScrollView>
    </Screen>
  );
}

function AddRowButton({ label, onPress }: { label: string; onPress: () => void }) {
  const c = useColors();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={{ marginTop: 10, paddingVertical: 4 }}>
      <Text style={{ fontSize: 14.5, fontWeight: '600', color: c.accent }}>{label}</Text>
    </Pressable>
  );
}
