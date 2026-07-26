import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

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
    // RN has no browser URL bar to land a session token in — sessions come
    // back through a deep link instead (see the OAuth flow), not this.
    detectSessionInUrl: false,
  },
});
