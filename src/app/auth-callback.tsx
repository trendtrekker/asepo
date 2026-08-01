import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Text } from 'react-native';

import { Screen } from '@/components/ui';
import { useAuth } from '@/store/auth-store';
import { useColors } from '@/theme/theme-context';

/**
 * Landing pad for the OAuth deep link.
 *
 * signInWithGoogle() asks for `asepo://auth-callback` as its redirect, and
 * WebBrowser.openAuthSessionAsync() pulls the tokens straight out of that URL —
 * so the tokens are already handled by the time this renders. But Android also
 * dispatches the deep link as a real intent, which expo-router resolves as a
 * route. Without a file here it matched nothing and the successful sign-in
 * dead-ended on "Unmatched Route" with the session sitting there unused.
 *
 * So this screen deliberately does no token parsing — duplicating that would
 * race with auth-store. It only waits for the session to land and forwards to
 * the same place an email sign-in goes.
 */
export default function AuthCallback() {
  const c = useColors();
  const router = useRouter();
  const { session, loading } = useAuth();
  /** setSession resolves a tick or two after this mounts; don't bail early. */
  const [gaveUp, setGaveUp] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setGaveUp(true), 8000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (loading) return;
    if (session) router.replace('/paywall');
    // No session after the grace period — the round-trip failed rather than
    // being slow. Back to sign-in beats spinning forever.
    else if (gaveUp) router.replace('/sign-in');
  }, [session, loading, gaveUp, router]);

  return (
    <Screen style={{ alignItems: 'center', justifyContent: 'center', gap: 14, padding: 30 }}>
      <ActivityIndicator color={c.accent} />
      <Text style={{ fontSize: 15, color: c.textSec, textAlign: 'center' }}>
        {gaveUp && !session ? 'That didn’t work — taking you back' : 'Finishing sign-in…'}
      </Text>
    </Screen>
  );
}
