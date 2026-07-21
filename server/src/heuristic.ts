import { parseIngredient, type Ingredient } from './ingredients.js';

/**
 * Caption parsing without a model.
 *
 * Recipe captions on TikTok and Instagram are overwhelmingly formatted the same
 * way: an "INGREDIENTS" heading, a list, then "METHOD"/"INSTRUCTIONS" and
 * numbered steps. That structure is worth exploiting before reaching for an LLM
 * — it's free, instant, and deterministic.
 *
 * It gives up rather than guessing when the shape isn't there, so the caller can
 * fall through to the LLM.
 */

export type HeuristicRecipe = {
  title: string;
  ingredients: Ingredient[];
  instructions: string[];
  /** Rough confidence, surfaced in the app's "double-check this" banner. */
  confidence: number;
};

const INGREDIENT_HEADING = /^\s*(?:#+\s*)?(ingredients?|you(?:'ll)? need|shopping list|what you need)\b\s*:?\s*$/i;
const METHOD_HEADING = /^\s*(?:#+\s*)?(method|instructions?|directions?|steps?|how to(?: make)?)\b\s*:?\s*$/i;

/** Leading bullet, dash, or "1." / "1)" numbering. */
const LIST_MARKER = /^\s*(?:[-–—•*·▢□]|\d+[.)])\s+/;

const HASHTAG_RUN = /(?:^|\s)#[\w]+/g;

function cleanLine(line: string): string {
  return line
    .replace(HASHTAG_RUN, ' ')
    // Strip emoji and pictographs, which captions are full of.
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{2B00}-\u{2BFF}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** A line that starts with a quantity is almost certainly an ingredient. */
function looksLikeIngredient(line: string): boolean {
  return /^\s*(?:[-–—•*·▢□]\s*)?(?:\d+[\d/.\s]*|½|⅓|⅔|¼|¾|⅛)\s*\S/.test(line);
}

export function parseCaption(caption: string, fallbackTitle?: string): HeuristicRecipe | null {
  const rawLines = caption
    .split(/\r?\n/)
    .map(cleanLine)
    .filter(Boolean);

  if (rawLines.length < 3) return null;

  let mode: 'none' | 'ingredients' | 'method' = 'none';
  const ingredientLines: string[] = [];
  const stepLines: string[] = [];
  let sawHeading = false;

  for (const line of rawLines) {
    if (INGREDIENT_HEADING.test(line)) {
      mode = 'ingredients';
      sawHeading = true;
      continue;
    }
    if (METHOD_HEADING.test(line)) {
      mode = 'method';
      sawHeading = true;
      continue;
    }

    if (mode === 'ingredients') ingredientLines.push(line);
    else if (mode === 'method') stepLines.push(line);
    // Before any heading, collect quantity-led lines — many captions skip the
    // "Ingredients" label entirely and just start listing.
    else if (looksLikeIngredient(line)) ingredientLines.push(line);
  }

  // Without headings, treat prose sentences after the ingredient run as steps.
  if (!sawHeading && ingredientLines.length >= 3) {
    const lastIngredientIndex = rawLines.lastIndexOf(ingredientLines[ingredientLines.length - 1]);
    for (const line of rawLines.slice(lastIngredientIndex + 1)) {
      if (line.length > 25) stepLines.push(line);
    }
  }

  const ingredients = ingredientLines
    .map((l) => l.replace(LIST_MARKER, '').trim())
    .filter((l) => l.length > 1 && l.length < 120)
    .map(parseIngredient)
    .filter((i) => i.name);

  const instructions = stepLines
    .map((l) => l.replace(LIST_MARKER, '').trim())
    .filter((l) => l.length > 10);

  // Too little structure to be trustworthy — let the LLM try instead.
  if (ingredients.length < 2) return null;

  const title =
    fallbackTitle?.trim() ||
    rawLines.find((l) => l.length > 4 && l.length < 80 && !looksLikeIngredient(l)) ||
    'Imported recipe';

  // Headings and real steps both raise confidence; a bare list is weaker.
  let confidence = 0.4;
  if (sawHeading) confidence += 0.25;
  if (instructions.length >= 2) confidence += 0.2;
  if (ingredients.length >= 4) confidence += 0.1;

  return {
    title: title.slice(0, 120),
    ingredients,
    instructions,
    confidence: Math.min(0.95, confidence),
  };
}
