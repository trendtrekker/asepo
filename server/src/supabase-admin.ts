import { createClient } from '@supabase/supabase-js';

/**
 * Server-only Supabase client, using the service_role key — bypasses RLS
 * entirely. Never import this from anywhere the client can reach; it exists
 * solely for operations no anon-key policy can safely allow, like deleting
 * an account. The app never sees this key.
 */

let client: ReturnType<typeof createClient> | null = null;

export function supabaseAdmin() {
  if (client) return client;

  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set — add them to server/.env');
  }

  client = createClient(url, key, { auth: { persistSession: false } });
  return client;
}
