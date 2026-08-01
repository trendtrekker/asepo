import type { ExtractStrategy } from '@/lib/api/types';
import { importAccuracy } from '@/lib/import-accuracy';

/**
 * The banner used to key off a confidence number, so a dish-name import —
 * where the model authored the recipe rather than reading one — got
 * "We had to guess at some of this", the loudest warning in the app, on a
 * perfectly good result. These pin that each path says something true about
 * what actually happened.
 */

describe('a recipe the model wrote rather than read', () => {
  it('does not accuse itself of guessing at a source it never had', () => {
    const accuracy = importAccuracy({ strategy: 'llm-idea', confidence: 0.5 });

    expect(accuracy?.message).not.toMatch(/guess/i);
    // Nothing was extracted, read, or pulled out — there was no source.
    expect(accuracy?.message).not.toMatch(/read these|pulled this out|missed something/i);
  });

  it('says where the recipe actually came from', () => {
    const accuracy = importAccuracy({ strategy: 'llm-idea', confidence: 0.5 });

    expect(accuracy?.message).toMatch(/dish name/i);
    expect(accuracy?.message).toMatch(/starting point/i);
  });
});

describe('strategy wins over confidence', () => {
  it('stays silent for site-authored markup even though confidence is absent', () => {
    expect(importAccuracy({ strategy: 'json-ld' })).toBeNull();
  });

  it('ignores a low confidence when the strategy explains the result', () => {
    // 0.5 alone would have produced the generic warning.
    const accuracy = importAccuracy({ strategy: 'llm-idea', confidence: 0.5 });
    const byNumberAlone = importAccuracy({ confidence: 0.5 });

    expect(accuracy?.message).not.toBe(byNumberAlone?.message);
  });
});

describe('every strategy is accounted for', () => {
  const strategies: ExtractStrategy[] = [
    'json-ld',
    'llm',
    'llm-inferred',
    'llm-idea',
    'heuristic',
    'vision',
    'vision-inferred',
  ];

  it.each(strategies)('%s produces a defined result', (strategy) => {
    const accuracy = importAccuracy({ strategy });
    // null is a valid answer (json-ld); undefined would mean an unmapped case.
    expect(accuracy).not.toBeUndefined();
    if (accuracy) {
      expect(accuracy.message.length).toBeGreaterThan(0);
      expect(['info', 'warn']).toContain(accuracy.tone);
    }
  });

  it('flags the paths where the model supplied content as warn, not info', () => {
    for (const strategy of ['llm-idea', 'llm-inferred', 'vision-inferred'] as ExtractStrategy[]) {
      expect(importAccuracy({ strategy })?.tone).toBe('warn');
    }
  });

  it('treats a faithfully read source as info', () => {
    expect(importAccuracy({ strategy: 'llm' })?.tone).toBe('info');
    expect(importAccuracy({ strategy: 'vision' })?.tone).toBe('info');
  });
});

describe('imports made before strategy existed', () => {
  it('still falls back to the confidence buckets', () => {
    expect(importAccuracy({ confidence: 1 })).toBeNull();
    expect(importAccuracy({ confidence: 0.9 })?.tone).toBe('info');
    expect(importAccuracy({ confidence: 0.4 })?.tone).toBe('warn');
  });

  it('warns when there is nothing to go on at all', () => {
    expect(importAccuracy({})?.tone).toBe('warn');
  });
});
