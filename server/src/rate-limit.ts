/**
 * A fixed-window request counter, per caller.
 *
 * Authentication stops an anonymous stranger spending our kie.ai and LLM
 * credits; it does not stop one signed-up account doing the same thing in a
 * loop, and making an account is free. This is the second half of that.
 *
 * In memory, and therefore per instance — the same caveat the job store
 * carries. With one server that is exactly correct; behind several it becomes
 * a per-instance limit, which is still a bound, just a looser one than it
 * reads as. Redis is the answer if this ever runs more than once, and the
 * limits below would want revisiting at the same time.
 *
 * Fixed window rather than a sliding one on purpose: the burst it permits at a
 * window boundary is at most 2x the limit, which for spend control is neither
 * here nor there, and it costs one integer per caller instead of a list of
 * timestamps.
 */

export type RateLimitDecision =
  | { allowed: true; remaining: number }
  | { allowed: false; retryAfterSeconds: number };

type Window = { count: number; resetAt: number };

export type RateLimiter = (key: string) => RateLimitDecision;

export function createRateLimiter(options: {
  limit: number;
  windowMs: number;
  /** Injectable so tests can move time without waiting for it. */
  now?: () => number;
}): RateLimiter {
  const { limit, windowMs, now = Date.now } = options;
  const windows = new Map<string, Window>();
  let lastSweep = now();

  /** Drops expired windows so a long-lived process doesn't accumulate keys. */
  const sweep = (at: number) => {
    if (at - lastSweep < windowMs) return;
    for (const [key, window] of windows) if (window.resetAt <= at) windows.delete(key);
    lastSweep = at;
  };

  return function take(key: string): RateLimitDecision {
    const at = now();
    sweep(at);

    const current = windows.get(key);
    if (!current || current.resetAt <= at) {
      windows.set(key, { count: 1, resetAt: at + windowMs });
      return { allowed: true, remaining: limit - 1 };
    }

    if (current.count >= limit) {
      // Rounded up, so a caller told to wait one second does not come back to
      // the same refusal a few milliseconds early.
      return { allowed: false, retryAfterSeconds: Math.ceil((current.resetAt - at) / 1000) };
    }

    current.count += 1;
    return { allowed: true, remaining: limit - current.count };
  };
}
