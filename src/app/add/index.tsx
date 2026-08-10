import * as Clipboard from 'expo-clipboard';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useToast } from '@/components/toast';
import { Button, SheetHandle } from '@/components/ui';
import { ADD_TILES } from '@/data/sample';
import { importGate, type ImportMethodId } from '@/lib/import-methods';
import { safeBack } from '@/lib/navigation';
import { useStore } from '@/store/app-store';
import { useColors } from '@/theme/theme-context';

const TILE_ICONS: Record<string, string> = {
  camera: '○',
  library: '▢',
  paste: '≡',
  write: '✎',
  suggest: '✦',
};

/** A loose check — good enough to decide whether to offer the clipboard banner. */
const looksLikeUrl = (s: string) => /^https?:\/\/\S+\.\S+/i.test(s.trim());

/** Screen 7 — "Add a recipe" bottom sheet. */
export default function AddRecipeSheet() {
  const c = useColors();
  const toast = useToast();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { importsUsed, importLimit, isPro, isSignedIn, unlockedMethod, authLoading, setPendingImportSource } =
    useStore();
  const [url, setUrl] = useState('');
  const [detectedLink, setDetectedLink] = useState<string | null>(null);

  /**
   * The sheet is a transparentModal that fades in over the screen that opened
   * it — the "+" FAB stays mounted underneath while it fades, rather than
   * being replaced outright. A fast double-tap on the FAB can land its
   * second tap on whatever the sheet has just rendered at that same spot
   * (e.g. a tile), sending someone straight into an option they never meant
   * to pick. Ignoring taps for a beat after mount closes that window.
   */
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 400);
    return () => clearTimeout(t);
  }, []);

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

  /**
   * Every entry point funnels through this before doing anything — opening a
   * picker, spending a network call, or leaving the sheet. Returns whether
   * the caller may proceed; false means it already redirected.
   */
  const gate = (method: ImportMethodId): boolean => {
    if (!ready) return false;
    const result = importGate({ method, isSignedIn, unlockedMethod, isPro, importsUsed, importLimit });
    if (result === 'signin') {
      router.push('/email');
      return false;
    }
    if (result === 'locked') {
      router.push('/add/limit?reason=locked');
      return false;
    }
    if (result === 'count') {
      router.push('/add/limit');
      return false;
    }
    return true;
  };

  const beginImport = (method: ImportMethodId, source: Parameters<typeof setPendingImportSource>[0]) => {
    if (!gate(method)) return;
    setPendingImportSource(source);
    router.replace('/add/importing');
  };

  const importUrl = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      toast.show('Paste a link first');
      return;
    }
    beginImport('url', { kind: 'url', url: trimmed });
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
    const method: ImportMethodId = from === 'camera' ? 'scan' : 'library';
    if (!gate(method)) return;

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
    beginImport(method, { kind: 'image', uri: `data:${mime};base64,${asset.base64}` });
  };

  const openTile = (id: string) => {
    const method = id as ImportMethodId;
    if (!gate(method)) return;
    switch (id) {
      case 'idea':
        router.push('/add/idea');
        return;
      case 'paste':
        router.push('/add/paste-text');
        return;
      case 'suggest':
        router.push('/add/suggest');
        return;
      case 'scan':
        pickImage('camera');
        return;
      case 'library':
        pickImage('library');
        return;
    }
  };

  const urlLocked = isSignedIn && unlockedMethod !== 'all' && unlockedMethod !== 'url';

  return (
    <View style={{ flex: 1, justifyContent: 'flex-end' }}>
      {/* Scrim — tapping outside dismisses. */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Close"
        onPress={() => safeBack(router, '/(tabs)/home')}
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

        {authLoading ? (
          // Avoids a flash of "Sign in" for someone who actually has a valid
          // session — the initial Supabase session check hasn't resolved yet.
          <View style={{ flex: 1 }} />
        ) : !isSignedIn ? (
          <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 24, alignItems: 'center' }}>
            <Text style={{ fontSize: 15, color: c.textSec, textAlign: 'center', lineHeight: 21 }}>
              Sign in to import and save recipes — from a link, a photo, a dish name, or an AI
              suggestion.
            </Text>
            <Button
              title="Sign in"
              onPress={() => router.push('/email')}
              style={{ marginTop: 20, alignSelf: 'stretch' }}
            />
          </View>
        ) : (
          <>
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
                  opacity: urlLocked ? 0.5 : 1,
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
                  onPress={urlLocked ? () => gate('url') : onFieldAction}
                  accessibilityRole="button"
                  style={{
                    backgroundColor: c.accent,
                    borderRadius: 10,
                    paddingVertical: 9,
                    paddingHorizontal: 16,
                  }}>
                  <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>
                    {urlLocked ? 'Pro' : url.trim() ? 'Import' : 'Paste'}
                  </Text>
                </Pressable>
              </View>

              <Text style={{ marginTop: 8, fontSize: 12.5, color: c.textSec }}>
                {urlLocked
                  ? 'Free accounts get one import method — this one is part of Asepo Pro'
                  : 'Works with TikTok, Instagram, YouTube, Pinterest, and any recipe site'}
              </Text>
            </View>

            <ScrollView
              contentContainerStyle={{
                padding: 20,
                paddingBottom: insets.bottom + 24,
              }}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                {ADD_TILES.map((tile) => {
                  const locked = unlockedMethod !== 'all' && unlockedMethod !== tile.id;
                  return (
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
                        opacity: locked ? 0.55 : 1,
                      }}>
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
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
                        {locked ? (
                          <View
                            style={{
                              paddingVertical: 3,
                              paddingHorizontal: 7,
                              borderRadius: 8,
                              backgroundColor: c.accentTint,
                            }}>
                            <Text style={{ fontSize: 10, fontWeight: '700', color: c.accent }}>PRO</Text>
                          </View>
                        ) : null}
                      </View>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: c.text }}>{tile.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
          </>
        )}
      </View>
    </View>
  );
}
