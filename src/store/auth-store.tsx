import type { AuthError, Session, User } from '@supabase/supabase-js';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';

/**
 * Supabase session state, exposed the same way app-store.tsx exposes local
 * state — a context + useAuth() hook, kept separate from AppStoreProvider so
 * "who's signed in" and "what's on this device" stay independently testable.
 */

type AuthResult = { error: string | null };

/**
 * Where Supabase should send someone after they click the link in a
 * password-reset email. Web gets a real URL off the current origin, so it
 * works the same on localhost and on the deployed site; native gets the
 * `asepo://` deep link.
 *
 * Both have to be listed under Auth -> URL Configuration -> Redirect URLs in
 * the Supabase dashboard. Anything not on that list is silently swapped for
 * the project's Site URL, which looks exactly like the link "not working".
 */
function passwordResetRedirect(): string {
  return Platform.OS === 'web'
    ? `${window.location.origin}/reset-password`
    : AuthSession.makeRedirectUri({ scheme: 'asepo', path: 'reset-password' });
}

/**
 * Supabase answers "no account with that email" and "wrong password" with one
 * identical `invalid_credentials` — deliberately, so the sign-in form can't be
 * used to probe which emails have accounts. Worth keeping, but the raw message
 * ("Invalid login credentials") reads as *we don't recognise you*, which sends
 * people off to create a second account when the password was the real
 * problem. Keep the ambiguity, name the likelier cause, point at the way out.
 */
function describeSignInError(error: AuthError): string {
  if (error.code === 'invalid_credentials' || /invalid login credentials/i.test(error.message)) {
    return "That email and password don't match. Check the password, or reset it with “Forgot password?”.";
  }
  if (error.code === 'email_not_confirmed') {
    return 'Confirm your email first — check your inbox for the link we sent when you signed up.';
  }
  return error.message;
}

type AuthStore = {
  session: Session | null;
  user: User | null;
  /** True until the initial session check finishes — avoids a flash of the
   * signed-out UI while a real session is still loading from storage. */
  loading: boolean;
  signUpWithEmail: (email: string, password: string) => Promise<AuthResult>;
  signInWithEmail: (email: string, password: string) => Promise<AuthResult>;
  signInWithGoogle: () => Promise<AuthResult>;
  /** Emails a reset link that lands on /reset-password. */
  sendPasswordReset: (email: string) => Promise<AuthResult>;
  /** Sets a new password for whoever the current session belongs to — the
   * recovery session from a reset link counts, which is what makes the
   * forgotten-password path work. */
  updatePassword: (password: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
  /** Permanently deletes the account — recipes, cookbooks, grocery list, and
   * plan all cascade-delete with it. Cannot be undone. */
  deleteAccount: () => Promise<AuthResult>;
};

const AuthContext = createContext<AuthStore | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  const signUpWithEmail = async (email: string, password: string): Promise<AuthResult> => {
    const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
    if (error) return { error: error.message };

    // Supabase deliberately doesn't error here for an email that's already
    // registered — with email confirmation on (as this project has it), it
    // hands back an obfuscated user object instead, so signUp can't be used
    // to probe which emails have accounts. The one tell: identities comes
    // back empty rather than holding the identity that would've just been
    // created. Without this check the screen told a returning user to "check
    // your email" for a confirmation that was never sent.
    if (data.user && data.user.identities?.length === 0) {
      return { error: 'An account with this email already exists — try signing in instead.' };
    }
    return { error: null };
  };

  const signInWithEmail = async (email: string, password: string): Promise<AuthResult> => {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    return { error: error ? describeSignInError(error) : null };
  };

  const sendPasswordReset = async (email: string): Promise<AuthResult> => {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: passwordResetRedirect(),
    });
    return { error: error?.message ?? null };
  };

  const updatePassword = async (password: string): Promise<AuthResult> => {
    const { error } = await supabase.auth.updateUser({ password });
    return { error: error?.message ?? null };
  };

  /**
   * Google has no redirect-based flow inside Expo Go — a custom scheme deep
   * link only comes back to a standalone or dev-client build. This still
   * runs correctly in either of those; in Expo Go the browser will open but
   * has nowhere real to hand the result back to.
   */
  const signInWithGoogle = async (): Promise<AuthResult> => {
    const redirectTo = AuthSession.makeRedirectUri({ scheme: 'asepo', path: 'auth-callback' });

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo, skipBrowserRedirect: true },
    });
    if (error || !data.url) return { error: error?.message ?? 'Could not start Google sign-in' };

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (result.type !== 'success' || !result.url) {
      // User backed out of the browser sheet — not a real error to surface.
      return { error: null };
    }

    // Supabase hands the tokens back in the URL fragment (#access_token=...),
    // which URLSearchParams won't parse from a "?" query — swap it in first.
    const parsed = new URL(result.url.replace('#', '?'));
    const accessToken = parsed.searchParams.get('access_token');
    const refreshToken = parsed.searchParams.get('refresh_token');
    if (!accessToken || !refreshToken) {
      return { error: 'Google sign-in did not return a session' };
    }

    const { error: sessionError } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    return { error: sessionError?.message ?? null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const deleteAccount = async (): Promise<AuthResult> => {
    const token = session?.access_token;
    if (!token) return { error: 'Not signed in' };

    const baseUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
    if (!baseUrl) return { error: 'Account deletion needs a server — not configured' };

    try {
      const response = await fetch(`${baseUrl.replace(/\/$/, '')}/account`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        return { error: body?.error ?? `Could not delete account (${response.status})` };
      }
    } catch (e) {
      // e.message here is the raw fetch failure ("TypeError: Failed to fetch"),
      // which goes straight into a toast — keep it out of the UI.
      if (__DEV__) console.warn('[auth] delete account failed —', e);
      return { error: "Asepo couldn't reach the internet. Check your connection and try again." };
    }

    // The account (and its session) is gone server-side — drop the local
    // copy too rather than leaving a session pointing at nothing.
    await supabase.auth.signOut();
    return { error: null };
  };

  const value: AuthStore = {
    session,
    user: session?.user ?? null,
    loading,
    signUpWithEmail,
    signInWithEmail,
    signInWithGoogle,
    sendPasswordReset,
    updatePassword,
    signOut,
    deleteAccount,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
