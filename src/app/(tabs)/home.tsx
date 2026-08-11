import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FadeIn } from '@/components/fade-in';
import { Refresh } from '@/components/icons';
import { useAnimatedValue } from '@/lib/use-animated-value';
import { RecipeCarouselCard } from '@/components/recipe-card';
import { RecipeImage } from '@/components/recipe-image';
import { Button, Screen } from '@/components/ui';
import { timeLabel, type Recipe } from '@/data/sample';
import { addDays, fromIso, todayIso, weekdayShort } from '@/lib/dates';
import { sortRecipes } from '@/lib/filter-recipes';
import { MEAL_SLOTS, useStore, type MealSlot, type PlanEntry } from '@/store/app-store';
import { useColors } from '@/theme/theme-context';

/** "Good morning" until noon, "Good afternoon" until 6pm, then evening. */
function greetingFor(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

/** Which meal slot is "now", so the hero opens on the meal that's actually relevant. */
function currentSlotFor(hour: number): MealSlot {
  if (hour < 10) return 'Breakfast';
  if (hour < 14) return 'Lunch';
  if (hour < 20) return 'Dinner';
  return 'Snack';
}

/** "Tonight's Dinner", "Today's Breakfast", "Tomorrow's Lunch", "Fri's Snack". */
function heroLabel(entryDate: string, slot: MealSlot): string {
  const today = todayIso();
  const when =
    entryDate === today
      ? slot === 'Dinner'
        ? 'Tonight'
        : 'Today'
      : entryDate === addDays(today, 1)
        ? 'Tomorrow'
        : weekdayShort(entryDate);
  return `${when}’s ${slot}`;
}

/**
 * Picks which day's meals the hero shows, and which one it opens on.
 *
 * Today's planned meals if there are any — opening on whichever slot is
 * "now" rather than always the first one, so checking the app at 7am opens
 * on breakfast, not a dinner that's twelve hours off. If nothing's planned
 * today, falls forward to the next day that has anything planned at all,
 * so the hero isn't empty just because today happens to be unplanned.
 */
const bySlotOrder = (a: PlanEntry, b: PlanEntry) => MEAL_SLOTS.indexOf(a.slot) - MEAL_SLOTS.indexOf(b.slot);

function pickHeroDay(plan: PlanEntry[]): { entries: PlanEntry[]; initialIndex: number } {
  const today = todayIso();
  // A slot can hold more than one meal (Plan supports adding several) — this
  // used to pick only the first entry per slot via .find(), silently
  // dropping a second lunch or dinner from the hero.
  const todaysEntries = plan.filter((e) => e.date === today).sort(bySlotOrder);

  if (todaysEntries.length > 0) {
    const currentIndex = MEAL_SLOTS.indexOf(currentSlotFor(new Date().getHours()));
    const initialIndex = todaysEntries.findIndex((e) => MEAL_SLOTS.indexOf(e.slot) >= currentIndex);
    return { entries: todaysEntries, initialIndex: initialIndex === -1 ? todaysEntries.length - 1 : initialIndex };
  }

  const nextDate = plan
    .filter((e) => e.date > today)
    .map((e) => e.date)
    .sort()[0];
  if (!nextDate) return { entries: [], initialIndex: 0 };

  const nextDayEntries = plan.filter((e) => e.date === nextDate).sort(bySlotOrder);
  return { entries: nextDayEntries, initialIndex: 0 };
}

/** Screen 14 — Home. */
export default function Home() {
  const { recipes: allRecipes, recipesLoading, plan, grocery, getRecipe, profileName } = useStore();
  const c = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const spin = useAnimatedValue(0);

  const greeting = greetingFor(new Date().getHours());
  const name = profileName.trim();

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
  // The hero used to only ever show today's Dinner slot, sitting empty the
  // rest of the day if that one slot was unplanned even when other meals
  // weren't. Now it's every meal actually planned "now" (today, falling
  // forward to the next planned day), opened on whichever slot fits the
  // current time.
  const { entries: heroEntries, initialIndex: heroInitialIndex } = pickHeroDay(plan);
  const heroCards = heroEntries
    .map((entry) => ({ entry, recipe: getRecipe(entry.recipeId) }))
    .filter((c): c is { entry: PlanEntry; recipe: Recipe } => Boolean(c.recipe));


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
            {/* Both halves used to be hardcoded — it greeted every user as
                "Alex" and said "Good evening" at any hour. Drop the name
                entirely rather than inventing one when none is set. */}
            {greeting}
            {name ? `, ${name}` : ''}
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

        {/* This meal, now */}
        <FadeIn>
          {heroCards.length > 0 ? (
            <HeroCarousel cards={heroCards} initialIndex={Math.min(heroInitialIndex, heroCards.length - 1)} />
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
                    : 'Nothing planned yet'}
              </Text>
              {!recipesLoading && allRecipes.length > 0 ? (
                <Button
                  title="Plan a meal"
                  variant="tinted"
                  height={40}
                  onPress={() => router.push('/(tabs)/plan')}
                />
              ) : null}
            </View>
          )}
        </FadeIn>

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
                  onPress={() => router.push({ pathname: '/(tabs)/plan', params: { date: iso } })}
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
                    {MEAL_SLOTS.map((slot) => {
                      const filled = plan.some((e) => e.date === iso && e.slot === slot);
                      return (
                        <View
                          key={slot}
                          style={{
                            width: 4,
                            height: 4,
                            borderRadius: 2,
                            backgroundColor: filled ? c.accent : c.border,
                          }}
                        />
                      );
                    })}
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
  // A heading over an empty row reads as something failing to load. On a
  // fresh install both carousels are empty, so Home opened on two orphaned
  // titles — better to show nothing until there's something to show.
  if (recipes.length === 0) return null;
  return (
    <View style={{ marginTop: 24 }}>
      <Text style={{ paddingHorizontal: 20, fontSize: 18, fontWeight: '700', color: c.text }}>
        {title}
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 12, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 4 }}>
        {recipes.map((r, i) => (
          <FadeIn key={r.id} delay={i * 40}>
            <RecipeCarouselCard recipe={r} onPress={() => router.push({ pathname: '/recipe/[id]', params: { id: r.id } })} />
          </FadeIn>
        ))}
      </ScrollView>
    </View>
  );
}

/**
 * The hero, now a swipeable strip instead of a single fixed card — one card
 * per meal actually planned for the relevant day, opened on whichever slot
 * fits the current time (see pickHeroDay). A single card behaves exactly
 * like the old fixed hero; more than one adds paging dots underneath.
 */
function HeroCarousel({
  cards,
  initialIndex,
}: {
  cards: { entry: PlanEntry; recipe: Recipe }[];
  initialIndex: number;
}) {
  const c = useColors();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const cardWidth = width - 40;
  const gap = 12;
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const scrollRef = useRef<ScrollView>(null);

  // The contentOffset prop is only an initial layout hint and isn't reliably
  // honored (especially on web) — an imperative scroll once the ScrollView
  // has actually measured its content is the one that sticks.
  useEffect(() => {
    if (initialIndex === 0) return;
    const t = setTimeout(
      () => scrollRef.current?.scrollTo({ x: initialIndex * (cardWidth + gap), animated: false }),
      0
    );
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A short, deliberate swipe often ends without triggering RN's "momentum"
  // phase at all, so onMomentumScrollEnd alone left the dot stuck on the
  // previous card. Tracking onScroll directly keeps the dot glued to
  // whatever's actually on screen throughout the drag, not just at the end.
  const updateActiveFromOffset = (x: number) => {
    const index = Math.max(0, Math.min(cards.length - 1, Math.round(x / (cardWidth + gap))));
    setActiveIndex((prev) => (prev === index ? prev : index));
  };

  return (
    <View style={{ marginTop: 16 }}>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={cardWidth + gap}
        decelerationRate="fast"
        contentContainerStyle={{ paddingHorizontal: 20, gap }}
        onScroll={(e) => updateActiveFromOffset(e.nativeEvent.contentOffset.x)}
        scrollEventThrottle={16}
        onScrollEndDrag={(e) => updateActiveFromOffset(e.nativeEvent.contentOffset.x)}
        onMomentumScrollEnd={(e) => updateActiveFromOffset(e.nativeEvent.contentOffset.x)}>
        {cards.map(({ entry, recipe }) => (
          <View
            key={entry.id}
            style={{
              width: cardWidth,
              borderRadius: 20,
              overflow: 'hidden',
              backgroundColor: c.surface,
              borderWidth: 1,
              borderColor: c.border,
            }}>
            <RecipeImage recipe={recipe} glyph={56} style={{ height: 130 }} />
            <View style={{ padding: 14 }}>
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: '700',
                  color: c.accent,
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                }}>
                {heroLabel(entry.date, entry.slot)}
              </Text>
              <Text style={{ marginTop: 4, fontSize: 18, fontWeight: '700', color: c.text }}>
                {recipe.title}
              </Text>
              <Text style={{ marginTop: 2, fontSize: 13, color: c.textSec }}>
                {timeLabel(recipe)} · Serves {entry.servings}
              </Text>
              <Button
                title="Cook"
                height={44}
                style={{ marginTop: 12, borderRadius: 22 }}
                onPress={() => router.push({ pathname: '/cook/[id]', params: { id: recipe.id } })}
              />
            </View>
          </View>
        ))}
      </ScrollView>

      {cards.length > 1 ? (
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 10 }}>
          {cards.map((card, i) => (
            <View
              key={card.entry.id}
              style={{
                width: i === activeIndex ? 16 : 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: i === activeIndex ? c.accent : c.border,
              }}
            />
          ))}
        </View>
      ) : null}
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
