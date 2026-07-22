import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Animated, Easing, Image, Pressable, Text, View } from 'react-native';

import { BRAND_NAVY } from '@/theme/tokens';

/**
 * Screen 0 — Splash. Fades in, then hands off to the welcome carousel.
 *
 * Deliberately matches the native splash in app.json (same navy, same mark), so
 * the handover from the launch screen to the first React frame is invisible
 * rather than a flash of a different colour.
 */
export default function SplashScreen() {
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
      style={{ flex: 1, backgroundColor: BRAND_NAVY, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View
        style={{
          alignItems: 'center',
          opacity: anim,
          transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) }],
        }}>
        <View style={{ width: 128, height: 128, borderRadius: 30, overflow: 'hidden' }}>
          <Image
            source={require('../../assets/images/brand-icon.png')}
            resizeMode="cover"
            accessibilityLabel="Asepo"
            style={{ width: '100%', height: '100%' }}
          />
        </View>
        <Text
          style={{
            marginTop: 22,
            fontSize: 30,
            fontWeight: '700',
            color: '#FFFFFF',
            letterSpacing: -0.5,
          }}>
          Asepo
        </Text>
        <Text style={{ marginTop: 8, fontSize: 15, fontWeight: '500', color: 'rgba(255,255,255,0.65)' }}>
          Save. Cook. Plan.
        </Text>
      </Animated.View>
    </Pressable>
  );
}
