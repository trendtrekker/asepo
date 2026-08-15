import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

/**
 * Supabase — auth, database, and storage. The anon key is meant to be public;
 * Row Level Security policies on each table are what actually restrict access,
 * not secrecy of this key. Never put the service_role key here — that one
 * bypasses RLS and belongs only in a trusted server, if it's ever needed.
 */

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    'Missing EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY — check .env'
  );
}

/**
 * The web build server-renders the first paint on plain Node (no DOM), and
 * AsyncStorage's web implementation reaches for `window` unconditionally —
 * so using it directly here crashes the whole render before a single
 * component mounts. This no-ops during that Node pass and only touches real
 * storage once the client is actually running in a browser or on-device.
 */
const authStorage =
  typeof window === 'undefined'
    ? { getItem: async () => null, setItem: async () => {}, removeItem: async () => {} }
    : AsyncStorage;

export const supabase = createClient(url, anonKey, {
  auth: {
    storage: authStorage,
    autoRefreshToken: true,
    persistSession: true,
    // Password-recovery and email-confirmation links hand the session back in
    // the URL fragment (#access_token=...). On web that fragment lands in the
    // address bar and only supabase-js can pick it up — and only if it's
    // allowed to look, which is what this does. Native has no address bar:
    // the same links arrive as an `asepo://` deep link and are parsed by hand
    // (see signInWithGoogle and reset-password), so leaving it on there would
    // just race with that. Guarded on `window` too because the web build
    // prerenders the first paint on plain Node, where there is no URL to read.
    detectSessionInUrl: Platform.OS === 'web' && typeof window !== 'undefined',
  },
});
