import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Refresh } from '@/components/icons';
import { RecipeCarouselCard } from '@/components/recipe-card';
import { RecipeImage } from '@/components/recipe-image';
import { Button, Screen } from '@/components/ui';
import { MEAL_FILL, timeLabel, type Recipe } from '@/data/sample';
import { addDays, fromIso, todayIso, weekdayShort } from '@/lib/dates';
import { sortRecipes } from '@/lib/filter-recipes';
import { useStore } from '@/store/app-store';
import { useColors } from '@/theme/theme-context';
import { useToast } from '@/components/toast';

/** Screen 14 — Home. */
export default function Home() {
  const toast = useToast();
  const { recipes: allRecipes, recipesLoading, plan, grocery, getRecipe } = useStore();
  const c = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!refreshing) return;
    spin.setValue(0);
    const anim = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 800,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    anim.start();
    const t = setTimeout(() => setRefreshing(false), 900);
    return () => {
      anim.stop();
      clearTimeout(t);
    };
  }, [refreshing, spin]);

  const recentlySaved = sortRecipes(allRecipes, 'Recently added').slice(0, 6);
  const cookItAgain = sortRecipes(allRecipes, 'Most cooked').slice(0, 6);
  // Whatever's actually planned for today's Dinner slot — not just the most
  // recently added recipe, which has nothing to do with tonight.
  const todaysDinner = plan.find((e) => e.date === todayIso() && e.slot === 'Dinner');
  const tonight: Recipe | undefined = todaysDinner ? getRecipe(todaysDinner.recipeId) : undefined;


  return (
    <Screen>
      <ScrollView
        // Extra bottom room so the floating + button never sits over a card.
        contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 90 }}
        showsVerticalScrollIndicator={false}>
        {/* Greeting */}
        <View
          style={{
            paddingHorizontal: 20,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
          <Text style={{ fontSize: 25, fontWeight: '700', color: c.text, letterSpacing: -0.4 }}>
            Good evening, Alex
          </Text>
          <Pressable
            onPress={() => setRefreshing(true)}
            accessibilityRole="button"
            accessibilityLabel="Refresh"
            style={{
              width: 34,
              height: 34,
              borderRadius: 17,
              backgroundColor: c.chipBg,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Animated.View
              style={{
                transform: [
                  {
                    rotate: spin.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', '360deg'],
                    }),
                  },
                ],
              }}>
              <Refresh color={c.text} />
            </Animated.View>
          </Pressable>
        </View>

        {/* Tonight's dinner */}
        {tonight ? (
          <View
            style={{
              marginHorizontal: 20,
              marginTop: 16,
              borderRadius: 20,
              overflow: 'hidden',
              backgroundColor: c.surface,
              borderWidth: 1,
              borderColor: c.border,
            }}>
            <RecipeImage recipe={tonight} glyph={56} style={{ height: 130 }} />
            <View style={{ padding: 14 }}>
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: '700',
                  color: c.accent,
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                }}>
                Tonight's dinner
              </Text>
              <Text style={{ marginTop: 4, fontSize: 18, fontWeight: '700', color: c.text }}>
                {tonight.title}
              </Text>
              <Text style={{ marginTop: 2, fontSize: 13, color: c.textSec }}>
                {timeLabel(tonight)} · Serves {tonight.servings}
              </Text>
              <Button
                title="Cook"
                height={44}
                style={{ marginTop: 12, borderRadius: 22 }}
                onPress={() => router.push({ pathname: '/cook/[id]', params: { id: tonight.id } })}
              />
            </View>
          </View>
        ) : (
          <View
            style={{
              marginHorizontal: 20,
              marginTop: 16,
              minHeight: 150,
              borderRadius: 20,
              backgroundColor: c.chipBg,
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
              paddingVertical: 20,
            }}>
            <Text style={{ fontSize: 14, color: c.textSec }}>
              {recipesLoading
                ? 'Loading your recipes…'
                : allRecipes.length === 0
                  ? 'No recipes yet'
                  : 'Nothing planned for dinner tonight'}
            </Text>
            {!recipesLoading && allRecipes.length > 0 ? (
              <Button
                title="Plan dinner"
                variant="tinted"
                height={40}
                onPress={() => router.push('/(tabs)/plan')}
              />
            ) : null}
          </View>
        )}

        <Carousel title="Recently saved" recipes={recentlySaved} />
        <Carousel title="Cook it again" recipes={cookItAgain} />

        {/* Week strip */}
        <View style={{ marginTop: 12, paddingHorizontal: 20 }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: c.text }}>Your week</Text>
          <View style={{ flexDirection: 'row', gap: 7, marginTop: 12 }}>
            {Array.from({ length: 7 }, (_, i) => addDays(todayIso(), i)).map((iso, i) => {
              const today = i === 0;
              return (
                <Pressable
                  key={iso}
                  onPress={() => router.push('/(tabs)/plan')}
                  accessibilityRole="button"
                  accessibilityLabel={`${weekdayShort(iso)} ${fromIso(iso).getDate()}`}
                  style={{
                    flex: 1,
                    alignItems: 'center',
                    gap: 6,
                    paddingVertical: 10,
                    borderRadius: 14,
                    backgroundColor: today ? c.accentTint : c.chipBg,
                  }}>
                  <Text
                    style={{ fontSize: 10.5, fontWeight: '600', color: today ? c.accent : c.text }}>
                    {weekdayShort(iso)}
                  </Text>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: today ? c.accent : c.text }}>
                    {fromIso(iso).getDate()}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 2 }}>
                    {MEAL_FILL[i].map((filled, j) => (
                      <View
                        key={j}
                        style={{
                          width: 4,
                          height: 4,
                          borderRadius: 2,
                          backgroundColor: filled ? c.accent : c.border,
                        }}
                      />
                    ))}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Stats */}
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 22, paddingHorizontal: 20 }}>
          <Stat value={String(allRecipes.length)} label="Recipes saved" />
          <Stat value={String(plan.length)} label="Meals planned" />
          <Stat value={String(grocery.length)} label="Grocery items" />
        </View>
      </ScrollView>
    </Screen>
  );
}

function Carousel({ title, recipes }: { title: string; recipes: Recipe[] }) {
  const c = useColors();
  const router = useRouter();
  return (
    <View style={{ marginTop: 24 }}>
      <Text style={{ paddingHorizontal: 20, fontSize: 18, fontWeight: '700', color: c.text }}>
        {title}
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 12, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 4 }}>
        {recipes.map((r) => (
          <RecipeCarouselCard key={r.id} recipe={r} onPress={() => router.push({ pathname: '/recipe/[id]', params: { id: r.id } })} />
        ))}
      </ScrollView>
    </View>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  const c = useColors();
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: c.chipBg,
        borderRadius: 16,
        padding: 14,
        alignItems: 'center',
      }}>
      <Text style={{ fontSize: 21, fontWeight: '700', color: c.text }}>{value}</Text>
      <Text style={{ fontSize: 11.5, fontWeight: '500', color: c.textSec }}>{label}</Text>
    </View>
  );
}
