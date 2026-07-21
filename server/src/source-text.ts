import { fetchHtml, fetchJson, type FetchError } from './fetch-page.js';

/**
 * Gathers whatever text a page can give us, so an extractor has something to
 * work with even when there is no structured recipe markup.
 *
 * Social video is the hard case: TikTok and Instagram render client-side, so
 * the HTML holds almost nothing. Their oEmbed endpoints and OpenGraph tags do
 * carry the caption, which for recipe accounts is usually the whole recipe.
 */

export type SourceText = {
  title?: string;
  /** The caption, description, or article body — whatever we could recover. */
  text: string;
  imageUrl?: string;
  author?: string;
  platform: string;
};

const NAMED_ENTITIES: Record<string, string> = {
  '&quot;': '"',
  '&apos;': "'",
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&nbsp;': ' ',
};

/**
 * Meta tags arrive HTML-escaped. Instagram in particular encodes emoji and
 * smart quotes as numeric entities (&#x1f60d;, &#x2019;), which would otherwise
 * end up in ingredient names verbatim.
 */
const decode = (s: string) =>
  s
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&(?:quot|apos|amp|lt|gt|nbsp);/g, (m) => NAMED_ENTITIES[m] ?? m)
    .replace(/\\n/g, '\n');

function meta(html: string, property: string): string | undefined {
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']*)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${property}["']`, 'i'),
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m?.[1]) return decode(m[1]).trim();
  }
  return undefined;
}

/** Strips tags/scripts and collapses whitespace, for the generic-page case. */
function readableText(html: string, limit = 6000): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<nav[\s\S]*?<\/nav>/gi, ' ')
    .replace(/<footer[\s\S]*?<\/footer>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, limit);
}

export function platformOf(url: URL): string {
  const h = url.hostname.replace(/^www\./, '').toLowerCase();
  if (h.includes('tiktok')) return 'TikTok';
  if (h.includes('instagram')) return 'Instagram';
  if (h.includes('youtube') || h.includes('youtu.be')) return 'YouTube';
  if (h.includes('pinterest')) return 'Pinterest';
  if (h.includes('facebook')) return 'Facebook';
  return 'Web';
}

type OEmbed = { title?: string; author_name?: string; thumbnail_url?: string };

/** TikTok's oEmbed needs no auth and returns the caption as `title`. */
async function tiktokOEmbed(url: URL): Promise<SourceText | null> {
  const data = await fetchJson<OEmbed>(`https://www.tiktok.com/oembed?url=${encodeURIComponent(url.toString())}`);
  if (!data?.title) return null;
  return {
    title: data.title.slice(0, 120),
    text: decode(data.title),
    imageUrl: data.thumbnail_url,
    author: data.author_name,
    platform: 'TikTok',
  };
}

async function youtubeOEmbed(url: URL): Promise<SourceText | null> {
  const data = await fetchJson<OEmbed>(
    `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(url.toString())}`
  );
  if (!data?.title) return null;
  return {
    title: data.title,
    text: data.title,
    imageUrl: data.thumbnail_url,
    author: data.author_name,
    platform: 'YouTube',
  };
}

/**
 * Best-effort text for any URL. Never throws for a missing caption — returns
 * whatever it found, so callers can decide whether it's enough.
 */
export async function gatherSourceText(url: URL): Promise<SourceText> {
  const platform = platformOf(url);

  // Platform-specific endpoints first: they give clean captions where the HTML
  // would give us a JavaScript shell.
  if (platform === 'TikTok') {
    const viaOEmbed = await tiktokOEmbed(url);
    if (viaOEmbed && viaOEmbed.text.length > 40) return viaOEmbed;
  }
  if (platform === 'YouTube') {
    const viaOEmbed = await youtubeOEmbed(url);
    if (viaOEmbed) {
      // The title alone is thin; try to add the description from the page.
      try {
        const html = await fetchHtml(url);
        const description = meta(html, 'og:description') ?? '';
        if (description.length > viaOEmbed.text.length) {
          viaOEmbed.text = `${viaOEmbed.title}\n\n${description}`;
        }
      } catch {
        /* the oEmbed title is still better than nothing */
      }
      return viaOEmbed;
    }
  }

  let html: string;
  try {
    html = await fetchHtml(url);
  } catch (e) {
    // Instagram and TikTok frequently block server-side fetches outright.
    throw e as FetchError;
  }

  const ogTitle = meta(html, 'og:title');
  const ogDescription = meta(html, 'og:description');
  const description = meta(html, 'description');
  const image = meta(html, 'og:image');

  // On social pages the caption lives in og:description and is the only useful
  // content; on articles the body text is far richer.
  const caption = ogDescription ?? description ?? '';
  const body = platform === 'Web' ? readableText(html) : '';
  const text = [caption, body].filter(Boolean).join('\n\n').trim();

  return {
    title: ogTitle ?? undefined,
    text,
    imageUrl: image,
    author: meta(html, 'og:site_name') ?? undefined,
    platform,
  };
}
