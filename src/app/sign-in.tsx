import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Screen } from '@/components/ui';
import { useColors } from '@/theme/theme-context';

/** Screen 3 — Sign in. */
export default function SignIn() {
  const c = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <Screen
      style={{
        alignItems: 'center',
        paddingHorizontal: 28,
        paddingTop: insets.top + 36,
        paddingBottom: insets.bottom + 20,
      }}>
      <View style={{ width: 64, height: 64, borderRadius: 18, backgroundColor: c.accent }} />

      <Text
        style={{
          marginTop: 26,
          fontSize: 25,
          lineHeight: 33,
          fontWeight: '700',
          color: c.text,
          textAlign: 'center',
          letterSpacing: -0.3,
        }}>
        Save your recipes forever
      </Text>
      <Text style={{ marginTop: 8, fontSize: 15, color: c.textSec, textAlign: 'center' }}>
        Sync across every device, back up automatically
      </Text>

      <View style={{ flex: 1 }} />

      <View style={{ gap: 12, width: '100%' }}>
        {/* Wire these to expo-apple-authentication / Google OAuth when the backend lands. */}
        <Button title="Sign in with Apple" variant="dark" onPress={() => router.push('/paywall')} />
        <Button
          title="Continue with Google"
          variant="secondary"
          onPress={() => router.push('/paywall')}
        />
        <Button title="Continue with Email" variant="tinted" onPress={() => router.push('/email')} />
      </View>

      <Text
        style={{
          marginTop: 18,
          fontSize: 12,
          lineHeight: 18,
          color: c.textSec,
          textAlign: 'center',
        }}>
        By continuing you agree to Asepo's <Text style={{ color: c.accent }}>Terms</Text> and{' '}
        <Text style={{ color: c.accent }}>Privacy Policy</Text>
      </Text>

      <Pressable
        onPress={() => router.push('/paywall')}
        accessibilityRole="button"
        style={{ marginTop: 14 }}>
        <Text style={{ fontSize: 15, fontWeight: '500', color: c.textSec }}>Skip for now</Text>
      </Pressable>
    </Screen>
  );
}
