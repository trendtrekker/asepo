/** Read the post itself, never suggested videos elsewhere in TikTok's page. */
export function tiktokPostFromHtml(html: string, expectedId?: string): {
  text: string; title: string; author?: string; imageUrl?: string; subtitleUrl?: string;
} | null {
  for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    const id = match[1].match(/\bid\s*=\s*["']([^"']+)["']/i)?.[1];
    if (id !== '__UNIVERSAL_DATA_FOR_REHYDRATION__' && id !== 'SIGI_STATE') continue;
    try {
      const data = JSON.parse(match[2]);
      const items = data.ItemModule ?? {};
      const item = id === '__UNIVERSAL_DATA_FOR_REHYDRATION__'
        ? data.__DEFAULT_SCOPE__?.['webapp.video-detail']?.itemInfo?.itemStruct
        : expectedId ? items[expectedId] : Object.keys(items).length === 1 ? Object.values(items)[0] : null;
      if (!item || (expectedId && item.id !== expectedId) || typeof item.desc !== 'string' || !item.desc.trim()) continue;
      const subtitles = Array.isArray(item.video?.subtitleInfos) ? item.video.subtitleInfos : [];
      const english = subtitles.find((s: any) => /^en(?:g)?(?:-|$)/i.test(s.LanguageCodeName ?? '') && s.Format === 'webvtt');
      return {
        text: item.desc.trim(),
        title: item.desc.trim().slice(0, 120),
        author: typeof item.author?.uniqueId === 'string' ? item.author.uniqueId : undefined,
        imageUrl: typeof item.video?.cover === 'string' ? item.video.cover : undefined,
        subtitleUrl: typeof english?.Url === 'string' ? english.Url : undefined,
      };
    } catch { /* A malformed script must not hide usable OpenGraph metadata. */ }
  }
  return null;
}

/** Keep cue text only, excluding timestamps, cue settings and VTT metadata. */
export function textFromWebVtt(raw: string): string {
  if (!/^\uFEFF?WEBVTT(?:\s|$)/.test(raw)) return '';
  return raw.split(/\r?\n\s*\r?\n/).flatMap((block) => {
    const lines = block.split(/\r?\n/);
    if (/^(?:NOTE|STYLE|REGION)(?:\s|$)/.test(lines[0])) return [];
    const timing = lines.findIndex((line) => /^\s*(?:\d+:)?\d{2}:\d{2}\.\d{3}\s+-->\s+/.test(line));
    return timing < 0 ? [] : lines.slice(timing + 1);
  }).map((line) => line.replace(/<[^>]*>/g, '').trim()).filter(Boolean).join('\n').slice(0, 8000);
}
