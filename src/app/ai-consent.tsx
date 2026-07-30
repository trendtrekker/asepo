import { useLocalSearchParams, useRouter } from 'expo-router';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Screen } from '@/components/ui';
import { safeBack } from '@/lib/navigation';
import { useStore } from '@/store/app-store';
import { useColors } from '@/theme/theme-context';

/**
 * Gate in front of the very first AI-backed import. `add/importing.tsx` is the
 * single place every import source (photo, link, pasted text, typed dish name)
 * funnels through to call the extraction API — redirecting here first, once,
 * covers all of them without duplicating the check at each entry point.
 *
 * Profile also links here (`?from=settings`) to re-grant consent after it's
 * been withdrawn, so opting back in always shows the same disclosure rather
 * than hiding it behind a bare switch. That path has no import waiting, so it
 * returns to Profile instead of resuming the import flow.
 */
export default function AiConsent() {
  const c = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const { setAiConsentGiven, setPendingImportSource } = useStore();

  const fromSettings = from === 'settings';

  const decline = () => {
    if (fromSettings) {
      safeBack(router, '/profile');
      return;
    }
    setPendingImportSource(null);
    router.replace('/add');
  };

  const accept = () => {
    setAiConsentGiven(true);
    if (fromSettings) {
      safeBack(router, '/profile');
      return;
    }
    router.replace('/add/importing');
  };

  return (
    <Screen
      style={{
        paddingHorizontal: 28,
        paddingTop: insets.top + 48,
        paddingBottom: insets.bottom + 20,
      }}>
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
        Asepo uses AI to read your recipes
      </Text>

      <Text style={{ marginTop: 14, fontSize: 15, lineHeight: 22, color: c.textSec }}>
        When you scan a photo, paste a link, or type a dish name, Asepo sends that photo or text
        to our AI processing partner, kie.ai, to identify the recipe and pull out the ingredients
        and steps.
      </Text>
      <Text style={{ marginTop: 12, fontSize: 15, lineHeight: 22, color: c.textSec }}>
        Only what you choose to import is shared — never your other recipes, account details, or
        anything else on your device. By continuing, you agree to share that content with kie.ai
        for this purpose.
      </Text>

      <View style={{ flex: 1 }} />

      <Button title={fromSettings ? 'Turn on' : 'Continue'} onPress={accept} />
      <Button
        title={fromSettings ? 'Cancel' : 'Not now'}
        variant="plain"
        onPress={decline}
        style={{ marginTop: 4 }}
      />
    </Screen>
  );
}
