/**
 * Ingredient quantity maths: parsing the loose strings recipes use, scaling
 * them to a serving count, and rendering them back as something a cook would
 * actually write ("1½ cups", not "1.5000000000000002 cups").
 */

const UNICODE_FRACTIONS: Record<string, number> = {
  '½': 0.5,
  '⅓': 1 / 3,
  '⅔': 2 / 3,
  '¼': 0.25,
  '¾': 0.75,
  '⅕': 0.2,
  '⅛': 0.125,
  '⅜': 0.375,
  '⅝': 0.625,
  '⅞': 0.875,
};

/** "1/2" → 0.5, "1 1/2" → 1.5, "1.5" → 1.5, "" → null. */
export function parseQty(raw: string): number | null {
  const s = raw.trim();
  if (!s) return null;

  if (UNICODE_FRACTIONS[s] !== undefined) return UNICODE_FRACTIONS[s];

  // Mixed number: "1 1/2"
  const mixed = s.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixed) return Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3]);

  const fraction = s.match(/^(\d+)\/(\d+)$/);
  if (fraction) return Number(fraction[1]) / Number(fraction[2]);

  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** Nearest cook-friendly fraction, in eighths. */
function toFraction(value: number): string {
  const whole = Math.floor(value);
  const remainder = value - whole;
  const eighths = Math.round(remainder * 8);

  if (eighths === 0) return String(whole);
  if (eighths === 8) return String(whole + 1);

  const glyphs: Record<number, string> = {
    1: '⅛',
    2: '¼',
    3: '⅜',
    4: '½',
    5: '⅝',
    6: '¾',
    7: '⅞',
  };
  return whole > 0 ? `${whole}${glyphs[eighths]}` : glyphs[eighths];
}

export function formatQty(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '';
  // Large amounts read better rounded than fractioned.
  if (value >= 10) return String(Math.round(value));
  return toFraction(value);
}

/* ------------------------------------------------------------------ *
 * US → metric
 * ------------------------------------------------------------------ */

type Conversion = { unit: string; factor: number; round: number };

const TO_METRIC: Record<string, Conversion> = {
  cup: { unit: 'ml', factor: 240, round: 5 },
  cups: { unit: 'ml', factor: 240, round: 5 },
  tbsp: { unit: 'ml', factor: 15, round: 1 },
  tsp: { unit: 'ml', factor: 5, round: 1 },
  oz: { unit: 'g', factor: 28.35, round: 5 },
  lb: { unit: 'g', factor: 454, round: 5 },
  lbs: { unit: 'g', factor: 454, round: 5 },
};

export type Measure = { qty: string; unit: string };

/**
 * Units that take an -s when the amount exceeds one. Abbreviations (tbsp, tsp,
 * ml, g, oz) are invariant, so they are deliberately absent.
 */
const PLURALISABLE = new Set([
  'cup',
  'clove',
  'can',
  'sprig',
  'fillet',
  'ear',
  'head',
  'handful',
  'slice',
  'bunch',
  'stick',
]);

/** "cup" → "cups" above 1, and back to "cup" at or below it. */
export function pluralise(unit: string, amount: number): string {
  const lower = unit.toLowerCase();
  const singular = lower.endsWith('s') ? lower.slice(0, -1) : lower;
  if (!PLURALISABLE.has(singular)) return unit;
  return amount > 1 ? `${singular}s` : singular;
}

/**
 * Scales a quantity by `factor` and optionally converts to metric.
 * Unparseable quantities ("a handful") pass through untouched.
 */
export function convertMeasure(
  qty: string,
  unit: string,
  factor: number,
  metric: boolean
): Measure {
  const parsed = parseQty(qty);
  if (parsed === null) return { qty, unit };

  const scaled = parsed * factor;
  const conversion = metric ? TO_METRIC[unit.toLowerCase()] : undefined;

  if (!conversion) return { qty: formatQty(scaled), unit: pluralise(unit, scaled) };

  const converted = scaled * conversion.factor;
  const rounded = Math.max(
    conversion.round,
    Math.round(converted / conversion.round) * conversion.round
  );
  return { qty: String(rounded), unit: conversion.unit };
}
