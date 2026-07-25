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

/**
 * Anything that introduces a list of ingredients. Captions routinely label
 * sub-recipes ("Sauce:", "For the topping") rather than saying "Ingredients".
 */
const INGREDIENT_HEADING =
  /^\s*(?:#+\s*)?(ingredients?|you(?:'ll)? need|shopping list|what you need|recipe|sauce|topping|filling|marinade|dressing|for the [a-z ]{2,20})\b\s*:?\s*$/i;
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

/**
 * A caption's first sentence is its title; the rest is the recipe. Without this
 * the whole caption ends up in the title field.
 */
function shortTitle(raw: string): string {
  const first = raw.split(/(?<=[.!?])\s|\n/)[0].trim();
  const candidate = first.length >= 8 ? first : raw.trim();
  return candidate.length > 80 ? `${candidate.slice(0, 77).trimEnd()}…` : candidate;
}

/** A line that starts with a quantity is almost certainly an ingredient. */
function looksLikeIngredient(line: string): boolean {
  return /^\s*(?:[-–—•*·▢□]\s*)?(?:\d+[\d/.\s]*|½|⅓|⅔|¼|¾|⅛)\s*\S/.test(line);
}

/**
 * Section headings used to break up a single-line caption.
 *
 * "Ingredients"/"Method" are unambiguous, so they stand alone. Words like
 * "sauce" and "filling" are ordinary nouns too, so they only count as a heading
 * when followed by a colon — otherwise "coat in sauce." gets torn in half.
 */
const HEADING_WORDS = new RegExp(
  [
    String.raw`\b(?:ingredients?|method|instructions?|directions?|steps?|you(?:'ll)? need)\b\s*:?`,
    String.raw`\b(?:recipe|sauce|topping|filling|marinade|dressing|glaze|batter)\s*:`,
    String.raw`\bfor the [a-z ]{2,20}:`,
  ].join('|'),
  'gi'
);

/**
 * Boundary between two ingredients in an unpunctuated run.
 *
 * Splits only where a *word* ends and a number begins, which is what keeps
 * ranges and mixed fractions intact: in "4–5 cloves" and "1½ tsp" the digit is
 * preceded by a digit, not a letter, so no split happens inside them.
 */
const QUANTITY_START = /(?<=[A-Za-z)\]&%])\s+(?=(?:\d|½|¼|¾|⅓|⅔|⅛))/g;

/**
 * TikTok's oEmbed returns the caption with newlines stripped, so a complete
 * recipe arrives as a single line. Rebuild the structure: break before section
 * headings, then split ingredient runs at each quantity and method runs at
 * sentence ends.
 */
function explodeInlineCaption(caption: string): string[] {
  // 1. Put every heading on its own line.
  const withHeadings = caption.replace(HEADING_WORDS, (m) => `\n${m.trim()}\n`);

  const out: string[] = [];
  let mode: 'ingredients' | 'method' = 'ingredients';

  for (const segment of withHeadings.split('\n').map((s) => s.trim()).filter(Boolean)) {
    if (INGREDIENT_HEADING.test(segment)) {
      out.push(segment);
      mode = 'ingredients';
      continue;
    }
    if (METHOD_HEADING.test(segment)) {
      out.push(segment);
      mode = 'method';
      continue;
    }

    if (mode === 'method') {
      // Sentences are the natural step boundary in prose method text.
      out.push(...segment.split(/(?<=[.!?])\s+(?=[A-Z(])/).map((s) => s.trim()).filter(Boolean));
    } else {
      out.push(...segment.split(QUANTITY_START).map((s) => s.trim()).filter(Boolean));
    }
  }

  return out;
}

export function parseCaption(caption: string, fallbackTitle?: string): HeuristicRecipe | null {
  let rawLines = caption.split(/\r?\n/).map(cleanLine).filter(Boolean);

  // A caption delivered as one or two long lines needs structure rebuilding
  // before any of the line-based logic below can work.
  if (rawLines.length < 3 && caption.length > 120) {
    rawLines = explodeInlineCaption(cleanLine(caption)).map(cleanLine).filter(Boolean);
  }

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
  // Unlike the LLM, this parser can't invent a method for a dish it
  // recognizes — it can only find text that's actually there. No step
  // lines means nothing usable came out of this pass.
  if (instructions.length === 0) return null;

  const title = shortTitle(
    fallbackTitle ||
      rawLines.find((l) => l.length > 4 && !looksLikeIngredient(l)) ||
      'Imported recipe'
  );

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
