import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Animated, Easing, Image, Pressable, Text, View } from 'react-native';

import { hasOnboarded } from '@/lib/onboarding';
import { useAnimatedValue } from '@/lib/use-animated-value';
import { BRAND_NAVY } from '@/theme/tokens';

/** How long the mark holds before handing off, so the fade can finish. */
const SPLASH_MS = 1600;

type Destination = '/welcome' | '/(tabs)/home';

/**
 * Screen 0 — Splash. Fades in, then hands off.
 *
 * Deliberately matches the native splash in app.json (same navy, same mark), so
 * the handover from the launch screen to the first React frame is invisible
 * rather than a flash of a different colour.
 *
 * Where it hands off to depends on whether this device has been through the
 * intro. It used to go to /welcome unconditionally, which meant every single
 * cold launch replayed the whole flow — welcome carousel, taste quiz, sign-in,
 * paywall, notification primer — at someone who had been using the app for
 * weeks. Nothing recorded that it had ever been completed.
 */
export default function SplashScreen() {
  const router = useRouter();
  const anim = useAnimatedValue(0);

  const [destination, setDestination] = useState<Destination | null>(null);
  const [heldLongEnough, setHeldLongEnough] = useState(false);

  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 900,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [anim]);

  useEffect(() => {
    let cancelled = false;
    hasOnboarded().then((done) => {
      if (!cancelled) setDestination(done ? '/(tabs)/home' : '/welcome');
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setHeldLongEnough(true), SPLASH_MS);
    return () => clearTimeout(t);
  }, []);

  // Both conditions, so a storage read that resolves in a millisecond doesn't
  // cut the fade off part-way, and a slow one doesn't strand anyone here.
  useEffect(() => {
    if (destination && heldLongEnough) router.replace(destination);
  }, [destination, heldLongEnough, router]);

  return (
    <Pressable
      // Tapping skips the wait, but not the question — sending an impatient
      // returning user to /welcome is the very thing being fixed.
      onPress={() => destination && router.replace(destination)}
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
