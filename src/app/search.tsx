import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Clock, Search as SearchIcon } from '@/components/icons';
import { RecipeImage } from '@/components/recipe-image';
import { Button, Screen } from '@/components/ui';
import {
  ALL_INGREDIENTS,
  ALL_TAGS,
  calLabel,
  RECENT_SEARCHES,
  SUGGESTED_SEARCHES,
  timeLabel,
} from '@/data/sample';
import { searchRecipes } from '@/lib/filter-recipes';
import { useStore } from '@/store/app-store';
import { useColors } from '@/theme/theme-context';

/** Screen 17 — Search. */
export default function Search() {
  const c = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const { cookbooks: allCookbooks } = useStore();

  const q = query.trim().toLowerCase();
  const recipes = searchRecipes(query);
  const ingredients = q ? ALL_INGREDIENTS.filter((i) => i.toLowerCase().includes(q)).slice(0, 8) : [];
  const cookbooks = q ? allCookbooks.filter((cb) => cb.name.toLowerCase().includes(q)) : [];
  const tags = q ? ALL_TAGS.filter((t) => t.toLowerCase().includes(q)) : [];

  const hasResults = recipes.length + ingredients.length + cookbooks.length + tags.length > 0;
  const idle = q === '';

  return (
    <Screen style={{ paddingTop: insets.top + 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20 }}>
        <View
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            backgroundColor: c.inputBg,
            borderRadius: 12,
            paddingHorizontal: 14,
          }}>
          <SearchIcon color={c.textSec} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            autoFocus
            placeholder="Search recipes, ingredients…"
            placeholderTextColor={c.textSec}
            style={{ flex: 1, fontSize: 15, color: c.text, paddingVertical: 10 }}
          />
        </View>
        <Pressable onPress={() => router.back()} accessibilityRole="button">
          <Text style={{ fontSize: 15, fontWeight: '500', color: c.accent }}>Cancel</Text>
        </Pressable>
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24 }}>
        {idle ? (
          <View>
            <SectionLabel>Recent searches</SectionLabel>
            <View style={{ marginTop: 8 }}>
              {RECENT_SEARCHES.map((s) => (
                <Pressable
                  key={s}
                  onPress={() => setQuery(s)}
                  accessibilityRole="button"
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 10,
                    paddingVertical: 10,
                    borderBottomWidth: 1,
                    borderBottomColor: c.border,
                  }}>
                  <Clock color={c.textSec} />
                  <Text style={{ fontSize: 14.5, fontWeight: '500', color: c.text }}>{s}</Text>
                </Pressable>
              ))}
            </View>

            <SectionLabel style={{ marginTop: 20 }}>Suggested</SectionLabel>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
              {SUGGESTED_SEARCHES.map((s) => (
                <Pressable
                  key={s}
                  onPress={() => setQuery(s)}
                  accessibilityRole="button"
                  style={{
                    paddingVertical: 9,
                    paddingHorizontal: 14,
                    borderRadius: 18,
                    backgroundColor: c.chipBg,
                  }}>
                  <Text style={{ fontSize: 13.5, fontWeight: '500', color: c.text }}>{s}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : hasResults ? (
          <View style={{ gap: 20 }}>
            {recipes.length ? (
              <View>
                <SectionLabel>Recipes</SectionLabel>
                <View style={{ marginTop: 8 }}>
                  {recipes.map((r) => (
                    <View
                      key={r.id}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 12,
                        paddingVertical: 9,
                        borderBottomWidth: 1,
                        borderBottomColor: c.border,
                      }}>
                      <RecipeImage
                        recipe={r}
                        glyph={24}
                        style={{ width: 52, height: 52, borderRadius: 10 }}
                      />
                      <View>
                        <Text style={{ fontSize: 14.5, fontWeight: '600', color: c.text }}>
                          {r.title}
                        </Text>
                        <Text style={{ marginTop: 2, fontSize: 12.5, color: c.textSec }}>
                          {timeLabel(r)} · {calLabel(r)}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            {ingredients.length ? (
              <View>
                <SectionLabel>Ingredients</SectionLabel>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                  {ingredients.map((i) => (
                    <View
                      key={i}
                      style={{
                        paddingVertical: 9,
                        paddingHorizontal: 14,
                        borderRadius: 18,
                        backgroundColor: c.chipBg,
                      }}>
                      <Text style={{ fontSize: 13.5, fontWeight: '500', color: c.text }}>{i}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            {cookbooks.length ? (
              <View>
                <SectionLabel>Cookbooks</SectionLabel>
                <View style={{ marginTop: 8 }}>
                  {cookbooks.map((cb) => (
                    <View
                      key={cb.id}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 10,
                        paddingVertical: 9,
                        borderBottomWidth: 1,
                        borderBottomColor: c.border,
                      }}>
                      <View
                        style={{ width: 36, height: 36, borderRadius: 9, backgroundColor: c.chipBg }}
                      />
                      <Text style={{ flex: 1, fontSize: 14, fontWeight: '600', color: c.text }}>
                        {cb.name}
                      </Text>
                      <Text style={{ fontSize: 12.5, color: c.textSec }}>{cb.count} recipes</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            {tags.length ? (
              <View>
                <SectionLabel>Tags</SectionLabel>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                  {tags.map((t) => (
                    <View
                      key={t}
                      style={{
                        paddingVertical: 9,
                        paddingHorizontal: 14,
                        borderRadius: 18,
                        backgroundColor: c.accentTint,
                      }}>
                      <Text style={{ fontSize: 13.5, fontWeight: '500', color: c.accent }}>{t}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}
          </View>
        ) : (
          <View style={{ alignItems: 'center', paddingTop: 60 }}>
            <View
              style={{ width: 110, height: 110, borderRadius: 55, backgroundColor: c.chipBg }}
            />
            <Text style={{ marginTop: 20, fontSize: 18, fontWeight: '700', color: c.text }}>
              Nothing found
            </Text>
            <Text style={{ marginTop: 6, fontSize: 14, color: c.textSec, textAlign: 'center' }}>
              Try importing one
            </Text>
            <Button
              title="Import a recipe"
              height={44}
              onPress={() => router.push('/add')}
              style={{ marginTop: 16, paddingHorizontal: 20, borderRadius: 22 }}
              textStyle={{ fontSize: 14.5 }}
            />
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

function SectionLabel({
  children,
  style,
}: {
  children: string;
  style?: React.ComponentProps<typeof Text>['style'];
}) {
  const c = useColors();
  return (
    <Text style={[{ fontSize: 15, fontWeight: '700', color: c.text }, style]}>{children}</Text>
  );
}
