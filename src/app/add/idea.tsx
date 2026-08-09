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
 * "Type a meal" tile destination — no source at all, just a dish name. The
 * model writes the whole recipe from scratch, so this skips straight to a
 * single short field rather than the multi-line paste box.
 */
export default function TypeAMeal() {
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
    const result = importGate({ method: 'idea', isSignedIn, unlockedMethod, isPro, importsUsed, importLimit });
    if (result === 'signin') router.replace('/email');
    else if (result === 'locked') router.replace('/add/limit?reason=locked');
    // 'count' is left to submit() below, so typing isn't interrupted mid-way.
  }, [authLoading, isSignedIn, unlockedMethod, isPro, importsUsed, importLimit, router]);

  const submit = () => {
    const trimmed = text.trim();
    if (trimmed.length < 2) {
      toast.show('Type a dish first');
      return;
    }
    const result = importGate({ method: 'idea', isSignedIn, unlockedMethod, isPro, importsUsed, importLimit });
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
    setPendingImportSource({ kind: 'idea', text: trimmed });
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
        <Text style={{ fontSize: 17, fontWeight: '700', color: c.text }}>Type a meal</Text>
        <Pressable onPress={submit} accessibilityRole="button">
          <Text style={{ fontSize: 15, fontWeight: '600', color: c.accent }}>Find recipe</Text>
        </Pressable>
      </View>

      <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 18 }}>
        <Text style={{ fontSize: 13, color: c.textSec, marginBottom: 10 }}>
          Just name a dish and we’ll write a full recipe for it — ingredients, quantities, and
          steps.
        </Text>
        <TextInput
          value={text}
          onChangeText={setText}
          autoFocus
          returnKeyType="done"
          onSubmitEditing={submit}
          placeholder="e.g. Chicken Alfredo"
          placeholderTextColor={c.textSec}
          style={{
            backgroundColor: c.inputBg,
            borderWidth: 1,
            borderColor: c.border,
            borderRadius: 14,
            paddingHorizontal: 14,
            paddingVertical: 14,
            fontSize: 17,
            color: c.text,
          }}
        />
      </View>

      <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: insets.bottom + 20 }}>
        <Button title="Find recipe" onPress={submit} />
      </View>
    </Screen>
  );
}
