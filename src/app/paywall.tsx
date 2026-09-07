import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CheckCircleTinted, Close } from '@/components/icons';
import { useToast } from '@/components/toast';
import { Button, Screen, ScrimButton } from '@/components/ui';
import { BENEFITS } from '@/data/sample';
import { safeBack } from '@/lib/navigation';
import { usePurchases } from '@/store/purchases-store';
import { useColors } from '@/theme/theme-context';

export default function Paywall() {
  const toast = useToast();
  const c = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { configured, showPaywall, restorePurchases } = usePurchases();
  const [busy, setBusy] = useState(false);

  const openPlans = async () => {
    setBusy(true);
    try {
      if (await showPaywall()) router.replace('/notifications');
    } catch (error) {
      toast.show(error instanceof Error ? error.message : 'Could not open subscription options');
    } finally {
      setBusy(false);
    }
  };

  const restore = async () => {
    setBusy(true);
    try {
      const restored = await restorePurchases();
      toast.show(restored ? 'Asepo Pro restored' : 'No active Asepo Pro purchase found');
      if (restored) router.replace('/notifications');
    } catch (error) {
      toast.show(error instanceof Error ? error.message : 'Could not restore purchases');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 12 }}>
        <View style={{ height: 220, justifyContent: 'flex-end', position: 'relative', overflow: 'hidden' }}>
          <Image
            source={require('../../assets/images/paywall-hero.jpg')}
            resizeMode="cover"
            accessibilityLabel="Asepo Pro"
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
          />
          <LinearGradient
            colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.30)', 'rgba(0,0,0,0.70)']}
            locations={[0.25, 0.6, 1]}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          />
          <Text style={{ paddingHorizontal: 24, paddingBottom: 18, fontSize: 30, fontWeight: '700', color: '#fff' }}>
            Asepo Pro
          </Text>
        </View>

        <View style={{ paddingHorizontal: 24, paddingTop: 24 }}>
          <View style={{ gap: 13 }}>
            {BENEFITS.map((benefit) => (
              <View key={benefit} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <CheckCircleTinted color={c.accent} tint={c.accentTint2} />
                <Text style={{ flex: 1, fontSize: 15, fontWeight: '500', color: c.text }}>{benefit}</Text>
              </View>
            ))}
          </View>

          <Button
            title={busy ? 'Please wait…' : 'View plans'}
            onPress={() => {
              if (!busy && configured) void openPlans();
            }}
            style={{ marginTop: 28 }}
          />

          {!configured ? (
            <Text style={{ marginTop: 10, fontSize: 12.5, lineHeight: 18, color: c.textSec, textAlign: 'center' }}>
              Subscription options are loading. Check your connection and try again.
            </Text>
          ) : null}

          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 22, paddingVertical: 16 }}>
            <Pressable accessibilityRole="button" disabled={busy || !configured} onPress={restore}>
              <Text style={{ fontSize: 13, fontWeight: '500', color: c.textSec }}>Restore purchases</Text>
            </Pressable>
            <Pressable onPress={() => router.push('/notifications')} accessibilityRole="button">
              <Text style={{ fontSize: 13, fontWeight: '500', color: c.textSec }}>Maybe later</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      <ScrimButton
        onPress={() => safeBack(router, '/(tabs)/home')}
        style={{ position: 'absolute', top: insets.top + 8, left: 16 }}>
        <Close color="#fff" />
      </ScrimButton>
    </Screen>
  );
}
