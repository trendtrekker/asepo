import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Animated, Easing, Image, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Screen } from '@/components/ui';
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
      <Animated.Image
        source={require('../../assets/images/primer-notifications.png')}
        resizeMode="contain"
        accessibilityLabel="Meal-prep reminders"
        style={{
          width: 200,
          height: 200,
          // A gentle breathing scale rather than the old opacity pulse — the
          // illustration is already complete, so it just needs to feel alive.
          transform: [{ scale: pulse.interpolate({ inputRange: [0.4, 1], outputRange: [0.97, 1.02] }) }],
        }}
      />

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
