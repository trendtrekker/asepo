import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, Text, View } from 'react-native';

import { useColors } from '@/theme/theme-context';

/** Screen 0 — Splash. Fades in, then hands off to the welcome carousel. */
export default function SplashScreen() {
  const c = useColors();
  const router = useRouter();
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 900,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();

    const t = setTimeout(() => router.replace('/welcome'), 1600);
    return () => clearTimeout(t);
  }, [anim, router]);

  return (
    <Pressable
      onPress={() => router.replace('/welcome')}
      style={{ flex: 1, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View
        style={{
          alignItems: 'center',
          opacity: anim,
          transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) }],
        }}>
        <View
          style={{
            width: 96,
            height: 96,
            borderRadius: 28,
            backgroundColor: c.accent,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: c.accent,
            shadowOpacity: 0.35,
            shadowRadius: 28,
            shadowOffset: { width: 0, height: 12 },
            elevation: 8,
          }}>
          <View style={{ width: 44, height: 44, borderRadius: 12, borderWidth: 3, borderColor: '#fff' }} />
        </View>
        <Text
          style={{
            marginTop: 22,
            fontSize: 30,
            fontWeight: '700',
            color: c.text,
            letterSpacing: -0.5,
          }}>
          Asepo
        </Text>
        <Text style={{ marginTop: 8, fontSize: 15, fontWeight: '500', color: c.textSec }}>
          Save. Cook. Plan.
        </Text>
      </Animated.View>
    </Pressable>
  );
}
