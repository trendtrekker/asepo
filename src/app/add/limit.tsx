import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CheckCircleTinted } from '@/components/icons';
import { Button, SheetHandle } from '@/components/ui';
import { LIMIT_BENEFITS } from '@/data/sample';
import { useStore } from '@/store/app-store';
import { useColors } from '@/theme/theme-context';

/** Screen 11 — Free import limit reached. */
export default function ImportLimit() {
  const c = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { importLimit } = useStore();

  return (
    <View style={{ flex: 1, justifyContent: 'flex-end' }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Close"
        onPress={() => router.back()}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: c.overlay }}
      />

      <View
        style={{
          backgroundColor: c.surface,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          paddingHorizontal: 24,
          paddingBottom: insets.bottom + 24,
          shadowColor: '#000',
          shadowOpacity: 0.12,
          shadowRadius: 30,
          shadowOffset: { width: 0, height: -8 },
          elevation: 16,
        }}>
        <SheetHandle />

        <Text style={{ fontSize: 21, fontWeight: '700', color: c.text }}>
          You've used all {importLimit} free imports this month
        </Text>
        <Text style={{ marginTop: 6, fontSize: 14, color: c.textSec }}>
          Upgrade to Pro for unlimited imports and more
        </Text>

        <View style={{ gap: 10, marginTop: 18 }}>
          {LIMIT_BENEFITS.map((b) => (
            <View key={b} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <CheckCircleTinted color={c.accent} tint={c.accentTint2} size={16} />
              <Text style={{ fontSize: 14, fontWeight: '500', color: c.text }}>{b}</Text>
            </View>
          ))}
        </View>

        <Button
          title="Upgrade to Pro"
          onPress={() => router.replace('/paywall')}
          style={{ marginTop: 20 }}
        />
        <Button title="Maybe later" variant="plain" onPress={() => router.back()} style={{ marginTop: 10 }} />
      </View>
    </View>
  );
}
