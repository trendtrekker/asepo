import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

/**
 * Page fetching, shared by every extraction strategy.
 *
 * Sends browser-like headers because a plain fetch gets 403'd by Cloudflare and
 * similar in front of many recipe sites.
 *
 * Every outbound request for a URL that came from outside goes through
 * safeFetch below. Importing is server-side request forgery by construction —
 * a stranger hands us a link and we fetch it — so the guard is the feature,
 * not a wrapper around it.
 */

export class FetchError extends Error {
  constructor(
    message: string,
    readonly status?: number
  ) {
    super(message);
  }
}

const BROWSER_HEADERS: Record<string, string> = {
  'user-agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'accept-language': 'en-US,en;q=0.9',
  'sec-ch-ua': '"Chromium";v="131", "Not_A Brand";v="24"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"macOS"',
  'sec-fetch-dest': 'document',
  'sec-fetch-mode': 'navigate',
  'sec-fetch-site': 'none',
  'upgrade-insecure-requests': '1',
};

/** Redirect chains longer than this are a loop or a games-playing server. */
const MAX_REDIRECTS = 5;
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

/* ------------------------------------------------------------------ *
 * Address filtering
 *
 * Judged on resolved addresses rather than on the hostname text.
 *
 * Text matching held up for dotted-quad IPv4 only because the URL parser
 * normalises the exotic spellings first — http://2130706433/ and
 * http://0177.0.0.1/ both arrive as 127.0.0.1. It fell over everywhere else:
 * url.hostname keeps the brackets on an IPv6 literal, so a `host === '::1'`
 * comparison never matched and every v6 address walked through; unlisted
 * ranges like CGNAT and 0.0.0.0/8 were never considered; and a name an
 * attacker controls resolves wherever they point it, which no amount of
 * pattern matching on the name can see.
 * ------------------------------------------------------------------ */

function isBlockedIPv4(addr: string): boolean {
  const parts = addr.split('.').map(Number);
  // Anything unparseable is refused rather than guessed at.
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return true;

  const [a, b] = parts;
  if (a === 0) return true; // "this network"
  if (a === 10) return true; // private
  if (a === 127) return true; // loopback
  if (a === 169 && b === 254) return true; // link-local — the cloud metadata endpoint
  if (a === 172 && b >= 16 && b <= 31) return true; // private
  if (a === 192 && b === 0) return true; // protocol assignments / TEST-NET-1
  if (a === 192 && b === 168) return true; // private
  if (a === 100 && b >= 64 && b <= 127) return true; // carrier-grade NAT
  if (a === 198 && (b === 18 || b === 19)) return true; // benchmarking
  if (a >= 224) return true; // multicast, reserved, broadcast
  return false;
}

function isBlockedIPv6(raw: string): boolean {
  const addr = raw.toLowerCase().split('%')[0]; // drop any zone id
  const head = Number.parseInt(addr.split(':')[0] || '', 16);

  // ::/16 in one stroke: the unspecified address, loopback in any spelling,
  // and every IPv4-mapped or -compatible form including the hex ones a
  // dotted-quad regex misses. None is a legitimate target for a public fetch.
  if (!Number.isFinite(head) || head === 0) return true;
  if ((head & 0xfe00) === 0xfc00) return true; // fc00::/7  unique-local
  if ((head & 0xffc0) === 0xfe80) return true; // fe80::/10 link-local
  if ((head & 0xff00) === 0xff00) return true; // ff00::/8  multicast
  return false;
}

/**
 * Refuses anything pointing at our own network.
 *
 * Note the residual gap this cannot close on its own: the name is resolved
 * here and resolved again by fetch when it connects, so a DNS server that
 * answers differently between the two calls (rebinding) still gets through.
 * Closing that needs the connection pinned to the address checked here, which
 * means a custom dispatcher. Everything short of that — literals in every
 * notation, names that point inward, and each redirect hop — is covered.
 */
async function assertPublicHost(url: URL): Promise<void> {
  // url.hostname keeps the brackets on an IPv6 literal.
  const host = url.hostname.replace(/^\[|\]$/g, '');

  const literal = isIP(host);
  if (literal === 4) {
    if (isBlockedIPv4(host)) throw new FetchError('That host is not reachable');
    return;
  }
  if (literal === 6) {
    if (isBlockedIPv6(host)) throw new FetchError('That host is not reachable');
    return;
  }

  let addresses: { address: string; family: number }[];
  try {
    addresses = await lookup(host, { all: true, verbatim: true });
  } catch {
    throw new FetchError('Could not find that site');
  }
  if (!addresses.length) throw new FetchError('Could not find that site');

  // Every answer has to be acceptable — one internal address among several is
  // enough for the connection to land there.
  for (const { address, family } of addresses) {
    if (family === 6 ? isBlockedIPv6(address) : isBlockedIPv4(address)) {
      throw new FetchError('That host is not reachable');
    }
  }
}

export async function assertPublicUrl(raw: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    throw new FetchError('That does not look like a valid link');
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new FetchError('Only http and https links are supported');
  }

  await assertPublicHost(url);
  return url;
}

/**
 * fetch, with every hop of the redirect chain checked.
 *
 * Following redirects automatically is what made checking the entry URL
 * mostly theatre: a public link answering 302 to http://169.254.169.254/ took
 * the whole guard with it. Redirects are therefore followed by hand so each
 * new location faces the same check as the first.
 *
 * The caller owns the AbortSignal, so its timeout covers the whole chain plus
 * reading the body, rather than resetting per hop.
 */
export async function safeFetch(target: URL, init: RequestInit = {}): Promise<Response> {
  let url = target;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    await assertPublicHost(url);

    const response = await fetch(url, { ...init, redirect: 'manual' });
    if (!REDIRECT_STATUSES.has(response.status)) return response;

    const location = response.headers.get('location');
    if (!location) return response; // a 3xx going nowhere; let the caller judge it

    try {
      url = new URL(location, url);
    } catch {
      throw new FetchError('That link redirects somewhere invalid');
    }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      throw new FetchError('Only http and https links are supported');
    }
  }

  throw new FetchError('That link redirects too many times');
}

export async function fetchHtml(url: URL, timeoutMs = 15_000): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await safeFetch(url, { signal: controller.signal, headers: BROWSER_HEADERS });
    if (!response.ok) {
      throw new FetchError(`The site returned ${response.status}`, response.status);
    }
    return await response.text();
  } catch (e) {
    if (e instanceof FetchError) throw e;
    throw new FetchError('Could not load that page');
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Fetches JSON with the same politeness, used for oEmbed endpoints.
 *
 * Retries once: a single dropped request against TikTok's oEmbed otherwise
 * degrades into a confusing "no readable text" error, because the caller falls
 * back to scraping HTML that never contains the caption.
 */
export async function fetchJson<T>(url: string, timeoutMs = 10_000, attempts = 2): Promise<T | null> {
  let target: URL;
  try {
    target = await assertPublicUrl(url);
  } catch {
    return null;
  }

  for (let attempt = 1; attempt <= attempts; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await safeFetch(target, {
        signal: controller.signal,
        headers: { ...BROWSER_HEADERS, accept: 'application/json' },
      });
      if (response.ok) return (await response.json()) as T;
      // A 4xx won't change on retry; only transient failures are worth repeating.
      if (response.status < 500) return null;
    } catch {
      // Network-level failure — worth one more go.
    } finally {
      clearTimeout(timer);
    }
    if (attempt < attempts) await new Promise((r) => setTimeout(r, 1200));
  }
  return null;
}

/** Refuses to pull an unbounded response into memory on someone else's say-so. */
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

/**
 * Fetches bytes for a URL that arrived from outside — a page's og:image, or a
 * generated-image provider's CDN link. Same guard as everything else here,
 * which is the whole point: this used to be a bare fetch() in storage.ts, and
 * was the one outbound request nothing checked.
 */
export async function fetchBytes(
  rawUrl: string,
  timeoutMs = 15_000
): Promise<{ bytes: Buffer; contentType: string }> {
  const url = await assertPublicUrl(rawUrl);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await safeFetch(url, { signal: controller.signal, headers: BROWSER_HEADERS });
    if (!response.ok) throw new FetchError(`Could not download that file (${response.status})`, response.status);

    const declared = Number(response.headers.get('content-length'));
    if (Number.isFinite(declared) && declared > MAX_IMAGE_BYTES) {
      throw new FetchError('That file is too large');
    }

    const bytes = Buffer.from(await response.arrayBuffer());
    // content-length is a claim, not a promise — check what actually arrived.
    if (bytes.byteLength > MAX_IMAGE_BYTES) throw new FetchError('That file is too large');

    return { bytes, contentType: response.headers.get('content-type') ?? '' };
  } finally {
    clearTimeout(timer);
  }
}
