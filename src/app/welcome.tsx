import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Screen } from '@/components/ui';
import { WELCOME_PAGES } from '@/data/sample';
import { useColors } from '@/theme/theme-context';

/** Screen 1 — Welcome carousel (3 pages). */
export default function Welcome() {
  const c = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [page, setPage] = useState(0);

  const current = WELCOME_PAGES[page];

  const next = () => {
    if (page < WELCOME_PAGES.length - 1) setPage(page + 1);
    else router.push('/quiz');
  };

  return (
    <Screen style={{ paddingTop: insets.top + 14 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 20 }}>
        <Pressable onPress={() => router.push('/sign-in')} accessibilityRole="button">
          <Text style={{ fontSize: 15, fontWeight: '500', color: c.textSec }}>Skip</Text>
        </Pressable>
      </View>

      <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 8 }}>
        <Image
          source={current.image}
          // React Native's own Image, not expo-image: on web the latter never
          // starts fetching a require()d asset, leaving it stuck at opacity 0.
          // The artwork is portrait and pre-framed, so contain keeps the whole
          // composition visible rather than cropping the logo out.
          resizeMode="contain"
          accessibilityLabel={current.headline}
          style={{
            flex: 1,
            minHeight: 260,
            width: '100%',
            borderRadius: 20,
          }}
        />

        <Text
          style={{
            marginTop: 28,
            fontSize: 26,
            lineHeight: 31,
            fontWeight: '700',
            color: c.text,
            letterSpacing: -0.4,
          }}>
          {current.headline}
        </Text>
        <Text style={{ marginTop: 8, fontSize: 15, lineHeight: 21, color: c.textSec }}>
          {current.body}
        </Text>

        <View style={{ flexDirection: 'row', gap: 6, marginVertical: 20 }}>
          {WELCOME_PAGES.map((_, i) => (
            <Pressable
              key={i}
              onPress={() => setPage(i)}
              accessibilityRole="button"
              accessibilityLabel={`Go to page ${i + 1}`}
              style={{
                width: i === page ? 22 : 7,
                height: 7,
                borderRadius: 4,
                backgroundColor: i === page ? c.accent : c.chipBg,
              }}
            />
          ))}
        </View>
      </View>

      <View style={{ paddingHorizontal: 24, paddingTop: 8, paddingBottom: insets.bottom + 20 }}>
        <Button title="Continue" onPress={next} />
      </View>
    </Screen>
  );
}
