import { createHash } from 'node:crypto';

import { supabaseAdmin } from './supabase-admin.js';

export type CacheKind = 'url' | 'idea' | 'suggestion' | 'image';

/** Bump when prompts or the stored JSON contract change incompatibly. */
export const CACHE_VERSION = 1;

const TTL_MS: Record<CacheKind, number> = {
  url: 30 * 24 * 60 * 60 * 1000,
  idea: 90 * 24 * 60 * 60 * 1000,
  suggestion: 7 * 24 * 60 * 60 * 1000,
  image: 365 * 24 * 60 * 60 * 1000,
};

const TRACKING_PARAMS = /^(?:utm_.+|fbclid|gclid|igshid|mc_cid|mc_eid)$/i;

export function normalizeCacheInput(kind: CacheKind, input: string): string {
  const compact = input.normalize('NFKC').trim().replace(/\s+/g, ' ');
  if (kind !== 'url') return compact.toLocaleLowerCase('en-US');

  try {
    const url = new URL(compact);
    url.hash = '';
    url.hostname = url.hostname.toLowerCase();
    for (const name of [...url.searchParams.keys()]) {
      if (TRACKING_PARAMS.test(name)) url.searchParams.delete(name);
    }
    url.searchParams.sort();
    if ((url.protocol === 'https:' && url.port === '443') || (url.protocol === 'http:' && url.port === '80')) {
      url.port = '';
    }
    if (url.pathname !== '/') url.pathname = url.pathname.replace(/\/+$/, '');
    return url.toString();
  } catch {
    return compact;
  }
}

export function recipeCacheKey(kind: CacheKind, input: string): string {
  const normalized = normalizeCacheInput(kind, input);
  return createHash('sha256').update(`v${CACHE_VERSION}:${kind}:${normalized}`).digest('hex');
}

/** Cache failures never block a recipe—the AI path remains the fallback. */
export async function readCache<T>(kind: CacheKind, input: string): Promise<T | null> {
  const cacheKey = recipeCacheKey(kind, input);
  try {
    const table = supabaseAdmin().from('recipe_cache') as any;
    const { data, error } = await table
      .select('payload, hit_count')
      .eq('cache_key', cacheKey)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();
    if (error || !data) return null;

    // Analytics only. A racing update can undercount hits, but must never make
    // the actual cache read fail or delay the person waiting for a recipe.
    void table
      .update({ hit_count: (data.hit_count ?? 0) + 1, last_hit_at: new Date().toISOString() })
      .eq('cache_key', cacheKey);
    return data.payload as T;
  } catch (error) {
    console.warn(`[cache] read failed for ${kind}:`, error);
    return null;
  }
}

export async function writeCache(kind: CacheKind, input: string, payload: unknown): Promise<void> {
  const normalizedInput = normalizeCacheInput(kind, input);
  try {
    const table = supabaseAdmin().from('recipe_cache') as any;
    const { error } = await table
      .upsert({
        cache_key: recipeCacheKey(kind, input),
        kind,
        normalized_input: normalizedInput,
        payload,
        prompt_version: CACHE_VERSION,
        expires_at: new Date(Date.now() + TTL_MS[kind]).toISOString(),
        updated_at: new Date().toISOString(),
      });
    if (error) console.warn(`[cache] write failed for ${kind}: ${error.message}`);
  } catch (error) {
    console.warn(`[cache] write failed for ${kind}:`, error);
  }
}

export function imageCacheInput(input: {
  title: string;
  cuisine?: string;
  ingredients?: string[];
}): string {
  const ingredients = (input.ingredients ?? [])
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)
    .sort();
  return [input.title, input.cuisine ?? '', ...ingredients]
    .join('|');
}
