import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Animated, Easing, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, PhotoPlaceholder, Screen } from '@/components/ui';
import { useColors } from '@/theme/theme-context';

/** Screen 6 — Notification permission primer. */
export default function NotificationPrimer() {
  const c = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const pulse = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.4,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  // Replace with expo-notifications requestPermissionsAsync() when wiring the backend.
  const goNext = () => router.replace('/(tabs)/home');

  return (
    <Screen
      style={{
        alignItems: 'center',
        paddingHorizontal: 28,
        paddingTop: insets.top + 56,
        paddingBottom: insets.bottom + 20,
      }}>
      <PhotoPlaceholder
        style={{
          width: 180,
          height: 180,
          borderRadius: 40,
          borderWidth: 1,
          borderColor: c.border,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Animated.View
          style={{
            width: 64,
            height: 64,
            borderRadius: 20,
            backgroundColor: c.accent,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pulse,
          }}>
          <View
            style={{ width: 26, height: 26, borderRadius: 8, borderWidth: 2.5, borderColor: '#fff' }}
          />
        </Animated.View>
      </PhotoPlaceholder>

      <Text
        style={{
          marginTop: 30,
          fontSize: 25,
          lineHeight: 33,
          fontWeight: '700',
          color: c.text,
          textAlign: 'center',
          letterSpacing: -0.3,
        }}>
        Never miss meal prep
      </Text>
      <Text
        style={{
          marginTop: 8,
          fontSize: 15,
          lineHeight: 21,
          color: c.textSec,
          textAlign: 'center',
        }}>
        We'll remind you to plan meals, defrost ingredients, and grab groceries before you run out
      </Text>

      <View style={{ flex: 1 }} />

      <View style={{ gap: 12, width: '100%' }}>
        <Button title="Enable notifications" onPress={goNext} />
        <Button title="Not now" variant="plain" onPress={goNext} />
      </View>
    </Screen>
  );
}
