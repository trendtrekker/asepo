import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BigCheck } from '@/components/icons';
import { RecipeImage } from '@/components/recipe-image';
import { Button, SheetHandle } from '@/components/ui';
import { RECIPE_SAMPLES } from '@/data/sample';
import { safeBack } from '@/lib/navigation';
import { useColors } from '@/theme/theme-context';
import { useToast } from '@/components/toast';

/**
 * Screen 12 — a preview of the iOS share-extension UI. The real extension is a
 * separate native target; this route exists so the flow can be reviewed in-app.
 */
export default function SharePreview() {
  const toast = useToast();
  const c = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [saved, setSaved] = useState(false);

  return (
    <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.35)' }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Close"
        onPress={() => safeBack(router, '/(tabs)/recipes')}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />

      <View
        style={{
          backgroundColor: c.surface,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          paddingHorizontal: 20,
          paddingBottom: insets.bottom + 22,
        }}>
        <SheetHandle />

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ width: 30, height: 30, borderRadius: 9, backgroundColor: c.accent }} />
          <Text style={{ fontSize: 16, fontWeight: '700', color: c.text }}>Save to Asepo</Text>
        </View>

        {saved ? (
          <View style={{ alignItems: 'center', paddingTop: 30, paddingBottom: 10 }}>
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                backgroundColor: c.success,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <BigCheck color="#fff" />
            </View>
            <Text style={{ marginTop: 14, fontSize: 16, fontWeight: '600', color: c.text }}>
              Saved to Weeknight Dinners
            </Text>
          </View>
        ) : (
          <>
            <View
              style={{
                marginTop: 16,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                backgroundColor: c.chipBg,
                borderRadius: 14,
                paddingVertical: 10,
                paddingHorizontal: 12,
              }}>
              <RecipeImage
                recipe={RECIPE_SAMPLES[0]}
                glyph={22}
                style={{ width: 44, height: 44, borderRadius: 10 }}
              />
              <View>
                <Text style={{ fontSize: 13.5, fontWeight: '600', color: c.text }}>
                  Miso-Glazed Salmon Bowl
                </Text>
                <Text style={{ fontSize: 12, color: c.textSec }}>tiktok.com/@denise.cooks</Text>
              </View>
            </View>

            <Pressable
              accessibilityRole="button"
              onPress={() => toast.show('Cookbook picker isn\u2019t designed yet')}
              style={{
                marginTop: 14,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingVertical: 13,
                borderTopWidth: 1,
                borderBottomWidth: 1,
                borderColor: c.border,
              }}>
              <Text style={{ fontSize: 14.5, fontWeight: '600', color: c.text }}>
                Save to cookbook
              </Text>
              <Text style={{ fontSize: 13.5, fontWeight: '500', color: c.textSec }}>
                Weeknight Dinners ›
              </Text>
            </Pressable>

            <Button
              title="Save"
              height={50}
              onPress={() => setSaved(true)}
              style={{ marginTop: 14, borderRadius: 25 }}
            />
          </>
        )}
      </View>
    </View>
  );
}
