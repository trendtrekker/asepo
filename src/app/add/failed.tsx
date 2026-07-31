import { useLocalSearchParams, useRouter } from 'expo-router';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ErrorCircle } from '@/components/icons';
import { Button, Screen } from '@/components/ui';
import { useColors } from '@/theme/theme-context';

/** Screen 10 — Import failed. */
export default function ImportFailed() {
  const c = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { message } = useLocalSearchParams<{ message?: string }>();

  return (
    <Screen
      style={{
        alignItems: 'center',
        paddingHorizontal: 28,
        paddingTop: insets.top + 56,
        paddingBottom: insets.bottom + 20,
      }}>
      <View
        style={{
          width: 120,
          height: 120,
          borderRadius: 60,
          backgroundColor: c.chipBg,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <ErrorCircle color={c.danger} />
      </View>

      <Text
        style={{ marginTop: 26, fontSize: 23, fontWeight: '700', color: c.text, textAlign: 'center' }}>
        We couldn’t read that one
      </Text>
      <Text
        style={{
          marginTop: 8,
          fontSize: 15,
          lineHeight: 21,
          color: c.textSec,
          textAlign: 'center',
        }}>
        {message || "The link might be private, deleted, or in a format we don't support yet"}
      </Text>

      <View style={{ flex: 1 }} />

      <View style={{ gap: 12, width: '100%' }}>
        <Button title="Try again" onPress={() => router.replace('/add/importing')} />
        <Button
          title="Paste the text instead"
          variant="secondary"
          onPress={() => router.replace('/add')}
        />
        <Button title="Enter manually" variant="plain" onPress={() => router.replace('/add/manual')} />
      </View>
    </Screen>
  );
}
