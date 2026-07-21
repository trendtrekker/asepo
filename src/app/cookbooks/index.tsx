import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CookbookCollage } from '@/components/cookbook-collage';
import { ChevronLeft } from '@/components/icons';
import { Screen } from '@/components/ui';
import { useStore } from '@/store/app-store';
import { useColors } from '@/theme/theme-context';

/** Screen 18 — Cookbooks grid. */
export default function Cookbooks() {
  const c = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { cookbooks, recipesInCookbook } = useStore();

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 28 }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            paddingHorizontal: 20,
            paddingTop: 10,
          }}>
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Back"
            style={{
              width: 34,
              height: 34,
              borderRadius: 17,
              backgroundColor: c.chipBg,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <ChevronLeft color={c.text} />
          </Pressable>
          <Text style={{ fontSize: 30, fontWeight: '700', color: c.text, letterSpacing: -0.4 }}>
            Cookbooks
          </Text>
        </View>

        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 14,
            paddingHorizontal: 20,
            paddingTop: 18,
          }}>
          <Pressable
            onPress={() => router.push('/cookbooks/new')}
            accessibilityRole="button"
            style={{
              width: '47%',
              flexGrow: 1,
              height: 150,
              borderRadius: 16,
              borderWidth: 2,
              borderStyle: 'dashed',
              borderColor: c.border,
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}>
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: c.chipBg,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <Text style={{ fontSize: 20, color: c.textSec }}>+</Text>
            </View>
            <Text style={{ fontSize: 13.5, fontWeight: '600', color: c.textSec }}>
              New cookbook
            </Text>
          </Pressable>

          {cookbooks.map((cb) => (
            <Pressable
              key={cb.id}
              onPress={() => router.push(`/cookbooks/${cb.id}`)}
              accessibilityRole="button"
              style={{
                width: '47%',
                flexGrow: 1,
                height: 150,
                borderRadius: 16,
                overflow: 'hidden',
                justifyContent: 'flex-end',
              }}>
              <CookbookCollage recipes={recipesInCookbook(cb.id)} />
              <LinearGradient
                colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.6)']}
                locations={[0.45, 1]}
                style={StyleSheet.absoluteFill}
              />
              <View style={{ padding: 12 }}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}>{cb.name}</Text>
                <Text style={{ fontSize: 12, fontWeight: '500', color: 'rgba(255,255,255,0.8)' }}>
                  {cb.count} recipes
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}
