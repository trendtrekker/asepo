import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const marketingAssets = ['brand-icon.png', 'favicon.png', 'importing.png', 'paywall-hero.jpg', 'plan-your-week.png', 'save-any-recipe.png', 'shop-smarter.png'];
mkdirSync(new URL('../legal-site/assets/', import.meta.url), { recursive: true });
for (const asset of marketingAssets) {
  copyFileSync(new URL(`../assets/images/${asset}`, import.meta.url), new URL(`../legal-site/assets/${asset}`, import.meta.url));
}

const pages = [
  { slug: 'terms', title: 'Terms of Use' },
  { slug: 'privacy', title: 'Privacy Policy' },
];

const escapeHtml = (value) => value
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;');

for (const page of pages) {
  const source = readFileSync(new URL(`../src/app/${page.slug}.tsx`, import.meta.url), 'utf8');
  const sections = [...source.matchAll(/\{\s*heading:\s*'([^']+)',\s*paragraphs:\s*\[([\s\S]*?)\]\s*\}/g)]
    .map((match) => ({
      heading: match[1],
      paragraphs: [...match[2].matchAll(/'([^']*)'/g)].map((item) => item[1]),
    }));

  if (!sections.length) throw new Error(`No legal sections found for ${page.slug}`);

  const body = sections.map(({ heading, paragraphs }) =>
    `<h2>${escapeHtml(heading)}</h2>${paragraphs.map((text) => `<p>${escapeHtml(text)}</p>`).join('')}`
  ).join('');
  const other = page.slug === 'terms'
    ? '<a href="/privacy">Privacy Policy</a>'
    : '<a href="/terms">Terms of Use</a>';

  writeFileSync(new URL(`../legal-site/${page.slug}.html`, import.meta.url),
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${page.title} · Asepo</title><link rel="stylesheet" href="/styles.css"></head><body><main><a class="brand" href="/">ASEPO</a><h1>${page.title}</h1><p class="updated">Last updated: 10 September 2026</p>${body}<nav class="links">${other}<a href="/">Legal home</a></nav><footer>Questions: <a href="mailto:info@awahai.com">info@awahai.com</a></footer></main></body></html>`
  );
}
