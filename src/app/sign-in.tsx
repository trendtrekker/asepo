import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Screen } from '@/components/ui';
import { useToast } from '@/components/toast';
import { useAuth } from '@/store/auth-store';
import { useColors } from '@/theme/theme-context';

/** Screen 3 — Sign in. */
export default function SignIn() {
  const c = useColors();
  const router = useRouter();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const { session, signInWithGoogle } = useAuth();
  const [googleBusy, setGoogleBusy] = useState(false);

  // The OAuth round-trip lands the session asynchronously via
  // onAuthStateChange, not as a direct return value from signInWithGoogle —
  // watch for it rather than navigating from inside the button handler.
  useEffect(() => {
    if (session) router.push('/paywall');
  }, [session, router]);

  const continueWithGoogle = async () => {
    if (googleBusy) return;
    setGoogleBusy(true);
    const { error } = await signInWithGoogle();
    setGoogleBusy(false);
    // A null error also covers "the user backed out of the browser sheet" —
    // silently do nothing rather than pushing forward with no real session.
    if (error) toast.show(error);
  };

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
        <Button
          title="Sign in with Apple"
          variant="dark"
          onPress={() => toast.show('Sign in with Apple isn’t set up yet')}
        />
        <Button
          title={googleBusy ? 'Continue with Google…' : 'Continue with Google'}
          variant="secondary"
          onPress={continueWithGoogle}
          style={googleBusy ? { opacity: 0.7 } : undefined}
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
        By continuing you agree to Asepo’s <Text style={{ color: c.accent }}>Terms</Text> and{' '}
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
