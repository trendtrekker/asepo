import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { api, ApiError, type MealSuggestion } from '@/lib/api';
import { useToast } from '@/components/toast';
import { Button, Screen } from '@/components/ui';
import { safeBack } from '@/lib/navigation';
import { useStore } from '@/store/app-store';
import { useColors } from '@/theme/theme-context';

const EXAMPLES = [
  'What can I have for breakfast today?',
  'Something quick with chicken and rice',
  'A light dinner, no red meat',
];

/**
 * "Meal suggestion" tile destination — a loose prompt ("what can I have for
 * breakfast today?") gets back a short list of named dishes. Suggestions
 * themselves are free; picking one hands its title to the existing 'idea'
 * import path, which is where the import limit actually applies.
 */
export default function MealSuggestion() {
  const c = useColors();
  const toast = useToast();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { importsUsed, importLimit, isPro, setPendingImportSource } = useStore();
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<MealSuggestion[] | null>(null);

  const ask = async () => {
    const trimmed = prompt.trim();
    if (trimmed.length < 3) {
      toast.show('Describe what you want to eat first');
      return;
    }
    setLoading(true);
    setSuggestions(null);
    try {
      const result = await api.suggestMeals(trimmed);
      setSuggestions(result);
    } catch (e) {
      toast.show(e instanceof ApiError ? e.message : "Couldn't get suggestions. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const pick = (suggestion: MealSuggestion) => {
    if (!isPro && importsUsed >= importLimit) {
      router.replace('/add/limit');
      return;
    }
    setPendingImportSource({ kind: 'idea', text: suggestion.title });
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
        <Text style={{ fontSize: 17, fontWeight: '700', color: c.text }}>Meal suggestion</Text>
        <View style={{ width: 50 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 18, paddingBottom: insets.bottom + 24 }}
        keyboardShouldPersistTaps="handled">
        <Text style={{ fontSize: 13, color: c.textSec, marginBottom: 10 }}>
          Ask what to eat — a meal, a time of day, what's in the fridge, a mood — and we'll
          suggest a few dishes to pick from.
        </Text>
        <TextInput
          value={prompt}
          onChangeText={setPrompt}
          autoFocus
          multiline
          textAlignVertical="top"
          returnKeyType="done"
          onSubmitEditing={ask}
          placeholder="e.g. What can I have for breakfast today?"
          placeholderTextColor={c.textSec}
          style={{
            minHeight: 70,
            backgroundColor: c.inputBg,
            borderWidth: 1,
            borderColor: c.border,
            borderRadius: 14,
            paddingHorizontal: 14,
            paddingVertical: 12,
            fontSize: 16,
            color: c.text,
          }}
        />

        {!suggestions && !loading ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
            {EXAMPLES.map((example) => (
              <Pressable
                key={example}
                onPress={() => setPrompt(example)}
                accessibilityRole="button"
                style={{
                  paddingVertical: 7,
                  paddingHorizontal: 12,
                  borderRadius: 16,
                  backgroundColor: c.chipBg,
                }}>
                <Text style={{ fontSize: 12.5, color: c.textSec }}>{example}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        <Button
          title={loading ? 'Thinking…' : 'Suggest meals'}
          onPress={ask}
          style={{ marginTop: 16, opacity: loading ? 0.7 : 1 }}
        />

        {loading ? (
          <View style={{ alignItems: 'center', paddingVertical: 32 }}>
            <ActivityIndicator color={c.accent} />
          </View>
        ) : null}

        {suggestions ? (
          <View style={{ marginTop: 20, gap: 10 }}>
            {suggestions.map((s) => (
              <Pressable
                key={s.title}
                onPress={() => pick(s)}
                accessibilityRole="button"
                style={{
                  padding: 14,
                  borderRadius: 14,
                  backgroundColor: c.chipBg,
                }}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: c.text }}>{s.title}</Text>
                <Text style={{ marginTop: 3, fontSize: 13, color: c.textSec }}>{s.description}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}
