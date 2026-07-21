import type { Ingredient } from '@/data/sample';
import { formatQty, parseQty, pluralise } from '@/lib/quantity';

/**
 * Grocery list maths: which aisle an ingredient belongs to, and how to merge
 * the same ingredient arriving from several recipes into one line.
 */

export const AISLES = [
  'Produce',
  'Meat & Seafood',
  'Dairy',
  'Bakery',
  'Frozen',
  'Pantry',
  'Other',
] as const;

export type Aisle = (typeof AISLES)[number];

/** First keyword hit wins, so order within each list matters little. */
const AISLE_KEYWORDS: Record<Exclude<Aisle, 'Other'>, string[]> = {
  Produce: [
    'onion', 'garlic', 'tomato', 'lemon', 'lime', 'cucumber', 'carrot', 'potato',
    'spinach', 'kale', 'basil', 'cilantro', 'parsley', 'thyme', 'corn', 'avocado',
    'pepper', 'mushroom', 'banana', 'blueberr', 'lettuce', 'cauliflower', 'ginger',
    'spring onion', 'tomatillo', 'jalape', 'sprout', 'herb',
  ],
  'Meat & Seafood': [
    'salmon', 'chicken', 'beef', 'steak', 'shrimp', 'pork', 'bacon', 'fish',
    'thigh', 'mince', 'sausage',
  ],
  Dairy: [
    'butter', 'milk', 'cream', 'cheese', 'parmesan', 'feta', 'ricotta', 'yoghurt',
    'yogurt', 'halloumi', 'pecorino', 'egg',
  ],
  Bakery: ['bread', 'tortilla', 'bun', 'pita', 'baguette'],
  Frozen: ['frozen', 'ice cream', 'peas'],
  Pantry: [
    'flour', 'sugar', 'rice', 'pasta', 'orzo', 'noodle', 'soba', 'oats', 'lentil',
    'chickpea', 'bean', 'oil', 'vinegar', 'soy sauce', 'miso', 'mirin', 'stock',
    'paste', 'chocolate', 'cocoa', 'baking', 'salt', 'spice', 'paprika', 'cumin',
    'coriander', 'oregano', 'tahini', 'peanut', 'walnut', 'almond', 'sesame',
    'honey', 'syrup', 'chia', 'coconut', 'curry', 'harissa', 'tamarind',
    'fish sauce', 'wine', 'porcini', 'chilli', 'chili',
  ],
};

export function categorize(name: string): Aisle {
  const n = name.toLowerCase();
  for (const aisle of Object.keys(AISLE_KEYWORDS) as Exclude<Aisle, 'Other'>[]) {
    if (AISLE_KEYWORDS[aisle].some((kw) => n.includes(kw))) return aisle;
  }
  return 'Other';
}

/** "unsalted butter, softened" → "unsalted butter" */
export function normalizeName(name: string): string {
  return name.split(',')[0].trim().toLowerCase();
}

export type GroceryItem = {
  id: string;
  name: string;
  qty: string;
  unit: string;
  aisle: Aisle;
  checked: boolean;
  /** Titles of the recipes that contributed to this line. */
  sources: string[];
};

/* ------------------------------------------------------------------ *
 * Unit merging
 * ------------------------------------------------------------------ */

/** Volume units expressed in teaspoons, so they can be summed together. */
const VOLUME_IN_TSP: Record<string, number> = { tsp: 1, tbsp: 3, cup: 48, cups: 48 };
/** Weight units expressed in grams. */
const WEIGHT_IN_G: Record<string, number> = { oz: 28.35, lb: 454, lbs: 454, g: 1 };

function familyOf(unit: string): 'volume' | 'weight' | null {
  const u = unit.toLowerCase();
  if (VOLUME_IN_TSP[u]) return 'volume';
  if (WEIGHT_IN_G[u]) return 'weight';
  return null;
}

/** Renders a teaspoon total back in the largest unit that stays readable. */
function fromTsp(total: number): { qty: string; unit: string } {
  if (total >= 48) return { qty: formatQty(total / 48), unit: total / 48 > 1 ? 'cups' : 'cup' };
  if (total >= 3) return { qty: formatQty(total / 3), unit: 'tbsp' };
  return { qty: formatQty(total), unit: 'tsp' };
}

function fromGrams(total: number): { qty: string; unit: string } {
  if (total >= 454) return { qty: formatQty(total / 454), unit: 'lbs' };
  if (total >= 28.35) return { qty: formatQty(total / 28.35), unit: 'oz' };
  return { qty: String(Math.round(total)), unit: 'g' };
}

/**
 * Adds one ingredient to the list, combining it with an existing line where
 * possible: 2 tbsp butter + ¼ cup butter becomes 6 tbsp butter. Amounts that
 * can't be parsed or converted stay as separate lines rather than being
 * silently mangled.
 */
export function addIngredient(
  list: GroceryItem[],
  ingredient: Ingredient,
  factor: number,
  sourceTitle: string
): GroceryItem[] {
  const key = normalizeName(ingredient.name);
  const incomingQty = parseQty(ingredient.qty);
  const scaled = incomingQty === null ? null : incomingQty * factor;

  const existing = list.find((item) => normalizeName(item.name) === key && !item.checked);

  if (existing && scaled !== null) {
    const existingQty = parseQty(existing.qty);
    const famA = familyOf(existing.unit);
    const famB = familyOf(ingredient.unit);

    if (existingQty !== null) {
      // Identical units — straight addition.
      if (existing.unit.toLowerCase() === ingredient.unit.toLowerCase()) {
        return list.map((item) =>
          item === existing
            ? {
                ...item,
                qty: formatQty(existingQty + scaled),
                unit: pluralise(item.unit, existingQty + scaled),
                sources: item.sources.includes(sourceTitle)
                  ? item.sources
                  : [...item.sources, sourceTitle],
              }
            : item
        );
      }

      // Convertible units within the same family.
      if (famA && famA === famB) {
        const table = famA === 'volume' ? VOLUME_IN_TSP : WEIGHT_IN_G;
        const total =
          existingQty * table[existing.unit.toLowerCase()] +
          scaled * table[ingredient.unit.toLowerCase()];
        const merged = famA === 'volume' ? fromTsp(total) : fromGrams(total);
        return list.map((item) =>
          item === existing
            ? {
                ...item,
                ...merged,
                sources: item.sources.includes(sourceTitle)
                  ? item.sources
                  : [...item.sources, sourceTitle],
              }
            : item
        );
      }
    }
  }

  return [
    ...list,
    {
      id: `${key}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: ingredient.name,
      qty: scaled === null ? ingredient.qty : formatQty(scaled),
      unit: scaled === null ? ingredient.unit : pluralise(ingredient.unit, scaled),
      aisle: categorize(ingredient.name),
      checked: false,
      sources: [sourceTitle],
    },
  ];
}

/** Groups a list into aisle sections, preserving AISLES order and dropping empties. */
export function groupByAisle(items: GroceryItem[]) {
  return AISLES.map((aisle) => ({
    aisle,
    items: items.filter((i) => i.aisle === aisle),
  })).filter((section) => section.items.length > 0);
}
