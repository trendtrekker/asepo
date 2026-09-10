import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AnimatedCheckbox } from '@/components/animated-checkbox';
import { RecipeImage } from '@/components/recipe-image';
import { EmptyIllustration, Screen } from '@/components/ui';
import type { Recipe } from '@/data/sample';
import { groupByMeal, type GroceryItem } from '@/lib/grocery';
import { useStore } from '@/store/app-store';
import { useColors } from '@/theme/theme-context';

/** Grocery list — fed by "Add to grocery list" on any recipe. */
export default function Grocery() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const {
    grocery,
    recipes,
    toggleGroceryItem,
    removeGroceryItem,
    addManualGroceryItem,
    clearCheckedGrocery,
  } = useStore();

  const [draft, setDraft] = useState('');
  const [openRecipe, setOpenRecipe] = useState<string | null>(null);

  const unchecked = grocery.filter((i) => !i.checked);
  const checked = grocery.filter((i) => i.checked);
  const sections = groupByMeal(unchecked).map((s) => ({ label: s.meal, items: s.items }));
  const recipeSections = sections.filter((section) => section.label !== 'Added by hand');
  const manualSection = sections.find((section) => section.label === 'Added by hand');
  const selectedSection = recipeSections.find((section) => section.label === openRecipe);

  const submit = () => {
    const v = draft.trim();
    if (!v) return;
    addManualGroceryItem(v);
    setDraft('');
  };

  return (
    <Screen style={{ paddingTop: insets.top + 12 }}>
      <View
        style={{
          paddingHorizontal: 20,
          flexDirection: 'row',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
        }}>
        <View>
          <Text style={{ fontSize: 30, fontWeight: '700', color: c.text, letterSpacing: -0.4 }}>
            Grocery
          </Text>
          <Text style={{ fontSize: 13, color: c.textSec, marginTop: 2 }}>
            {unchecked.length} to buy
            {checked.length ? ` · ${checked.length} done` : ''}
          </Text>
        </View>
        {checked.length ? (
          <Pressable onPress={clearCheckedGrocery} accessibilityRole="button">
            <Text style={{ fontSize: 13.5, fontWeight: '600', color: c.accent }}>Clear done</Text>
          </Pressable>
        ) : null}
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20 }}
        keyboardShouldPersistTaps="handled">
        {grocery.length === 0 ? (
          <View style={{ alignItems: 'center', paddingTop: 30, paddingHorizontal: 20 }}>
            <EmptyIllustration />
            <Text style={{ marginTop: 20, fontSize: 18, fontWeight: '700', color: c.text }}>
              Nothing on the list
            </Text>
            <Text
              style={{
                marginTop: 6,
                fontSize: 14,
                lineHeight: 20,
                color: c.textSec,
                textAlign: 'center',
              }}>
              Open any recipe and tap “Add to grocery list”, or type an item below.
            </Text>
          </View>
        ) : null}

        {recipeSections.length ? (
          <View style={{ marginBottom: 22 }}>
            <Text
              style={{
                fontSize: 12,
                fontWeight: '700',
                color: c.textSec,
                textTransform: 'uppercase',
                letterSpacing: 0.6,
                marginBottom: 8,
              }}>
              Recipes · tap to reveal ingredients
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {recipeSections.map((section, index) => {
                const position = index % 5;
                const featured = position === 0;
                const wide = position === 1 || position === 4;
                const recipe = recipes.find((candidate) => candidate.title === section.label);
                return (
                  <View
                    key={section.label}
                    style={{ width: featured ? '100%' : wide ? '57%' : '37%', flexGrow: 1 }}>
                    <GroceryRecipeTile
                      label={section.label}
                      count={section.items.length}
                      recipe={recipe}
                      featured={featured}
                      tall={position === 1 || position === 3}
                      selected={openRecipe === section.label}
                      onPress={() =>
                        setOpenRecipe((current) => current === section.label ? null : section.label)
                      }
                    />
                  </View>
                );
              })}
            </View>
          </View>
        ) : null}

        {selectedSection ? (
          <View style={{ marginBottom: 22 }}>
            <Text
              style={{
                fontSize: 12,
                fontWeight: '700',
                color: c.accent,
                textTransform: 'uppercase',
                letterSpacing: 0.6,
                marginBottom: 8,
              }}>
              {selectedSection.label} · {selectedSection.items.length}
            </Text>
            {selectedSection.items.map((item) => (
              <GroceryRow
                key={`${selectedSection.label}-${item.id}`}
                item={item}
                onToggle={() => toggleGroceryItem(item.id)}
                onRemove={() => removeGroceryItem(item.id)}
              />
            ))}
          </View>
        ) : null}

        {manualSection ? (
          <View style={{ marginBottom: 22 }}>
            <Text
              style={{
                fontSize: 12,
                fontWeight: '700',
                color: c.textSec,
                textTransform: 'uppercase',
                letterSpacing: 0.6,
                marginBottom: 8,
              }}>
              Added by hand · {manualSection.items.length}
            </Text>
            {manualSection.items.map((item) => (
              <GroceryRow
                key={item.id}
                item={item}
                onToggle={() => toggleGroceryItem(item.id)}
                onRemove={() => removeGroceryItem(item.id)}
              />
            ))}
          </View>
        ) : null}

        {checked.length ? (
          <View>
            <Text
              style={{
                fontSize: 12,
                fontWeight: '700',
                color: c.textSec,
                textTransform: 'uppercase',
                letterSpacing: 0.6,
                marginBottom: 8,
              }}>
              Checked · {checked.length}
            </Text>
            {checked.map((item) => (
              <GroceryRow key={item.id} item={item} onToggle={() => toggleGroceryItem(item.id)} faded />
            ))}
          </View>
        ) : null}
      </ScrollView>

      {/* Quick add — a normal docked bar, not floating over the list.
          marginBottom still clears the tab bar's "Add a recipe" FAB, which
          floats independently above the tab bar itself. */}
      <View
        style={{
          marginHorizontal: 20,
          marginTop: 12,
          marginBottom: insets.bottom + 90,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          backgroundColor: c.inputBg,
          borderWidth: 1,
          borderColor: c.border,
          borderRadius: 14,
          paddingLeft: 16,
          padding: 4,
        }}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={submit}
          placeholder="Add an item"
          placeholderTextColor={c.textSec}
          style={{ flex: 1, fontSize: 15, color: c.text, paddingVertical: 11 }}
        />
        <Pressable
          onPress={submit}
          accessibilityRole="button"
          accessibilityLabel="Add item"
          style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            backgroundColor: c.accent,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Text style={{ color: '#fff', fontSize: 18, fontWeight: '600' }}>+</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

/** Image-only recipe tile. Ingredient rows stay hidden until this is opened. */
function GroceryRecipeTile({
  label,
  count,
  recipe,
  featured,
  tall,
  selected,
  onPress,
}: {
  label: string;
  count: number;
  recipe?: Recipe;
  featured: boolean;
  tall: boolean;
  selected: boolean;
  onPress: () => void;
}) {
  const c = useColors();
  const height = featured ? 184 : tall ? 154 : 124;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${count} grocery ${count === 1 ? 'item' : 'items'}`}
      accessibilityHint={selected ? 'Collapses ingredient list' : 'Reveals ingredient list'}
      accessibilityState={{ expanded: selected }}
      style={{
        height,
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: selected ? 3 : 1,
        borderColor: selected ? c.accent : c.border,
        backgroundColor: c.surface,
      }}>
      {recipe ? (
        <RecipeImage recipe={recipe} glyph={featured ? 58 : 42} style={{ flex: 1 }} />
      ) : (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.chipBg }}>
          <Text style={{ fontSize: featured ? 54 : 40, fontWeight: '800', color: c.accent }}>
            {label.trim().charAt(0).toUpperCase() || '?'}
          </Text>
        </View>
      )}
      <View
        style={{
          position: 'absolute',
          right: 10,
          bottom: 10,
          minWidth: 28,
          height: 28,
          paddingHorizontal: 8,
          borderRadius: 14,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: selected ? c.accent : 'rgba(0,0,0,0.58)',
        }}>
        <Text style={{ color: '#fff', fontSize: 12, fontWeight: '800' }}>{count}</Text>
      </View>
    </Pressable>
  );
}

/**
 * One list item as a card: a letter-avatar bubble standing in for a category
 * icon (the data has no category to draw a real one from), qty/name in the
 * middle, and the checkbox moved to the trailing edge.
 */
function GroceryRow({
  item,
  onToggle,
  onRemove,
  faded,
}: {
  item: GroceryItem;
  onToggle: () => void;
  onRemove?: () => void;
  faded?: boolean;
}) {
  const c = useColors();
  return (
    <Pressable
      onPress={onToggle}
      onLongPress={onRemove}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: item.checked }}
      accessibilityHint={onRemove ? 'Long press to remove' : undefined}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: c.surface,
        borderWidth: 1,
        borderColor: c.border,
        borderRadius: 16,
        padding: 10,
        marginBottom: 8,
        opacity: faded ? 0.55 : 1,
      }}>
      <View
        style={{
          width: 38,
          height: 38,
          borderRadius: 19,
          backgroundColor: c.accentTint,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Text style={{ fontSize: 15, fontWeight: '700', color: c.accent }}>
          {item.name.trim().charAt(0).toUpperCase() || '?'}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontSize: 15,
            fontWeight: '500',
            color: faded ? c.textSec : c.text,
            textDecorationLine: faded ? 'line-through' : 'none',
          }}>
          {item.name}
        </Text>
        {/* The section header already says which recipe this is for —
            only worth repeating when it's shared with another meal too. */}
        {!faded && item.sources.length > 1 ? (
          <Text style={{ fontSize: 11.5, color: c.textSec, marginTop: 2 }}>
            {item.sources.join(' · ')}
          </Text>
        ) : null}
      </View>
      {item.qty ? (
        <Text style={{ fontSize: 12.5, color: c.textSec, marginRight: 2 }}>
          {item.qty} {item.unit}
        </Text>
      ) : null}
      <AnimatedCheckbox checked={item.checked} size={24} />
    </Pressable>
  );
}
