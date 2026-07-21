import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DragHandle } from '@/components/icons';
import { RecipeImage } from '@/components/recipe-image';
import { Button, Screen, SectionTitle } from '@/components/ui';
import { RECIPE_SAMPLES, type Recipe } from '@/data/sample';
import { useStore } from '@/store/app-store';
import { useColors } from '@/theme/theme-context';
import { useToast } from '@/components/toast';

type Ingredient = { key: number; qty: string; unit: string; name: string };
type Instruction = { key: number; text: string };

/** Screen 9 — Import review. Everything is editable before saving. */
export default function ImportReview() {
  const toast = useToast();
  const c = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { pendingImport, addRecipe, setPendingImport } = useStore();

  const [title, setTitle] = useState(pendingImport?.title ?? '');
  const [ingredients, setIngredients] = useState<Ingredient[]>(
    () => pendingImport?.ingredients.map((r, i) => ({ ...r, key: i })) ?? []
  );
  const [instructions, setInstructions] = useState<Instruction[]>(
    () => pendingImport?.instructions.map((text, i) => ({ text, key: i })) ?? []
  );

  const updateIngredient = (key: number, patch: Partial<Ingredient>) =>
    setIngredients((list) => list.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  /** Commits the edited recipe to the library, then closes the import flow. */
  const save = () => {
    const recipe: Recipe = {
      id: `r-${Date.now().toString(36)}`,
      title: title.trim() || 'Untitled recipe',
      minutes: pendingImport?.minutes ?? 30,
      calories: pendingImport?.calories ?? 0,
      servings: pendingImport?.servings ?? 2,
      favorite: false,
      // Defaults an importer can't reliably infer — the user can correct them
      // in the recipe editor.
      cuisine: 'American',
      mealType: 'Dinner',
      difficulty: 'Easy',
      diets: [],
      tags: [],
      cookbooks: [],
      rating: 0,
      cookedCount: 0,
      addedAt: Date.now(),
      source: pendingImport?.source ?? { handle: 'Added by hand', platform: 'Manual' },
      ingredients: ingredients
        .filter((i) => i.name.trim())
        .map(({ qty, unit, name }) => ({ qty: qty.trim(), unit: unit.trim(), name: name.trim() })),
      instructions: instructions.map((s) => s.text.trim()).filter(Boolean),
      photoUrl: pendingImport?.imageUrl,
    };

    addRecipe(recipe);
    setPendingImport(null);

    if (router.canDismiss()) router.dismissAll();
    router.replace('/(tabs)/recipes');
    toast.show(`Saved “${recipe.title}”`);
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 12 }}>
        <RecipeImage
          recipe={RECIPE_SAMPLES[0]}
          glyph={84}
          style={{ height: 230, justifyContent: 'flex-end', alignItems: 'flex-end' }}>
          <Pressable
            accessibilityRole="button"
            onPress={() => toast.show('Photo picker comes with the backend')}
            style={{
              margin: 14,
              backgroundColor: 'rgba(0,0,0,0.5)',
              borderRadius: 20,
              paddingVertical: 8,
              paddingHorizontal: 14,
            }}>
            <Text style={{ color: '#fff', fontSize: 12.5, fontWeight: '600' }}>Change photo</Text>
          </Pressable>
        </RecipeImage>

        <View style={{ paddingHorizontal: 20, paddingTop: 18 }}>
          <TextInput
            value={title}
            onChangeText={setTitle}
            style={{ fontSize: 24, fontWeight: '700', color: c.text, letterSpacing: -0.3 }}
          />

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
            {['⏱ Prep 15m', '🔥 Cook 25m', '🍽 Serves 4'].map((chip) => (
              <View
                key={chip}
                style={{
                  paddingVertical: 8,
                  paddingHorizontal: 13,
                  borderRadius: 14,
                  backgroundColor: c.chipBg,
                }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: c.text }}>{chip}</Text>
              </View>
            ))}
          </View>

          <View
            style={{
              marginTop: 16,
              backgroundColor: c.accentTint,
              borderRadius: 12,
              paddingVertical: 10,
              paddingHorizontal: 14,
            }}>
            <Text style={{ fontSize: 12.5, lineHeight: 18, fontWeight: '500', color: c.text }}>
              Double-check the amounts — we extracted these automatically.
            </Text>
          </View>

          {/* Ingredients */}
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
                  onChangeText={(v) => updateIngredient(ing.key, { qty: v })}
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
                  accessibilityLabel={`Remove ${ing.name}`}
                  style={{ width: 28, height: 28, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 16, color: c.textSec }}>×</Text>
                </Pressable>
              </View>
            ))}
          </View>
          <AddRowButton
            label="+ Add ingredient"
            onPress={() =>
              setIngredients((l) => [...l, { key: Date.now(), qty: '', unit: '', name: '' }])
            }
          />

          {/* Instructions */}
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
                    setInstructions((l) =>
                      l.map((s) => (s.key === step.key ? { ...s, text: v } : s))
                    )
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
          </View>
          <AddRowButton
            label="+ Add step"
            onPress={() => setInstructions((l) => [...l, { key: Date.now(), text: '' }])}
          />

          {/* Source attribution */}
          <View
            style={{
              marginTop: 24,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              backgroundColor: c.chipBg,
              borderRadius: 14,
              paddingVertical: 12,
              paddingHorizontal: 14,
            }}>
            <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: c.surface }} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13.5, fontWeight: '600', color: c.text }}>@denise.cooks</Text>
              <Text style={{ fontSize: 12, color: c.textSec }}>
                Imported from TikTok · view original
              </Text>
            </View>
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={() => toast.show('Cookbook picker isn\u2019t designed yet')}
            style={{
              marginTop: 14,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingVertical: 14,
              borderTopWidth: 1,
              borderTopColor: c.border,
            }}>
            <Text style={{ fontSize: 15, fontWeight: '600', color: c.text }}>Save to cookbook</Text>
            <Text style={{ fontSize: 14, fontWeight: '500', color: c.textSec }}>
              Weeknight Dinners ›
            </Text>
          </Pressable>
        </View>

        <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
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
