import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Request } from 'express';

import { authenticate, isAuthFailure } from './auth.js';

/**
 * The gate in front of everything that spends money.
 *
 * These cover the paths that resolve before Supabase is ever consulted, which
 * is deliberate rather than a shortcut: "a caller with no usable credential is
 * turned away without us doing any work" is the property that stops a stranger
 * running up a kie.ai bill, and it should hold even if Supabase is unreachable.
 *
 * The authenticated path — a real token exchanged for a real user — needs a
 * live Supabase or a module mock, and is not covered here.
 */

/** Minimal stand-in for the one method authenticate() reads. */
const requestWith = (authorization?: string): Request =>
  ({ header: (name: string) => (name.toLowerCase() === 'authorization' ? authorization : undefined) }) as
    unknown as Request;

describe('a caller with no usable credential', () => {
  it('is refused when the header is absent entirely', async () => {
    const result = await authenticate(requestWith(undefined));

    assert.ok(isAuthFailure(result));
    assert.equal(result.status, 401);
  });

  it('is refused when the scheme is not Bearer', async () => {
    const result = await authenticate(requestWith('Basic dXNlcjpwYXNz'));

    assert.ok(isAuthFailure(result));
    assert.equal(result.status, 401);
  });

  it('is refused when Bearer carries nothing', async () => {
    // "Bearer " with an empty value would otherwise reach Supabase as a token
    // of empty string, which is a request we should never have made.
    const result = await authenticate(requestWith('Bearer '));

    assert.ok(isAuthFailure(result));
    assert.equal(result.status, 401);
  });

  it('is refused when Bearer carries only whitespace', async () => {
    const result = await authenticate(requestWith('Bearer    '));

    assert.ok(isAuthFailure(result));
    assert.equal(result.status, 401);
  });

  it('is turned away without the service-role client being built', async () => {
    // supabaseAdmin() throws when SUPABASE_SERVICE_ROLE_KEY is unset, which it
    // is here. Reaching it would surface as a 503; a clean 401 is proof that
    // an unauthenticated request costs us nothing at all.
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    const result = await authenticate(requestWith(undefined));

    assert.ok(isAuthFailure(result));
    assert.equal(result.status, 401);
    assert.notEqual(result.status, 503);
  });
});
