import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SheetHandle } from '@/components/ui';
import { ADD_TILES } from '@/data/sample';
import { useStore } from '@/store/app-store';
import { useColors } from '@/theme/theme-context';

const TILE_ICONS: Record<string, string> = {
  camera: '○',
  library: '▢',
  paste: '≡',
  write: '✎',
  app: '⬇',
};

/** Screen 7 — "Add a recipe" bottom sheet. */
export default function AddRecipeSheet() {
  const c = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { importsUsed, importLimit, isPro } = useStore();
  const [url, setUrl] = useState('');

  // Stand-in for expo-clipboard detection.
  const clipboardDetected = true;

  const startImport = () => {
    if (!isPro && importsUsed >= importLimit) router.replace('/add/limit');
    else router.replace({ pathname: '/add/importing', params: url.trim() ? { url: url.trim() } : {} });
  };

  const openTile = (id: string) =>
    id === 'write' ? router.replace('/add/manual') : startImport();

  return (
    <View style={{ flex: 1, justifyContent: 'flex-end' }}>
      {/* Scrim — tapping outside dismisses. */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Close"
        onPress={() => router.back()}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: c.overlay }}
      />

      <View
        style={{
          height: '70%',
          backgroundColor: c.surface,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          shadowColor: '#000',
          shadowOpacity: 0.15,
          shadowRadius: 30,
          shadowOffset: { width: 0, height: -8 },
          elevation: 16,
        }}>
        <SheetHandle />
        <Text style={{ paddingHorizontal: 20, paddingTop: 6, fontSize: 20, fontWeight: '700', color: c.text }}>
          Add a recipe
        </Text>

        <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
          {clipboardDetected ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                backgroundColor: c.accentTint,
                borderWidth: 1,
                borderColor: c.accentTint2,
                borderRadius: 14,
                paddingVertical: 12,
                paddingHorizontal: 14,
                marginBottom: 14,
              }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c.accent }} />
              <Text style={{ flex: 1, fontSize: 13.5, fontWeight: '500', color: c.text }}>
                Recipe link detected — import?
              </Text>
              <Pressable
                onPress={startImport}
                accessibilityRole="button"
                style={{
                  backgroundColor: c.accent,
                  borderRadius: 10,
                  paddingVertical: 7,
                  paddingHorizontal: 12,
                }}>
                <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>Import</Text>
              </Pressable>
            </View>
          ) : null}

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              backgroundColor: c.inputBg,
              borderWidth: 1,
              borderColor: c.border,
              borderRadius: 14,
              paddingLeft: 16,
              padding: 4,
            }}>
            <TextInput
              value={url}
              onChangeText={setUrl}
              placeholder="Paste a TikTok, Instagram, or recipe link"
              placeholderTextColor={c.textSec}
              autoCapitalize="none"
              keyboardType="url"
              onSubmitEditing={startImport}
              style={{ flex: 1, fontSize: 15, color: c.text, paddingVertical: 12 }}
            />
            <Pressable
              onPress={startImport}
              accessibilityRole="button"
              style={{
                backgroundColor: c.accent,
                borderRadius: 10,
                paddingVertical: 9,
                paddingHorizontal: 16,
              }}>
              <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>Paste</Text>
            </Pressable>
          </View>

          <Text style={{ marginTop: 8, fontSize: 12.5, color: c.textSec }}>
            Works with TikTok, Instagram, YouTube, Pinterest, and any recipe site
          </Text>
        </View>

        <ScrollView
          contentContainerStyle={{
            padding: 20,
            paddingBottom: insets.bottom + 24,
          }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            {ADD_TILES.map((tile) => (
              <Pressable
                key={tile.id}
                onPress={() => openTile(tile.id)}
                accessibilityRole="button"
                style={{
                  width: '47%',
                  flexGrow: 1,
                  gap: 12,
                  paddingVertical: 18,
                  paddingHorizontal: 16,
                  borderRadius: 16,
                  backgroundColor: c.chipBg,
                }}>
                <View
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 12,
                    backgroundColor: c.surface,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  <Text style={{ fontSize: 17, color: c.text }}>{TILE_ICONS[tile.icon]}</Text>
                </View>
                <Text style={{ fontSize: 14, fontWeight: '600', color: c.text }}>{tile.label}</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </View>
    </View>
  );
}
