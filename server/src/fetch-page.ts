/**
 * Page fetching, shared by every extraction strategy.
 *
 * Sends browser-like headers because a plain fetch gets 403'd by Cloudflare and
 * similar in front of many recipe sites.
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

/**
 * Refuses URLs pointing at our own network. Without this the server would
 * happily fetch cloud metadata or internal hosts for anyone who calls /import.
 */
export function assertPublicUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    throw new FetchError('That does not look like a valid link');
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new FetchError('Only http and https links are supported');
  }

  const host = url.hostname.toLowerCase();
  const blocked =
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host === '::1' ||
    /^127\./.test(host) ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^169\.254\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host);

  if (blocked) throw new FetchError('That host is not reachable');
  return url;
}

export async function fetchHtml(url: URL, timeoutMs = 15_000): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal, headers: BROWSER_HEADERS });
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

/** Fetches JSON with the same politeness, used for oEmbed endpoints. */
export async function fetchJson<T>(url: string, timeoutMs = 10_000): Promise<T | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { ...BROWSER_HEADERS, accept: 'application/json' },
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
