import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CheckCircleTinted, Close } from '@/components/icons';
import { Button, Screen, ScrimButton } from '@/components/ui';
import { BENEFITS, PLANS } from '@/data/sample';
import { useStore } from '@/store/app-store';
import { useColors } from '@/theme/theme-context';
import { useToast } from '@/components/toast';

/** Screen 5 — Paywall. Wire the plan cards to StoreKit via RevenueCat later. */
export default function Paywall() {
  const toast = useToast();
  const c = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { setPro } = useStore();
  const [selected, setSelected] = useState('annual');

  const plan = PLANS.find((p) => p.id === selected)!;

  const startTrial = () => {
    setPro(true);
    router.push('/notifications');
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 12 }}>
        {/* position:relative + overflow:hidden are load-bearing: without them
            react-native-web resolves the absolutely-positioned image against an
            outer ancestor and it bleeds behind the whole page. */}
        <View
          style={{
            height: 220,
            justifyContent: 'flex-end',
            position: 'relative',
            overflow: 'hidden',
          }}>
          <Image
            source={require('../../assets/images/paywall-hero.jpg')}
            resizeMode="cover"
            accessibilityLabel="Asepo Pro"
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
          />
          {/* The artwork is bright and the wordmark sits over its lower left,
              so the scrim starts earlier and goes darker than a photo-only
              overlay would need. */}
          <LinearGradient
            colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.30)', 'rgba(0,0,0,0.70)']}
            locations={[0.25, 0.6, 1]}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          />
          <Text
            style={{
              paddingHorizontal: 24,
              paddingBottom: 18,
              fontSize: 30,
              fontWeight: '700',
              color: '#fff',
              letterSpacing: -0.4,
              // Keeps the wordmark legible over the pale wooden table.
              textShadowColor: 'rgba(0,0,0,0.45)',
              textShadowOffset: { width: 0, height: 1 },
              textShadowRadius: 6,
            }}>
            Asepo Pro
          </Text>
        </View>

        <View style={{ paddingHorizontal: 24, paddingTop: 18 }}>
          <View style={{ gap: 11 }}>
            {BENEFITS.map((b) => (
              <View key={b} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <CheckCircleTinted color={c.accent} tint={c.accentTint2} />
                <Text style={{ fontSize: 14.5, fontWeight: '500', color: c.text }}>{b}</Text>
              </View>
            ))}
          </View>

          <View style={{ gap: 10, marginTop: 20 }}>
            {PLANS.map((p) => {
              const active = selected === p.id;
              return (
                <Pressable
                  key={p.id}
                  onPress={() => setSelected(p.id)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingVertical: 14,
                    paddingHorizontal: 16,
                    borderRadius: 16,
                    backgroundColor: active ? c.accentTint : c.surface,
                    borderWidth: 1.5,
                    borderColor: active ? c.accent : c.border,
                  }}>
                  {p.badge ? (
                    <View
                      style={{
                        position: 'absolute',
                        top: -9,
                        right: 14,
                        backgroundColor: c.accent,
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        borderRadius: 8,
                      }}>
                      <Text style={{ fontSize: 10, fontWeight: '700', color: '#fff' }}>
                        {p.badge}
                      </Text>
                    </View>
                  ) : null}

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: 10,
                        borderWidth: 2,
                        borderColor: active ? c.accent : c.border,
                        backgroundColor: active ? c.accent : 'transparent',
                      }}
                    />
                    <View>
                      <Text style={{ fontSize: 16, fontWeight: '600', color: c.text }}>
                        {p.name}
                      </Text>
                      <Text style={{ fontSize: 12.5, color: c.textSec }}>{p.sub}</Text>
                    </View>
                  </View>
                  <Text style={{ fontSize: 17, fontWeight: '700', color: c.text }}>{p.price}</Text>
                </Pressable>
              );
            })}
          </View>

          <Button title="Start 7-day free trial" onPress={startTrial} style={{ marginTop: 20 }} />

          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 22, paddingVertical: 14 }}>
            <Pressable
              accessibilityRole="button"
              onPress={() => toast.show('Restore needs StoreKit \u2014 wired with the backend')}>
              <Text style={{ fontSize: 13, fontWeight: '500', color: c.textSec }}>
                Restore purchases
              </Text>
            </Pressable>
            <Pressable onPress={() => router.push('/notifications')} accessibilityRole="button">
              <Text style={{ fontSize: 13, fontWeight: '500', color: c.textSec }}>Maybe later</Text>
            </Pressable>
          </View>

          <Text style={{ fontSize: 11, lineHeight: 17, color: c.textSec, textAlign: 'center' }}>
            7 days free, then {plan.price} {plan.sub}, billed automatically until cancelled. Cancel
            anytime in Settings.
          </Text>
        </View>
      </ScrollView>

      <ScrimButton
        onPress={() => router.back()}
        style={{ position: 'absolute', top: insets.top + 8, left: 16 }}>
        <Close color="#fff" />
      </ScrimButton>
    </Screen>
  );
}
