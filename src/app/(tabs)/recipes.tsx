import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GridIcon, Search, Sliders } from '@/components/icons';
import { RecipeGridCard, RecipeListRow } from '@/components/recipe-card';
import { Screen } from '@/components/ui';
import { SORT_OPTIONS } from '@/data/sample';
import { applyChip, applyFilters, sortRecipes } from '@/lib/filter-recipes';
import { useToast } from '@/components/toast';
import { useStore } from '@/store/app-store';
import { useColors } from '@/theme/theme-context';

const FILTER_CHIPS = ['All', 'Favorites', 'Recently added', 'Quick (<30 min)'];

/** Screen 15 — Recipe library. */
export default function Recipes() {
  const toast = useToast();
  const c = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isFavorite, filters, recipes: allRecipes } = useStore();

  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [chip, setChip] = useState('All');
  const [sort, setSort] = useState(SORT_OPTIONS[0]);
  const [sortOpen, setSortOpen] = useState(false);

  const recipes = sortRecipes(
    applyChip(applyFilters(allRecipes, filters), chip, isFavorite),
    sort
  );
  const filtersActive = recipes.length !== allRecipes.length;

  return (
    <Screen style={{ paddingTop: insets.top + 12 }}>
      {/* Title + view toggle */}
      <View
        style={{
          paddingHorizontal: 20,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
        <Text style={{ fontSize: 30, fontWeight: '700', color: c.text, letterSpacing: -0.4 }}>
          Recipes
        </Text>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Pressable onPress={() => router.push('/cookbooks')} accessibilityRole="button">
            <Text style={{ fontSize: 14, fontWeight: '600', color: c.accent }}>Cookbooks</Text>
          </Pressable>

          <View style={{ flexDirection: 'row', backgroundColor: c.chipBg, borderRadius: 10, padding: 2 }}>
            <Pressable
              onPress={() => setView('grid')}
              accessibilityRole="button"
              accessibilityLabel="Grid view"
              accessibilityState={{ selected: view === 'grid' }}
              style={{
                width: 32,
                height: 28,
                borderRadius: 8,
                backgroundColor: view === 'grid' ? c.surface : 'transparent',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <GridIcon color={view === 'grid' ? c.accent : c.textSec} />
            </Pressable>
            <Pressable
              onPress={() => setView('list')}
              accessibilityRole="button"
              accessibilityLabel="List view"
              accessibilityState={{ selected: view === 'list' }}
              style={{
                width: 32,
                height: 28,
                borderRadius: 8,
                backgroundColor: view === 'list' ? c.surface : 'transparent',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 2,
              }}>
              {[0, 1, 2].map((i) => (
                <View
                  key={i}
                  style={{
                    width: 16,
                    height: 2,
                    backgroundColor: view === 'list' ? c.accent : c.textSec,
                  }}
                />
              ))}
            </Pressable>
          </View>
        </View>
      </View>

      {/* Search entry */}
      <View style={{ paddingHorizontal: 20, paddingTop: 12 }}>
        <Pressable
          onPress={() => router.push('/search')}
          accessibilityRole="search"
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            backgroundColor: c.inputBg,
            borderRadius: 12,
            paddingVertical: 11,
            paddingHorizontal: 14,
          }}>
          <Search color={c.textSec} />
          <Text style={{ fontSize: 15, color: c.textSec }}>Search recipes</Text>
        </Pressable>
      </View>

      {/* Filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 4 }}>
        {FILTER_CHIPS.map((label) => {
          const active = chip === label;
          return (
            <Pressable
              key={label}
              onPress={() => setChip(label)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              style={{
                paddingVertical: 9,
                paddingHorizontal: 14,
                borderRadius: 18,
                backgroundColor: active ? c.accent : c.chipBg,
              }}>
              <Text style={{ fontSize: 13.5, fontWeight: '600', color: active ? '#fff' : c.text }}>
                {label}
              </Text>
            </Pressable>
          );
        })}
        <Pressable
          onPress={() => router.push('/filters')}
          accessibilityRole="button"
          accessibilityLabel="Filters"
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: c.chipBg,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Sliders color={c.text} />
        </Pressable>
      </ScrollView>

      {/* Count + sort */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 20,
          paddingTop: 14,
          paddingBottom: 4,
          zIndex: 10,
        }}>
        <Text style={{ fontSize: 13, fontWeight: '500', color: c.textSec }}>
          {recipes.length} recipes
        </Text>
        <Pressable onPress={() => setSortOpen((o) => !o)} accessibilityRole="button">
          <Text style={{ fontSize: 13, fontWeight: '600', color: c.accent }}>{sort} ▾</Text>
        </Pressable>

        {sortOpen ? (
          <View
            style={{
              position: 'absolute',
              right: 20,
              top: 38,
              backgroundColor: c.surface,
              borderWidth: 1,
              borderColor: c.border,
              borderRadius: 12,
              overflow: 'hidden',
              minWidth: 160,
              shadowColor: '#000',
              shadowOpacity: 0.15,
              shadowRadius: 24,
              shadowOffset: { width: 0, height: 8 },
              elevation: 8,
            }}>
            {SORT_OPTIONS.map((opt) => (
              <Pressable
                key={opt}
                onPress={() => {
                  setSort(opt);
                  setSortOpen(false);
                }}
                accessibilityRole="menuitem"
                style={{ paddingVertical: 11, paddingHorizontal: 14 }}>
                <Text style={{ fontSize: 13.5, fontWeight: '500', color: c.text }}>{opt}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>

      {/* Results */}
      <ScrollView
        // Extra bottom room so the floating + button never sits over a card.
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 90 }}
        showsVerticalScrollIndicator={false}>
        {recipes.length === 0 ? (
          <View style={{ alignItems: 'center', paddingTop: 56, paddingHorizontal: 30 }}>
            <View style={{ width: 100, height: 100, borderRadius: 50, backgroundColor: c.chipBg }} />
            <Text style={{ marginTop: 18, fontSize: 17, fontWeight: '700', color: c.text }}>
              No recipes match
            </Text>
            <Text
              style={{
                marginTop: 6,
                fontSize: 14,
                lineHeight: 20,
                color: c.textSec,
                textAlign: 'center',
              }}>
              {filtersActive
                ? 'Try loosening your filters or clearing the chip above.'
                : 'Import your first recipe to get started.'}
            </Text>
          </View>
        ) : view === 'grid' ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>
            {recipes.map((r) => (
              <View key={r.id} style={{ width: '47%', flexGrow: 1 }}>
                <RecipeGridCard recipe={r} onPress={() => router.push({ pathname: '/recipe/[id]', params: { id: r.id } })} />
              </View>
            ))}
          </View>
        ) : (
          recipes.map((r) => <RecipeListRow key={r.id} recipe={r} onPress={() => router.push({ pathname: '/recipe/[id]', params: { id: r.id } })} />)
        )}
      </ScrollView>
    </Screen>
  );
}
