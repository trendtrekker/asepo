import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Check } from '@/components/icons';
import { RecipeImage } from '@/components/recipe-image';
import { Button, Field, Screen } from '@/components/ui';
import { COOKBOOK_COLORS, COOKBOOK_EMOJIS } from '@/data/sample';
import { useStore } from '@/store/app-store';
import { useColors } from '@/theme/theme-context';
import { useToast } from '@/components/toast';

/** Screen 20 — New cookbook. */
export default function NewCookbook() {
  const toast = useToast();
  const c = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { recipes: allRecipes, createCookbook } = useStore();
  const { preselect } = useLocalSearchParams<{ preselect?: string }>();

  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [color, setColor] = useState(COOKBOOK_COLORS[0]);
  const [emoji, setEmoji] = useState(COOKBOOK_EMOJIS[0]);
  const [selected, setSelected] = useState<Record<string, boolean>>(() =>
    preselect ? { [preselect]: true } : {}
  );

  const create = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.show('Give your cookbook a name first');
      return;
    }
    createCookbook({
      name: trimmed,
      description: desc.trim() || undefined,
      color,
      emoji,
      recipeIds: Object.keys(selected).filter((id) => selected[id]),
    });
    router.back();
    toast.show(`Created “${trimmed}”`);
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
        <Pressable onPress={() => router.back()} accessibilityRole="button">
          <Text style={{ fontSize: 15, fontWeight: '500', color: c.textSec }}>Cancel</Text>
        </Pressable>
        <Text style={{ fontSize: 17, fontWeight: '700', color: c.text }}>New Cookbook</Text>
        <Pressable onPress={create} accessibilityRole="button">
          <Text style={{ fontSize: 15, fontWeight: '600', color: c.accent }}>Save</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20 }}>
        <Pressable
          accessibilityRole="button"
          onPress={() => toast.show('Photo picker comes with the backend')}
          style={{
            height: 120,
            borderRadius: 16,
            borderWidth: 2,
            borderStyle: 'dashed',
            borderColor: c.border,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Text style={{ fontSize: 13.5, fontWeight: '600', color: c.textSec }}>
            Choose cover image
          </Text>
        </Pressable>

        <View style={{ marginTop: 18 }}>
          <Field label="Name" value={name} onChangeText={setName} placeholder="e.g. Sunday Brunch" />
        </View>
        <View style={{ marginTop: 14 }}>
          <Field
            label="Description (optional)"
            value={desc}
            onChangeText={setDesc}
            placeholder="What's this cookbook for?"
            style={{ fontSize: 15 }}
          />
        </View>

        <Text style={{ marginTop: 18, fontSize: 12, fontWeight: '600', color: c.textSec }}>
          Color
        </Text>
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
          {COOKBOOK_COLORS.map((col) => (
            <Pressable
              key={col}
              onPress={() => setColor(col)}
              accessibilityRole="button"
              accessibilityLabel={`Colour ${col}`}
              accessibilityState={{ selected: color === col }}
              style={{
                width: 34,
                height: 34,
                borderRadius: 17,
                backgroundColor: col,
                borderWidth: 3,
                borderColor: color === col ? c.text : 'transparent',
              }}
            />
          ))}
        </View>

        <Text style={{ marginTop: 18, fontSize: 12, fontWeight: '600', color: c.textSec }}>
          Emoji
        </Text>
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
          {COOKBOOK_EMOJIS.map((em) => (
            <Pressable
              key={em}
              onPress={() => setEmoji(em)}
              accessibilityRole="button"
              accessibilityState={{ selected: emoji === em }}
              style={{
                width: 38,
                height: 38,
                borderRadius: 19,
                backgroundColor: emoji === em ? c.accentTint2 : c.chipBg,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <Text style={{ fontSize: 18 }}>{em}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={{ marginTop: 22, fontSize: 15, fontWeight: '700', color: c.text }}>
          Add recipes
        </Text>
        <View style={{ marginTop: 8 }}>
          {allRecipes.map((r) => {
            const on = !!selected[r.id];
            return (
              <Pressable
                key={r.id}
                onPress={() => setSelected((s) => ({ ...s, [r.id]: !s[r.id] }))}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  paddingVertical: 10,
                  borderBottomWidth: 1,
                  borderBottomColor: c.border,
                }}>
                <RecipeImage
                  recipe={r}
                  glyph={22}
                  style={{ width: 44, height: 44, borderRadius: 10 }}
                />
                <Text style={{ flex: 1, fontSize: 14.5, fontWeight: '500', color: c.text }}>
                  {r.title}
                </Text>
                <View
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 11,
                    backgroundColor: on ? c.accent : 'transparent',
                    borderWidth: 1.5,
                    borderColor: on ? c.accent : c.border,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  {on ? <Check color="#fff" size={11} /> : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: insets.bottom + 20 }}>
        <Button title="Create cookbook" onPress={create} />
      </View>
    </Screen>
  );
}
