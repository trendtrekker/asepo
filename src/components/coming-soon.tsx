import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PhotoPlaceholder, Screen } from '@/components/ui';
import { useColors } from '@/theme/theme-context';

/**
 * Placeholder for tabs whose screens live in later design blocks
 * (Plan = block 5, Grocery = block 6, Profile = block 7).
 */
export function ComingSoon({ title, body }: { title: string; body: string }) {
  const c = useColors();
  const insets = useSafeAreaInsets();

  return (
    <Screen style={{ paddingTop: insets.top + 12 }}>
      <Text
        style={{
          paddingHorizontal: 20,
          fontSize: 30,
          fontWeight: '700',
          color: c.text,
          letterSpacing: -0.4,
        }}>
        {title}
      </Text>

      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 }}>
        <PhotoPlaceholder
          style={{
            width: 130,
            height: 130,
            borderRadius: 40,
            borderWidth: 1,
            borderColor: c.border,
          }}
        />
        <Text
          style={{
            marginTop: 22,
            fontSize: 18,
            fontWeight: '700',
            color: c.text,
            textAlign: 'center',
          }}>
          Not designed yet
        </Text>
        <Text
          style={{
            marginTop: 6,
            fontSize: 14,
            lineHeight: 20,
            color: c.textSec,
            textAlign: 'center',
          }}>
          {body}
        </Text>
      </View>
    </Screen>
  );
}
