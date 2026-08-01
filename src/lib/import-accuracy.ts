import type { ExtractStrategy } from '@/lib/api/types';

/**
 * What the review screen says about how trustworthy an import is.
 *
 * This used to key off a single confidence number, which can't tell apart two
 * genuinely different situations. A model misreading a caption deserves "check
 * the quantities". A recipe the model *wrote* from a dish name has no source
 * to have misread — nothing was guessed at, it was authored — so the same
 * warning was a category error, and the loudest one in the app appeared on a
 * perfectly good result.
 *
 * The backend already reports which strategy produced the recipe, so the
 * message follows that instead. Confidence stays as the fallback for a recipe
 * imported before the field existed.
 */

export type ImportAccuracy = { tone: 'info' | 'warn'; message: string } | null;

const BY_STRATEGY: Record<ExtractStrategy, ImportAccuracy> = {
  // Published by the site itself in schema.org markup — exact, so saying
  // anything at all is noise.
  'json-ld': null,

  // Read from real text a person wrote. Faithful in shape, but a model can
  // still misread a quantity.
  llm: { tone: 'info', message: 'Double-check the amounts — we read these from the original.' },

  // Transcribed from a photo of a written recipe. Same deal, plus OCR risk.
  vision: { tone: 'info', message: 'Double-check the amounts — we read these off the photo.' },

  // No AI involved; pattern-matched a caption. The most error-prone path that
  // still counts as reading something real.
  heuristic: {
    tone: 'warn',
    message: 'We pulled this out automatically and may have missed something. Check it before saving.',
  },

  // The source listed ingredients but no method, so the steps are the model's
  // idea of how this dish is normally made — not what the author wrote.
  'llm-inferred': {
    tone: 'warn',
    message: 'The original had no method, so we wrote typical steps for it. Check they match what you expected.',
  },

  // A photo of a finished dish, not a recipe. The model recognised it and
  // wrote a standard version.
  'vision-inferred': {
    tone: 'warn',
    message: 'We recognised the dish and wrote a typical recipe for it — the photo had no recipe on it.',
  },

  // Nothing was read at all: the user typed a dish name and the model wrote
  // the recipe. It's a starting point, not a transcription.
  'llm-idea': {
    tone: 'warn',
    message: 'Written from the dish name, not copied from a source — treat it as a starting point and adjust to taste.',
  },
};

/** Older imports predate `strategy`; fall back to the confidence buckets. */
function fromConfidence(confidence: number): ImportAccuracy {
  if (confidence >= 1) return null;
  if (confidence >= 0.85) {
    return { tone: 'info', message: 'Double-check the amounts — we read these from the original.' };
  }
  return {
    tone: 'warn',
    message: 'We pulled this out automatically and may have missed something. Check it before saving.',
  };
}

export function importAccuracy(source: {
  strategy?: ExtractStrategy;
  confidence?: number;
}): ImportAccuracy {
  if (source.strategy && source.strategy in BY_STRATEGY) return BY_STRATEGY[source.strategy];
  return fromConfidence(source.confidence ?? 0);
}
