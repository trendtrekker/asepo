import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Check } from '@/components/icons';
import { Button, Screen } from '@/components/ui';
import { api, IMPORT_PIPELINE } from '@/lib/api';
import { safeBack } from '@/lib/navigation';
import { useStore } from '@/store/app-store';
import { useColors } from '@/theme/theme-context';

/** Screen 8 — Importing progress, driven by the real extraction API. */
export default function Importing() {
  const c = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { recordImport, setPendingImport, pendingImportSource, aiConsentGiven } = useStore();

  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | undefined>(undefined);
  /**
   * The backend names each stage as it reaches it — "Reading the caption" for a
   * TikTok, "Reading the page" for a website. Start from the generic list and
   * replace each entry as the real label arrives.
   */
  const [labels, setLabels] = useState<string[]>([...IMPORT_PIPELINE]);
  const pulse = useRef(new Animated.Value(0.4)).current;
  const readyPop = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 650, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.4, duration: 650, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  useEffect(() => {
    // Reached directly (deep link, stale reload) with nothing queued up —
    // there's nothing to extract, so send the user back rather than fail
    // against an empty source.
    if (!pendingImportSource) {
      router.replace('/add');
      return;
    }

    // First AI-backed import of the install — get consent before the source
    // (photo, link, or text) leaves the device. The consent screen resumes
    // straight back here once granted.
    if (!aiConsentGiven) {
      router.replace('/ai-consent');
      return;
    }

    let cancelled = false;

    api
      .extractRecipe(pendingImportSource, (p) => {
        if (cancelled) return;
        setStep(p.step);
        // The backend sends its full stage list on the first tick; fall back to
        // patching individual labels if only one arrives.
        if (p.labels?.length) setLabels(p.labels);
        else if (p.label) {
          setLabels((current) => current.map((existing, i) => (i === p.step ? p.label : existing)));
        }
      })
      .then((extracted) => {
        if (cancelled) return;
        setStep(IMPORT_PIPELINE.length - 1);
        setDone(true);
        setPreviewImageUrl(extracted.imageUrl);
        Animated.spring(readyPop, { toValue: 1, friction: 5, tension: 60, useNativeDriver: true }).start();
        // Hand the result to the review screen, which owns saving it.
        setPendingImport(extracted);
        recordImport();
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : String(e));
      });

    return () => {
      cancelled = true;
    };
    // Deliberately runs once per mount only. recordImport/setPendingImport/router
    // aren't reactive inputs here — they're action handles — and including them
    // used to be actively harmful: recordImport() is called below, which bumps
    // importsUsed, which gives the store's memoized value (and therefore this
    // same recordImport reference) a new identity, which re-fired this effect
    // and restarted the whole extraction from scratch. `done` never got reset
    // by that restart, so the UI showed a stale "done" banner next to a step
    // counter that had jumped back to 0.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Extraction failures get their own screen rather than a dead-end spinner.
  useEffect(() => {
    if (error) router.replace({ pathname: '/add/failed', params: { message: error } });
  }, [error, router]);

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          alignItems: 'center',
          paddingHorizontal: 28,
          paddingTop: insets.top + 42,
          paddingBottom: insets.bottom + 20,
        }}
        showsVerticalScrollIndicator={false}>
        <Animated.Image
          source={require('../../../assets/images/importing.png')}
          resizeMode="contain"
          accessibilityLabel="Reading the recipe"
          style={{
            width: 168,
            height: 168,
            // Keep the pulse so it still reads as "working", but on the whole
            // illustration rather than a bare square inside a frame.
            opacity: pulse.interpolate({ inputRange: [0.4, 1], outputRange: [0.7, 1] }),
            transform: [{ scale: pulse.interpolate({ inputRange: [0.4, 1], outputRange: [0.97, 1.02] }) }],
          }}
        />

        <Text
          style={{ marginTop: 26, fontSize: 21, fontWeight: '700', color: c.text, textAlign: 'center' }}>
          Reading your recipe…
        </Text>

        <View style={{ gap: 14, marginTop: 28, width: '100%' }}>
          {labels.map((label, i) => {
            const complete = i < step || (i === step && done);
            const active = i === step && !done;
            return (
              <View key={label} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 11,
                    backgroundColor: complete ? c.success : active ? c.accent : c.chipBg,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  {complete ? <Check color="#fff" /> : null}
                </View>
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: '500',
                    color: complete || active ? c.text : c.textSec,
                  }}>
                  {label}
                </Text>
              </View>
            );
          })}
        </View>

        {done ? (
          <View
            style={{
              marginTop: 24,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              backgroundColor: c.chipBg,
              borderRadius: 14,
              paddingVertical: 10,
              paddingHorizontal: 14,
              width: '100%',
            }}>
            {previewImageUrl ? (
              <Image
                source={{ uri: previewImageUrl }}
                accessibilityLabel="Recipe preview"
                style={{ width: 44, height: 44, borderRadius: 10 }}
              />
            ) : (
              <Animated.View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: c.success,
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: readyPop,
                  transform: [{ scale: readyPop }],
                }}>
                <Check color="#fff" />
              </Animated.View>
            )}
            <Text style={{ fontSize: 13, fontWeight: '500', color: c.textSec }}>
              {previewImageUrl ? 'Source preview ready' : 'Recipe ready — adding a photo next'}
            </Text>
          </View>
        ) : null}

        <View style={{ flex: 1 }} />

        <Button title="Cancel" variant="plain" onPress={() => safeBack(router, '/add')} />
        {done ? (
          <Button
            title="See recipe"
            onPress={() => router.replace('/add/review')}
            style={{ marginTop: 12, width: '100%' }}
          />
        ) : null}
      </ScrollView>
    </Screen>
  );
}
