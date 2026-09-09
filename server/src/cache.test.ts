import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { normalizeCacheInput, recipeCacheKey } from './cache.js';

describe('recipe cache keys', () => {
  it('matches meal names despite case and extra spacing', () => {
    assert.equal(recipeCacheKey('idea', ' Chicken   Alfredo '), recipeCacheKey('idea', 'chicken alfredo'));
  });

  it('removes fragments and marketing parameters from public URLs', () => {
    assert.equal(
      normalizeCacheInput('url', 'https://Example.com/recipe/?utm_source=test&b=2&a=1#method'),
      'https://example.com/recipe?a=1&b=2'
    );
  });

  it('separates different cache purposes', () => {
    assert.notEqual(recipeCacheKey('idea', 'quick chicken'), recipeCacheKey('suggestion', 'quick chicken'));
  });
});
