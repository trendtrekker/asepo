import * as Clipboard from 'expo-clipboard';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useToast } from '@/components/toast';
import { SheetHandle } from '@/components/ui';
import { ADD_TILES } from '@/data/sample';
import { useStore } from '@/store/app-store';
import { useColors } from '@/theme/theme-context';

const TILE_ICONS: Record<string, string> = {
  camera: '○',
  library: '▢',
  paste: '≡',
  write: '✎',
};

/** A loose check — good enough to decide whether to offer the clipboard banner. */
const looksLikeUrl = (s: string) => /^https?:\/\/\S+\.\S+/i.test(s.trim());

/** Screen 7 — "Add a recipe" bottom sheet. */
export default function AddRecipeSheet() {
  const c = useColors();
  const toast = useToast();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { importsUsed, importLimit, isPro, setPendingImportSource } = useStore();
  const [url, setUrl] = useState('');
  const [detectedLink, setDetectedLink] = useState<string | null>(null);

  // Real clipboard check on open — the old version always showed the banner,
  // whether or not there was actually a link on the clipboard.
  useEffect(() => {
    let cancelled = false;
    // Some browsers (mobile Safari's in-app webview, http rather than https)
    // don't expose the async Clipboard API at all and reject outright — that's
    // a normal, silent case here, not a failure worth surfacing.
    Clipboard.getStringAsync()
      .then((text) => {
        if (!cancelled && looksLikeUrl(text)) setDetectedLink(text.trim());
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const beginImport = (source: Parameters<typeof setPendingImportSource>[0]) => {
    if (!isPro && importsUsed >= importLimit) {
      router.replace('/add/limit');
      return;
    }
    setPendingImportSource(source);
    router.replace('/add/importing');
  };

  const importUrl = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      toast.show('Paste a link first');
      return;
    }
    beginImport({ kind: 'url', url: trimmed });
  };

  /** The single field does double duty: paste when empty, submit when full. */
  const onFieldAction = async () => {
    if (url.trim()) {
      importUrl(url);
      return;
    }
    const clip = await Clipboard.getStringAsync().catch(() => '');
    if (!clip.trim()) {
      toast.show('Nothing to paste — copy a link first');
      return;
    }
    setUrl(clip.trim());
  };

  const pickImage = async (from: 'camera' | 'library') => {
    const permission =
      from === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      toast.show(
        from === 'camera'
          ? 'Camera access is off — enable it in Settings to scan a recipe'
          : 'Photo access is off — enable it in Settings to import a screenshot'
      );
      return;
    }

    const result =
      from === 'camera'
        ? await ImagePicker.launchCameraAsync({ base64: true, quality: 0.6 })
        : await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 0.6 });

    if (result.canceled || !result.assets[0]?.base64) return;

    const asset = result.assets[0];
    const mime = asset.mimeType ?? 'image/jpeg';
    beginImport({ kind: 'image', uri: `data:${mime};base64,${asset.base64}` });
  };

  const openTile = (id: string) => {
    switch (id) {
      case 'idea':
        router.push('/add/idea');
        return;
      case 'paste':
        router.push('/add/paste-text');
        return;
      case 'scan':
        pickImage('camera');
        return;
      case 'library':
        pickImage('library');
        return;
    }
  };

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
          {detectedLink ? (
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
              <Text style={{ flex: 1, fontSize: 13.5, fontWeight: '500', color: c.text }} numberOfLines={1}>
                Recipe link detected — import?
              </Text>
              <Pressable
                onPress={() => importUrl(detectedLink)}
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
              onSubmitEditing={() => importUrl(url)}
              style={{ flex: 1, fontSize: 15, color: c.text, paddingVertical: 12 }}
            />
            <Pressable
              onPress={onFieldAction}
              accessibilityRole="button"
              style={{
                backgroundColor: c.accent,
                borderRadius: 10,
                paddingVertical: 9,
                paddingHorizontal: 16,
              }}>
              <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>
                {url.trim() ? 'Import' : 'Paste'}
              </Text>
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
