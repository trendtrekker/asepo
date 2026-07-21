import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Eye } from '@/components/icons';
import { Button, Field, Screen } from '@/components/ui';
import { useColors } from '@/theme/theme-context';
import { radius } from '@/theme/tokens';
import { useToast } from '@/components/toast';

/** Screen 4 — Email auth, toggling between sign-up and sign-in. */
export default function EmailAuth() {
  const toast = useToast();
  const c = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [mode, setMode] = useState<'signup' | 'signin'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const isSignIn = mode === 'signin';

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{
          flex: 1,
          paddingHorizontal: 24,
          paddingTop: insets.top + 28,
          paddingBottom: insets.bottom + 16,
        }}>
        <Text
          style={{
            fontSize: 27,
            lineHeight: 34,
            fontWeight: '700',
            color: c.text,
            letterSpacing: -0.4,
          }}>
          {isSignIn ? 'Welcome back' : 'Create your account'}
        </Text>
        <Text style={{ marginTop: 6, fontSize: 14, color: c.textSec }}>
          {isSignIn ? 'Sign in to sync your cookbooks' : 'Start saving recipes in seconds'}
        </Text>

        <View style={{ gap: 12, marginTop: 28 }}>
          <Field
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
          />

          <View>
            <Text style={{ fontSize: 12, fontWeight: '600', color: c.textSec, marginBottom: 6 }}>
              Password
            </Text>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: c.inputBg,
                borderWidth: 1,
                borderColor: c.border,
                borderRadius: radius.md,
                paddingLeft: 14,
                paddingRight: 6,
              }}>
              <TextInput
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                placeholder="••••••••"
                placeholderTextColor={c.textSec}
                style={{ flex: 1, height: 48, fontSize: 16, color: c.text }}
              />
              <Pressable
                onPress={() => setShowPassword((s) => !s)}
                accessibilityRole="button"
                accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}>
                <Eye color={c.textSec} />
              </Pressable>
            </View>
          </View>

          {isSignIn ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => toast.show('Password reset needs the backend')}
              style={{ alignSelf: 'flex-end' }}>
              <Text style={{ fontSize: 14, fontWeight: '500', color: c.accent }}>
                Forgot password?
              </Text>
            </Pressable>
          ) : null}
        </View>

        <View style={{ flex: 1 }} />

        <Button title="Continue" onPress={() => router.push('/paywall')} />

        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 5,
            marginTop: 18,
          }}>
          <Text style={{ fontSize: 14, color: c.textSec }}>
            {isSignIn ? "Don't have an account?" : 'Already have an account?'}
          </Text>
          <Pressable
            onPress={() => setMode(isSignIn ? 'signup' : 'signin')}
            accessibilityRole="button">
            <Text style={{ fontSize: 14, fontWeight: '600', color: c.accent }}>
              {isSignIn ? 'Sign up' : 'Sign in'}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
