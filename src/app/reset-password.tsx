import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useToast } from '@/components/toast';
import { Button, Field, Screen } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/store/auth-store';
import { useColors } from '@/theme/theme-context';

/**
 * Screen 4b — the far end of "Forgot password?".
 *
 * The link in the reset email goes to Supabase, which verifies the token and
 * then bounces here with a short-lived recovery session in the URL fragment.
 * Claiming that session is all that stands between someone and setting a new
 * password, and it arrives differently per platform:
 *
 *   web    — lands in the address bar, where detectSessionInUrl picks it up
 *            before this screen even mounts (see lib/supabase.ts).
 *   native — arrives as an `asepo://reset-password#...` deep link, which
 *            nothing parses automatically, so this screen does it below.
 *
 * Either way the session shows up asynchronously, so this waits for it rather
 * than assuming it's there on first render.
 */

/** The part after the first '#', wherever the link happens to live. */
function fragmentOf(raw: string): string {
  const i = raw.indexOf('#');
  return i === -1 ? '' : raw.slice(i + 1);
}

export default function ResetPassword() {
  const c = useColors();
  const router = useRouter();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const { session, loading, updatePassword } = useAuth();
  const url = Linking.useURL();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  /** setSession resolves a tick or two after this mounts; don't bail early. */
  const [gaveUp, setGaveUp] = useState(false);
  /** Why claiming the recovery session failed, if it did. */
  const [claimError, setClaimError] = useState<string | null>(null);
  const claimed = useRef(false);

  // An expired or already-used link comes back as an error in the fragment
  // instead of tokens. Read rather than stored, so it can't go stale against
  // the URL. Only opportunistic: on web supabase may have cleared the fragment
  // already, and the grace period below covers that case.
  const linkError = useMemo(() => {
    const raw =
      Platform.OS === 'web'
        ? typeof window === 'undefined'
          ? ''
          : window.location.hash
        : (url ?? '');
    const description = new URLSearchParams(fragmentOf(raw)).get('error_description');
    return description ? description.replace(/\+/g, ' ') : null;
  }, [url]);

  const failure = claimError ?? linkError;

  // Native only — on web supabase-js has already consumed the fragment, and
  // re-parsing it here would race with that.
  useEffect(() => {
    if (Platform.OS === 'web' || !url || claimed.current) return;

    const params = new URLSearchParams(fragmentOf(url));
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    if (!accessToken || !refreshToken) return;

    // Guard before the await, not after: useURL can fire twice for one link.
    claimed.current = true;
    supabase.auth
      .setSession({ access_token: accessToken, refresh_token: refreshToken })
      .then(({ error }) => {
        if (error) setClaimError(error.message);
      });
  }, [url]);

  useEffect(() => {
    const timer = setTimeout(() => setGaveUp(true), 8000);
    return () => clearTimeout(timer);
  }, []);

  const submit = async () => {
    if (password.length < 6) {
      toast.show('Password needs to be at least 6 characters');
      return;
    }
    if (password !== confirm) {
      toast.show('Those two passwords don’t match');
      return;
    }
    if (submitting) return;
    setSubmitting(true);
    const { error } = await updatePassword(password);
    setSubmitting(false);

    if (error) {
      toast.show(error);
      return;
    }
    // updateUser leaves the recovery session in place as a normal one, so
    // they're already signed in — same destination as any other sign-in.
    toast.show('Password updated — you’re signed in');
    router.replace('/paywall');
  };

  const waiting = !session && !gaveUp && !failure;
  const dead = !session && (gaveUp || failure);

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
        {waiting || loading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 }}>
            <ActivityIndicator color={c.accent} />
            <Text style={{ fontSize: 15, color: c.textSec, textAlign: 'center' }}>
              Checking your reset link…
            </Text>
          </View>
        ) : dead ? (
          <>
            <Text style={{ fontSize: 27, lineHeight: 34, fontWeight: '700', color: c.text, letterSpacing: -0.4 }}>
              That link has expired
            </Text>
            <Text style={{ marginTop: 6, fontSize: 14, color: c.textSec }}>
              {failure ?? 'Reset links only work once, and only for a short while. Ask for a fresh one.'}
            </Text>
            <View style={{ flex: 1 }} />
            <Button
              title="Back to sign in"
              onPress={() => router.replace({ pathname: '/email', params: { mode: 'signin' } })}
            />
          </>
        ) : (
          <>
            <Text style={{ fontSize: 27, lineHeight: 34, fontWeight: '700', color: c.text, letterSpacing: -0.4 }}>
              Choose a new password
            </Text>
            <Text style={{ marginTop: 6, fontSize: 14, color: c.textSec }}>
              {session?.user.email ?? 'Signing back in'} — this replaces the old one everywhere.
            </Text>

            <View style={{ gap: 12, marginTop: 28 }}>
              <Field
                label="New password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                placeholder="At least 6 characters"
                autoCapitalize="none"
                autoComplete="new-password"
              />
              <Field
                label="Confirm new password"
                value={confirm}
                onChangeText={setConfirm}
                secureTextEntry
                placeholder="Type it again"
                autoCapitalize="none"
                autoComplete="new-password"
              />
            </View>

            <View style={{ flex: 1 }} />

            <Button
              title={submitting ? 'Saving…' : 'Save new password'}
              onPress={submit}
              style={submitting ? { opacity: 0.7 } : undefined}
            />
          </>
        )}
      </KeyboardAvoidingView>
    </Screen>
  );
}
