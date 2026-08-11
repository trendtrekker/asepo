import type { Request } from 'express';

import { supabaseAdmin } from './supabase-admin.js';

/**
 * Who is calling.
 *
 * Every endpoint that spends money — an LLM call, a kie.ai generation — now
 * goes through here. It used to be that /import, /images and /suggest-meals
 * took no credentials at all, which was survivable only while the backend URL
 * was unknown. It is not unknown: EXPO_PUBLIC_API_URL is compiled into the app
 * bundle, and a bundle is a zip file. Anyone who installs the app can read the
 * address and then spend our credits from curl, indefinitely.
 *
 * Verified against Supabase rather than by decoding the JWT locally, so a
 * revoked or expired session actually stops working.
 */

export type AuthFailure = { status: number; error: string };
export type Caller = { userId: string };

export function isAuthFailure(result: Caller | AuthFailure): result is AuthFailure {
  return 'error' in result;
}

function bearerToken(req: Request): string | null {
  const header = req.header('authorization') ?? '';
  if (!header.startsWith('Bearer ')) return null;
  const token = header.slice('Bearer '.length).trim();
  return token.length > 0 ? token : null;
}

/** A valid session, nothing more. The bar for anything that costs us money. */
export async function authenticate(req: Request): Promise<Caller | AuthFailure> {
  const token = bearerToken(req);
  if (!token) return { status: 401, error: 'Sign in required' };

  try {
    const { data, error } = await supabaseAdmin().auth.getUser(token);
    if (error || !data.user) return { status: 401, error: 'Invalid or expired session' };
    return { userId: data.user.id };
  } catch (e) {
    // A misconfigured server (no service-role key) or Supabase being down.
    // Neither is the caller's fault, and neither should read as "signed out".
    console.error('[auth] could not verify session —', e);
    return { status: 503, error: 'Could not verify your session. Try again shortly.' };
  }
}

/**
 * A valid session *and* Pro. Layered on authenticate so there is one place
 * that decides what a valid session is.
 *
 * The caveat from before still stands: profiles.is_pro is a synced client
 * preference that the account itself can write, so this cannot prove a
 * purchase — there is no billing yet for it to prove. What it does is make
 * these endpoints cost an account rather than nothing at all.
 */
export async function authenticatePro(req: Request): Promise<Caller | AuthFailure> {
  const caller = await authenticate(req);
  if (isAuthFailure(caller)) return caller;

  try {
    const { data: profile, error } = await supabaseAdmin()
      .from('profiles')
      .select('is_pro')
      .eq('id', caller.userId)
      .single<{ is_pro: boolean }>();
    if (error || !profile?.is_pro) return { status: 403, error: 'Asepo Pro required' };
    return caller;
  } catch (e) {
    console.error('[auth] could not read entitlement —', e);
    return { status: 503, error: 'Could not check your subscription. Try again shortly.' };
  }
}
