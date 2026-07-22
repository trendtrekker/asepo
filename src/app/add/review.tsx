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
  const [minutes, setMinutes] = useState(
    pendingImport?.minutes !== undefined ? String(pendingImport.minutes) : ''
  );
  const [servings, setServings] = useState(
    pendingImport?.servings !== undefined ? String(pendingImport.servings) : ''
  );
  const [ingredients, setIngredients] = useState<Ingredient[]>(
    () => pendingImport?.ingredients.map((r, i) => ({ ...r, key: i })) ?? []
  );
  const [instructions, setInstructions] = useState<Instruction[]>(
    () => pendingImport?.instructions.map((text, i) => ({ text, key: i })) ?? []
  );

  const updateIngredient = (key: number, patch: Partial<Ingredient>) =>
    setIngredients((list) => list.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  /**
   * The banner adapts to how the recipe was obtained. JSON-LD is published by
   * the site itself, so nagging the user to check it is noise; a model reading
   * a caption genuinely can misread quantities.
   */
  const confidence = pendingImport?.confidence ?? 0;
  const accuracy =
    confidence >= 1
      ? null
      : confidence >= 0.85
        ? { tone: 'info' as const, message: 'Double-check the amounts — we extracted these automatically.' }
        : {
            tone: 'warn' as const,
            message:
              'We had to guess at some of this. Check the quantities and steps carefully before saving.',
          };

  /** Commits the edited recipe to the library, then closes the import flow. */
  const save = () => {
    const recipe: Recipe = {
      id: `r-${Date.now().toString(36)}`,
      title: title.trim() || 'Untitled recipe',
      // Prefer what the user typed; fall back to the extraction, then to a
      // neutral default rather than a made-up specific.
      minutes: parseInt(minutes, 10) || pendingImport?.minutes || 30,
      calories: pendingImport?.calories ?? 0,
      servings: parseInt(servings, 10) || pendingImport?.servings || 2,
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

          {/* Time and servings are frequently absent from a caption. Rather
              than silently defaulting them, show them as editable and flag
              when the importer couldn't find a value. */}
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
            <MetaField
              label="Total minutes"
              value={minutes}
              onChangeText={setMinutes}
              missing={pendingImport?.minutes === undefined}
            />
            <MetaField
              label="Servings"
              value={servings}
              onChangeText={setServings}
              missing={pendingImport?.servings === undefined}
            />
          </View>

          {/* How loudly we tell the user to check depends on how the recipe was
              extracted: site-authored JSON-LD is exact, a model is not. */}
          {accuracy ? (
            <View
              style={{
                marginTop: 16,
                backgroundColor: accuracy.tone === 'warn' ? c.accentTint2 : c.accentTint,
                borderRadius: 12,
                paddingVertical: 10,
                paddingHorizontal: 14,
              }}>
              <Text style={{ fontSize: 12.5, lineHeight: 18, fontWeight: '500', color: c.text }}>
                {accuracy.message}
              </Text>
            </View>
          ) : null}

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
              <Text style={{ fontSize: 13.5, fontWeight: '600', color: c.text }}>
                {pendingImport?.source?.handle ?? 'Added by hand'}
              </Text>
              <Text style={{ fontSize: 12, color: c.textSec }}>
                {pendingImport?.source
                  ? `Imported from ${pendingImport.source.platform} · view original`
                  : 'Typed in manually'}
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

/**
 * An editable time/servings field. Marked when the importer found no value, so
 * the user knows it's blank because the source didn't say — not because we lost it.
 */
function MetaField({
  label,
  value,
  onChangeText,
  missing,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  missing: boolean;
}) {
  const c = useColors();
  return (
    <View style={{ flex: 1 }}>
      <Text style={{ fontSize: 12, fontWeight: '600', color: c.textSec, marginBottom: 6 }}>
        {label}
        {missing ? <Text style={{ color: c.accent }}> · not stated</Text> : null}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType="number-pad"
        placeholder="—"
        placeholderTextColor={c.textSec}
        accessibilityLabel={label}
        style={{
          height: 44,
          borderRadius: 10,
          backgroundColor: c.inputBg,
          borderWidth: 1,
          borderColor: missing ? c.accentTint2 : c.border,
          paddingHorizontal: 12,
          fontSize: 15,
          color: c.text,
        }}
      />
    </View>
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
