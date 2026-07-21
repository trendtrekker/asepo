/**
 * Pulls durations out of instruction text so a step like
 * "bake for 11–13 minutes" can render a tappable timer.
 */

export type StepTimer = { minutes: number; label: string };

const DURATION = /(\d+)\s*(?:–|-|to)?\s*(\d+)?\s*(minute|minutes|min|mins|hour|hours|hr|hrs|second|seconds|sec|secs)\b/i;

export function extractTimer(text: string): StepTimer | null {
  const m = text.match(DURATION);
  if (!m) return null;

  const [, first, second, rawUnit] = m;
  const unit = rawUnit.toLowerCase();

  // For a range ("11–13 minutes") take the upper bound — the timer should not
  // ring before the food is plausibly done.
  const value = Number(second ?? first);
  if (!Number.isFinite(value) || value <= 0) return null;

  let minutes: number;
  if (unit.startsWith('hour') || unit.startsWith('hr')) minutes = value * 60;
  else if (unit.startsWith('sec')) minutes = value / 60;
  else minutes = value;

  if (minutes < 0.25 || minutes > 12 * 60) return null;

  const label =
    minutes >= 60
      ? `${minutes % 60 === 0 ? minutes / 60 : (minutes / 60).toFixed(1)} hr`
      : minutes < 1
        ? `${Math.round(minutes * 60)} sec`
        : `${Math.round(minutes)} min`;

  return { minutes, label };
}

export const formatCountdown = (totalSeconds: number) => {
  const s = Math.max(0, Math.round(totalSeconds));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}:${String(rem).padStart(2, '0')}`;
};
