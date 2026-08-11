import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createRateLimiter } from './rate-limit.js';

/**
 * The per-account cap on anything that spends money.
 *
 * Authentication stops an anonymous stranger burning kie.ai and LLM credits;
 * it does nothing about one account doing it in a loop, and accounts are free.
 *
 * Time is injected throughout, so these assert the boundaries exactly rather
 * than sleeping and hoping.
 */

/** A limiter with a clock the test drives. */
function limiterAt(limit: number, windowMs: number) {
  let now = 1_000_000;
  return {
    take: createRateLimiter({ limit, windowMs, now: () => now }),
    advance: (ms: number) => {
      now += ms;
    },
  };
}

describe('within the window', () => {
  it('allows exactly the limit and refuses the next one', () => {
    const { take } = limiterAt(3, 60_000);

    assert.deepEqual(take('user-a'), { allowed: true, remaining: 2 });
    assert.deepEqual(take('user-a'), { allowed: true, remaining: 1 });
    assert.deepEqual(take('user-a'), { allowed: true, remaining: 0 });

    const refused = take('user-a');
    assert.equal(refused.allowed, false);
  });

  it('says how long to wait, rounded up so a retry is not early', () => {
    const { take, advance } = limiterAt(1, 60_000);
    take('user-a');

    advance(59_500); // 500ms of the window left
    const refused = take('user-a');

    assert.equal(refused.allowed, false);
    // Not 0 — being told to wait zero seconds invites an immediate retry that
    // fails again.
    if (!refused.allowed) assert.equal(refused.retryAfterSeconds, 1);
  });
});

describe('across callers', () => {
  it('counts each account separately', () => {
    const { take } = limiterAt(1, 60_000);

    assert.equal(take('user-a').allowed, true);
    assert.equal(take('user-a').allowed, false);
    // One account exhausting its budget must not lock anybody else out.
    assert.equal(take('user-b').allowed, true);
  });
});

describe('when the window rolls over', () => {
  it('lets a refused caller back in', () => {
    const { take, advance } = limiterAt(2, 60_000);
    take('user-a');
    take('user-a');
    assert.equal(take('user-a').allowed, false);

    advance(60_001);

    assert.deepEqual(take('user-a'), { allowed: true, remaining: 1 });
  });

  it('does not let the clock passing part-way count as a reset', () => {
    const { take, advance } = limiterAt(1, 60_000);
    take('user-a');

    advance(59_999);

    assert.equal(take('user-a').allowed, false);
  });

  it('forgets callers who stopped, so the map does not grow forever', () => {
    // The sweep is internal, so this asserts the observable consequence: a
    // long-idle caller behaves exactly like a new one.
    const { take, advance } = limiterAt(1, 1_000);
    take('user-a');

    advance(10_000);

    assert.deepEqual(take('user-a'), { allowed: true, remaining: 0 });
  });
});
