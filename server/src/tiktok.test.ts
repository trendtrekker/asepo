import assert from 'node:assert/strict';
import { test } from 'node:test';
import { textFromWebVtt, tiktokPostFromHtml } from './tiktok.js';

const post = {
  id: '123', desc: 'Chicken pasta\n2 chicken breasts\n8 oz pasta',
  author: { uniqueId: 'thecook' },
  video: { cover: 'https://example.com/cover.jpg', subtitleInfos: [
    { LanguageCodeName: 'spa-ES', Format: 'webvtt', Url: 'https://example.com/es.vtt' },
    { LanguageCodeName: 'eng-US', Format: 'webvtt', Url: 'https://example.com/en.vtt' },
  ] },
};
const page = (item: unknown) => `<script type="application/json" id="__UNIVERSAL_DATA_FOR_REHYDRATION__">${JSON.stringify({
  __DEFAULT_SCOPE__: { 'webapp.video-detail': { itemInfo: { itemStruct: item } }, recommendations: { desc: 'Wrong dish' } },
})}</script>`;

test('reads the actual TikTok post when oEmbed/OpenGraph contain no caption', () => {
  assert.deepEqual(tiktokPostFromHtml(page(post)), {
    text: post.desc, title: post.desc, author: 'thecook',
    imageUrl: post.video.cover, subtitleUrl: 'https://example.com/en.vtt',
  });
});
test('rejects a different video and ignores recommendations or malformed scripts', () => {
  assert.equal(tiktokPostFromHtml(page(post), '456'), null);
  assert.equal(tiktokPostFromHtml(page(null)), null);
  assert.equal(tiktokPostFromHtml('<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__">broken</script>'), null);
});
test('supports older SIGI pages without selecting an unrelated video', () => {
  const html = `<script id='SIGI_STATE'>${JSON.stringify({ ItemModule: { '123': post, '456': { ...post, id: '456' } } })}</script>`;
  assert.equal(tiktokPostFromHtml(html), null);
  assert.equal(tiktokPostFromHtml(html, '123')?.text, post.desc);
});
test('reads VTT cue text and removes timestamps, styling and metadata', () => {
  const vtt = 'WEBVTT\n\nNOTE Ignore this\n\n1\n00:00:01.000 --> 00:00:02.000 align:start\n<c>Season the chicken.</c>\n\n00:00:03.000 --> 00:00:04.000\nSimmer for 15 minutes.\n';
  assert.equal(textFromWebVtt(vtt), 'Season the chicken.\nSimmer for 15 minutes.');
  assert.equal(textFromWebVtt('<html>Access denied</html>'), '');
});
