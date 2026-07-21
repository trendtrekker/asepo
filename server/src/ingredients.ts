/**
 * Turns the free-text ingredient lines recipe sites publish
 * ("2 cups all-purpose flour, sifted") into the structured shape the app uses.
 */

export type Ingredient = { qty: string; unit: string; name: string };

/** Units we recognise. Order matters: longer forms first so "tbsp" beats "tb". */
const UNITS = [
  'tablespoons', 'tablespoon', 'tbsps', 'tbsp', 'tbs',
  'teaspoons', 'teaspoon', 'tsps', 'tsp',
  'cups', 'cup',
  'ounces', 'ounce', 'oz',
  'pounds', 'pound', 'lbs', 'lb',
  'grams', 'gram', 'g',
  'kilograms', 'kilogram', 'kg',
  'millilitres', 'milliliters', 'ml',
  'litres', 'liters', 'l',
  'cloves', 'clove',
  'cans', 'can',
  'sprigs', 'sprig',
  'slices', 'slice',
  'sticks', 'stick',
  'bunches', 'bunch',
  'heads', 'head',
  'fillets', 'fillet',
  'ears', 'ear',
  'handfuls', 'handful',
  'pinches', 'pinch',
  'packages', 'package', 'pkg',
];

const VULGAR: Record<string, string> = {
  '½': '1/2', '⅓': '1/3', '⅔': '2/3', '¼': '1/4', '¾': '3/4',
  '⅕': '1/5', '⅛': '1/8', '⅜': '3/8', '⅝': '5/8', '⅞': '7/8',
};

function normalise(line: string): string {
  let out = line.trim();
  for (const [glyph, ascii] of Object.entries(VULGAR)) {
    out = out.split(glyph).join(` ${ascii}`);
  }
  // Collapse whitespace and strip leading list markers.
  return out.replace(/^[-•*•]\s*/, '').replace(/\s+/g, ' ').trim();
}

export function parseIngredient(raw: string): Ingredient {
  const line = normalise(raw);
  if (!line) return { qty: '', unit: '', name: '' };

  // Leading quantity: "2", "1/2", "1 1/2", "1.5", or a range "2-3" (take the first).
  const qtyMatch = line.match(/^((?:\d+\s+\d+\/\d+)|(?:\d+\/\d+)|(?:\d+(?:\.\d+)?))(?:\s*[-–]\s*\d+(?:\.\d+)?)?/);
  let rest = line;
  let qty = '';

  if (qtyMatch) {
    qty = qtyMatch[1].trim();
    rest = line.slice(qtyMatch[0].length).trim();
  }

  // Unit immediately after the quantity.
  let unit = '';
  const lowerRest = rest.toLowerCase();
  for (const candidate of UNITS) {
    if (lowerRest === candidate || lowerRest.startsWith(`${candidate} `) || lowerRest.startsWith(`${candidate}. `)) {
      unit = candidate;
      rest = rest.slice(candidate.length).replace(/^\.\s*/, '').trim();
      break;
    }
  }

  return { qty, unit, name: rest || line };
}

/** "PT1H30M" → 90. Returns undefined for anything unparseable. */
export function parseIsoDuration(value: unknown): number | undefined {
  if (typeof value !== 'string') return undefined;
  const m = value.match(/^P(?:\d+D)?T?(?:(\d+)H)?(?:(\d+)M)?/);
  if (!m) return undefined;
  const hours = Number(m[1] ?? 0);
  const minutes = Number(m[2] ?? 0);
  const total = hours * 60 + minutes;
  return total > 0 ? total : undefined;
}

/** Yield can be "4", "4 servings", or ["4", "4 servings"]. */
export function parseYield(value: unknown): number | undefined {
  const first = Array.isArray(value) ? value[0] : value;
  if (typeof first === 'number') return first;
  if (typeof first !== 'string') return undefined;
  const m = first.match(/\d+/);
  return m ? Number(m[0]) : undefined;
}
