import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Screen } from '@/components/ui';
import { safeBack } from '@/lib/navigation';
import { useStore } from '@/store/app-store';
import { useColors } from '@/theme/theme-context';

/**
 * One consent covering every feature that sends recipe content to kie.ai:
 * imports, nutrition estimates, and "Make it healthier". They all reach the
 * same processor doing the same kind of work, so a second screen would be
 * friction without extra clarity.
 *
 * Two shapes of entry point:
 *
 *   no `from`   the import flow. `add/importing.tsx` redirects here before it
 *               calls the extraction API — it's the single funnel every import
 *               source passes through, so one check covers photo, link, pasted
 *               text, and typed dish name. Accepting resumes the import.
 *   `from=…`    pushed from a screen that's still on the stack (Profile's
 *               toggle, or the recipe screen's nutrition/healthify), so both
 *               answers pop back to it and nothing is waiting to resume.
 */
export default function AiConsent() {
  const c = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const { setAiConsentGiven, setPendingImportSource } = useStore();

  const pushed = from !== undefined;
  // Only reached when there's no history to pop — a deep link straight here.
  const fallback = from === 'settings' ? '/profile' : '/(tabs)/recipes';

  const decline = () => {
    if (pushed) {
      safeBack(router, fallback);
      return;
    }
    setPendingImportSource(null);
    router.replace('/add');
  };

  const accept = () => {
    setAiConsentGiven(true);
    if (pushed) {
      safeBack(router, fallback);
      return;
    }
    router.replace('/add/importing');
  };

  return (
    // Scrollable because the disclosure is long enough to push the buttons off
    // a short screen (small phone, or landscape) — and a consent screen whose
    // "Not now" you can't reach is worse than useless. flexGrow keeps the
    // spacer below pinning them to the bottom whenever it does fit.
    <Screen>
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: 28,
          paddingTop: insets.top + 48,
          paddingBottom: insets.bottom + 20,
        }}
        showsVerticalScrollIndicator={false}>
        <View style={{ width: 56, height: 56, borderRadius: 16, backgroundColor: c.accent }} />

        <Text
          style={{
            marginTop: 24,
            fontSize: 24,
            lineHeight: 31,
            fontWeight: '700',
            color: c.text,
            letterSpacing: -0.3,
          }}>
          Asepo uses AI to work with your recipes
        </Text>

        <Text style={{ marginTop: 14, fontSize: 15, lineHeight: 22, color: c.textSec }}>
          When you import a recipe — a photo, a link, pasted text, or a dish name — Asepo sends
          that content to our AI processing partner, kie.ai, to identify it and pull out the
          ingredients and steps.
        </Text>
        <Text style={{ marginTop: 12, fontSize: 15, lineHeight: 22, color: c.textSec }}>
          Nutrition estimates and “Make it healthier” send that recipe’s title, ingredients, and
          steps to kie.ai too — including for recipes you typed in yourself.
        </Text>
        <Text style={{ marginTop: 12, fontSize: 15, lineHeight: 22, color: c.textSec }}>
          Only the recipe you’re working with is shared — never your whole library, your account
          details, or anything else on your device. You can turn this off any time in Profile.
        </Text>

        <View style={{ flex: 1, minHeight: 24 }} />

        <Button title={pushed ? 'Turn on' : 'Continue'} onPress={accept} />
        <Button
          title={pushed ? 'Cancel' : 'Not now'}
          variant="plain"
          onPress={decline}
          style={{ marginTop: 4 }}
        />
      </ScrollView>
    </Screen>
  );
}
