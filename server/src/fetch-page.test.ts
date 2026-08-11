import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { assertPublicUrl, FetchError } from './fetch-page.js';

/**
 * The address guard, which is the only thing standing between /import and
 * server-side request forgery: the endpoint's whole job is fetching a link a
 * stranger chose.
 *
 * Grouped by the trick rather than by range. Note which of these the old
 * hostname-matching version actually failed: every IPv6 form (it compared
 * against '::1' while url.hostname hands back '[::1]', brackets included),
 * plus the ranges it simply never listed. The exotic IPv4 spellings below it
 * did catch, because the URL parser normalises them to dotted-quad before any
 * matching runs — they are kept here as regression cover for the classifier,
 * not because they were once holes.
 *
 * No network is required. Every rejection is decided either from the literal
 * or from a name that resolves locally.
 */

const rejects = (url: string) =>
  assert.rejects(() => assertPublicUrl(url), FetchError, `expected ${url} to be refused`);

describe('plain internal addresses', () => {
  it('refuses loopback, link-local, and the private ranges', async () => {
    await rejects('http://127.0.0.1/');
    await rejects('http://10.0.0.1/');
    await rejects('http://192.168.1.1/');
    await rejects('http://172.16.0.1/');
    await rejects('http://[::1]/');
    await rejects('http://[fc00::1]/');
    await rejects('http://[fe80::1]/');
  });

  it('refuses the cloud metadata endpoint', async () => {
    // The address that turns an SSRF into stolen instance credentials.
    await rejects('http://169.254.169.254/latest/meta-data/');
  });
});

describe('the same addresses spelled to defeat a string match', () => {
  it('refuses IPv4 written as decimal, octal, hex, or short form', async () => {
    // All four normalise to 127.0.0.1 at parse time, so they never reach the
    // classifier as anything else. Pinned so that stays true.
    await rejects('http://2130706433/');
    await rejects('http://0177.0.0.1/');
    await rejects('http://0x7f000001/');
    await rejects('http://127.1/');
  });

  it('refuses IPv6 loopback however it is written', async () => {
    await rejects('http://[0:0:0:0:0:0:0:1]/');
    // IPv4-mapped loopback in hex — survives URL normalisation untouched, and
    // a dotted-quad regex does not see an address here at all.
    await rejects('http://[::ffff:7f00:1]/');
    await rejects('http://[::ffff:127.0.0.1]/');
  });

  it('refuses a hostname that resolves inward', async () => {
    // Nothing about the text "localhost" is what disqualifies it — it is
    // refused because it resolves to a loopback address, which is what makes
    // the check hold for an attacker-controlled name pointed anywhere else.
    await rejects('http://localhost/');
    await rejects('http://localhost:8787/admin');
  });
});

describe('non-addresses', () => {
  it('refuses schemes that are not http(s)', async () => {
    await rejects('file:///etc/passwd');
    await rejects('gopher://127.0.0.1/');
    await rejects('data:text/plain,hello');
  });

  it('refuses malformed input rather than guessing', async () => {
    await rejects('not a url');
    await rejects('');
  });

  it('reports a name that does not resolve as not found', async () => {
    // .invalid is reserved precisely so it can never resolve.
    await assert.rejects(
      () => assertPublicUrl('http://asepo-nonexistent.invalid/'),
      (e: unknown) => e instanceof FetchError && /find that site/.test(e.message)
    );
  });
});

describe('what must still get through', () => {
  it('accepts a public address and returns the parsed URL', async () => {
    // A literal, so this settles without a DNS round trip.
    const url = await assertPublicUrl('https://93.184.216.34/recipes/pasta?x=1');
    assert.equal(url.hostname, '93.184.216.34');
    assert.equal(url.pathname, '/recipes/pasta');
    assert.equal(url.search, '?x=1');
  });

  it('accepts public IPv6', async () => {
    const url = await assertPublicUrl('https://[2606:2800:220:1:248:1893:25c8:1946]/');
    assert.equal(url.protocol, 'https:');
  });
});
