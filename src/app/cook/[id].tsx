import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Check, Close } from '@/components/icons';
import { useToast } from '@/components/toast';
import { Button } from '@/components/ui';
import { useKeepScreenAwake } from '@/lib/keep-awake';
import { useStore } from '@/store/app-store';
import { convertMeasure } from '@/lib/quantity';
import { extractTimer, formatCountdown } from '@/lib/steps';
import { cancelTimerNotification, scheduleTimerDone } from '@/lib/timer-notifications';
import { darkColors } from '@/theme/tokens';

/**
 * Cook mode — immersive, always-dark regardless of app theme (you're reading it
 * across a kitchen), screen kept awake, one step at a time.
 */
export default function CookMode() {
  useKeepScreenAwake();

  const router = useRouter();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const { id, step: stepParam } = useLocalSearchParams<{ id: string; step?: string }>();
  const { getRecipe } = useStore();

  const recipe = getRecipe(id);
  const [index, setIndex] = useState(() => {
    const n = Number(stepParam);
    return Number.isFinite(n) && n > 0 ? n : 0;
  });
  const [done, setDone] = useState(false);
  const [rating, setRating] = useState(0);
  const [showIngredients, setShowIngredients] = useState(false);

  const steps = recipe?.instructions ?? [];
  const current = steps[index];
  const timer = extractTimer(current ?? '');

  // Countdown for the current step's timer.
  const [remaining, setRemaining] = useState<number | null>(null);
  const [running, setRunning] = useState(false);
  const tick = useRef<ReturnType<typeof setInterval> | null>(null);
  const remainingRef = useRef<number | null>(null);
  const notificationId = useRef<string | null>(null);
  useEffect(() => {
    remainingRef.current = remaining;
  }, [remaining]);

  const stopTimer = useCallback(() => {
    if (tick.current) clearInterval(tick.current);
    tick.current = null;
    setRunning(false);
  }, []);

  useEffect(() => {
    if (!running) return;

    // Real, background-capable alert on top of the live countdown below —
    // the countdown alone only works while this screen is on screen and the
    // app is in the foreground.
    if (remainingRef.current) {
      scheduleTimerDone(recipe?.title ?? 'Recipe', timer?.label ?? 'Timer', remainingRef.current).then(
        (id) => {
          notificationId.current = id;
        }
      );
    }

    tick.current = setInterval(() => {
      setRemaining((r) => {
        if (r === null) return r;
        if (r <= 1) {
          if (tick.current) clearInterval(tick.current);
          tick.current = null;
          // Already fired (or about to, within a second) — nothing to cancel.
          notificationId.current = null;
          setRunning(false);
          toast.show('Timer done');
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => {
      if (tick.current) clearInterval(tick.current);
      tick.current = null;
      cancelTimerNotification(notificationId.current);
      notificationId.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, toast]);

  // Reset the timer whenever the step changes.
  useEffect(() => {
    stopTimer();
    setRemaining(null);
  }, [index, stopTimer]);

  // Deep links (share URLs, notifications) have no history to pop, so fall
  // back to the recipe rather than leaving a dead exit button.
  const exit = () =>
    router.canGoBack() ? router.back() : router.replace({ pathname: `/recipe/[id]`, params: { id: String(id) } });

  const c = darkColors;

  if (!recipe) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: c.text, fontSize: 17, fontWeight: '700' }}>Recipe not found</Text>
        <Button title="Close" variant="plain" onPress={exit} />
      </View>
    );
  }

  const isLast = index === steps.length - 1;

  const next = () => (isLast ? setDone(true) : setIndex((i) => i + 1));
  const prev = () => setIndex((i) => Math.max(0, i - 1));

  /* ---------------- completion ---------------- */
  if (done) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: c.bg,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 32,
          paddingBottom: insets.bottom + 20,
        }}>
        <View
          style={{
            width: 76,
            height: 76,
            borderRadius: 38,
            backgroundColor: c.success,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Check color="#fff" size={34} />
        </View>
        <Text style={{ marginTop: 20, fontSize: 26, fontWeight: '700', color: c.text }}>
          Nice work!
        </Text>
        <Text style={{ marginTop: 8, fontSize: 15, color: c.textSec, textAlign: 'center' }}>
          You cooked {recipe.title}
        </Text>

        <View style={{ flexDirection: 'row', gap: 8, marginTop: 24 }}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Pressable
              key={n}
              onPress={() => setRating(n)}
              accessibilityRole="button"
              accessibilityLabel={`Rate ${n} stars`}>
              <Text style={{ fontSize: 32, color: n <= rating ? c.accent : c.border }}>★</Text>
            </Pressable>
          ))}
        </View>

        <View style={{ width: '100%', gap: 12, marginTop: 32 }}>
          <Button
            title="Add a note"
            variant="tinted"
            onPress={() => toast.show('Recipe notes aren’t designed yet')}
          />
          <Button
            title="Cook again"
            variant="secondary"
            onPress={() => {
              setDone(false);
              setIndex(0);
            }}
          />
          <Button title="Done" onPress={exit} />
        </View>
      </View>
    );
  }

  /* ---------------- stepping ---------------- */
  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top + 8 }}>
      {/* Top bar */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          paddingHorizontal: 16,
        }}>
        <Pressable
          onPress={exit}
          accessibilityRole="button"
          accessibilityLabel="Exit cook mode"
          style={{
            width: 34,
            height: 34,
            borderRadius: 17,
            backgroundColor: c.chipBg,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Close color={c.text} />
        </Pressable>
        <Text style={{ flex: 1, fontSize: 13, fontWeight: '600', color: c.textSec }}>
          Step {index + 1} of {steps.length}
        </Text>
        {remaining !== null ? (
          <Pressable
            onPress={() => setRunning((r) => !r)}
            accessibilityRole="button"
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              paddingVertical: 7,
              paddingHorizontal: 14,
              borderRadius: 18,
              backgroundColor: remaining === 0 ? c.success : c.accentTint2,
            }}>
            <Text
              style={{
                fontSize: 14,
                fontWeight: '700',
                color: remaining === 0 ? '#fff' : c.accent,
                fontVariant: ['tabular-nums'],
              }}>
              {formatCountdown(remaining)}
            </Text>
            <Text style={{ fontSize: 12, color: remaining === 0 ? '#fff' : c.accent }}>
              {remaining === 0 ? 'done' : running ? '❚❚' : '▶'}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {/* Progress */}
      <View style={{ flexDirection: 'row', gap: 4, paddingHorizontal: 16, marginTop: 14 }}>
        {steps.map((_, i) => (
          <View
            key={i}
            style={{
              flex: 1,
              height: 4,
              borderRadius: 2,
              backgroundColor: i <= index ? c.accent : c.chipBg,
            }}
          />
        ))}
      </View>

      {/* Step body */}
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 28 }}>
        <Text style={{ fontSize: 15, fontWeight: '700', color: c.accent, letterSpacing: 0.6 }}>
          STEP {index + 1}
        </Text>
        <Text style={{ marginTop: 14, fontSize: 27, lineHeight: 38, fontWeight: '600', color: c.text }}>
          {current}
        </Text>

        {timer && remaining === null ? (
          <Pressable
            onPress={() => {
              setRemaining(Math.round(timer.minutes * 60));
              setRunning(true);
            }}
            accessibilityRole="button"
            style={{
              alignSelf: 'flex-start',
              marginTop: 22,
              paddingVertical: 12,
              paddingHorizontal: 20,
              borderRadius: 24,
              backgroundColor: c.accentTint2,
            }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: c.accent }}>
              Start {timer.label} timer
            </Text>
          </Pressable>
        ) : null}
      </ScrollView>

      {/* Ingredients peek */}
      {showIngredients ? (
        <View
          style={{
            marginHorizontal: 16,
            marginBottom: 10,
            padding: 16,
            borderRadius: 16,
            backgroundColor: c.surface,
            maxHeight: 220,
          }}>
          <ScrollView>
            {recipe.ingredients.map((ing, i) => {
              const m = convertMeasure(ing.qty, ing.unit, 1, false);
              return (
                <Text key={i} style={{ fontSize: 14.5, lineHeight: 26, color: c.text }}>
                  <Text style={{ fontWeight: '700' }}>
                    {m.qty}
                    {m.unit ? ` ${m.unit}` : ''}
                  </Text>{' '}
                  {ing.name}
                </Text>
              );
            })}
          </ScrollView>
        </View>
      ) : null}

      {/* Bottom controls */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          paddingHorizontal: 16,
          paddingBottom: insets.bottom + 14,
        }}>
        <Pressable
          onPress={() => setShowIngredients((s) => !s)}
          accessibilityRole="button"
          style={{
            paddingVertical: 14,
            paddingHorizontal: 16,
            borderRadius: 26,
            backgroundColor: c.chipBg,
          }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: c.text }}>
            {showIngredients ? 'Hide' : 'Ingredients'}
          </Text>
        </Pressable>

        {index > 0 ? (
          <Button title="Back" variant="tinted" style={{ flex: 1 }} onPress={prev} />
        ) : null}
        <Button
          title={isLast ? 'Finish' : 'Next step'}
          style={{ flex: 1.6 }}
          onPress={next}
        />
      </View>
    </View>
  );
}
