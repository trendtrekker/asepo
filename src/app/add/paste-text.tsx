import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useToast } from '@/components/toast';
import { Button, Screen } from '@/components/ui';
import { importGate } from '@/lib/import-methods';
import { safeBack } from '@/lib/navigation';
import { useStore } from '@/store/app-store';
import { useColors } from '@/theme/theme-context';

/**
 * "Paste text" tile destination — for a recipe copied from Notes, an email, a
 * blocked website, or anywhere else that isn't a link. Runs the same
 * extraction pipeline as a URL import, just on text the user hands over
 * directly instead of something we fetch ourselves.
 */
export default function PasteText() {
  const c = useColors();
  const toast = useToast();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { importsUsed, importLimit, isPro, isSignedIn, unlockedMethod, authLoading, setPendingImportSource } =
    useStore();
  const [text, setText] = useState('');

  // Catches a deep link straight to this screen, bypassing the sheet's own
  // gating (sign-in required, one method for a free account). Waits out
  // authLoading first — otherwise a real sign-in flickers to /email while
  // the initial session check is still in flight.
  useEffect(() => {
    if (authLoading) return;
    const result = importGate({ method: 'paste', isSignedIn, unlockedMethod, isPro, importsUsed, importLimit });
    if (result === 'signin') router.replace('/email');
    else if (result === 'locked') router.replace('/add/limit?reason=locked');
    // 'count' is left to submit() below, so pasting isn't interrupted mid-way.
  }, [authLoading, isSignedIn, unlockedMethod, isPro, importsUsed, importLimit, router]);

  const submit = () => {
    const trimmed = text.trim();
    if (trimmed.length < 20) {
      toast.show('Paste a bit more — that looks too short to be a recipe');
      return;
    }
    const result = importGate({ method: 'paste', isSignedIn, unlockedMethod, isPro, importsUsed, importLimit });
    if (result === 'signin') {
      router.replace('/email');
      return;
    }
    if (result === 'locked') {
      router.replace('/add/limit?reason=locked');
      return;
    }
    if (result === 'count') {
      router.replace('/add/limit');
      return;
    }
    setPendingImportSource({ kind: 'text', text: trimmed });
    router.replace('/add/importing');
  };

  return (
    <Screen>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 20,
          paddingTop: insets.top + 12,
        }}>
        <Pressable onPress={() => safeBack(router, '/add')} accessibilityRole="button">
          <Text style={{ fontSize: 15, fontWeight: '500', color: c.textSec }}>Cancel</Text>
        </Pressable>
        <Text style={{ fontSize: 17, fontWeight: '700', color: c.text }}>Paste text</Text>
        <Pressable onPress={submit} accessibilityRole="button">
          <Text style={{ fontSize: 15, fontWeight: '600', color: c.accent }}>Import</Text>
        </Pressable>
      </View>

      <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 18 }}>
        <Text style={{ fontSize: 13, color: c.textSec, marginBottom: 10 }}>
          Paste a recipe from Notes, an email, or anywhere else — we’ll pull out the
          ingredients and steps.
        </Text>
        <TextInput
          value={text}
          onChangeText={setText}
          multiline
          autoFocus
          textAlignVertical="top"
          placeholder="2 cups flour&#10;1 tsp baking soda&#10;…"
          placeholderTextColor={c.textSec}
          style={{
            flex: 1,
            backgroundColor: c.inputBg,
            borderWidth: 1,
            borderColor: c.border,
            borderRadius: 14,
            padding: 14,
            fontSize: 15,
            lineHeight: 21,
            color: c.text,
          }}
        />
      </View>

      <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: insets.bottom + 20 }}>
        <Button title="Import" onPress={submit} />
      </View>
    </Screen>
  );
}
