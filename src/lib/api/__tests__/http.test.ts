import { ApiError, createHttpApi } from '@/lib/api/http';

/**
 * Every screen that catches an API failure renders `e.message` directly, so
 * these assert the boundary that keeps developer-facing text off the screen:
 * a raw "TypeError: Failed to fetch" or a bare status line must never survive
 * as the user-visible message, and the technical cause must survive as detail.
 */
const api = createHttpApi('http://test.local');

function respondWith(body: unknown, init: ResponseInit = {}) {
  global.fetch = jest.fn().mockResolvedValue(
    new Response(typeof body === 'string' ? body : JSON.stringify(body), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      ...init,
    })
  ) as unknown as typeof fetch;
}

function failWith(cause: Error) {
  global.fetch = jest.fn().mockRejectedValue(cause) as unknown as typeof fetch;
}

/** The message a user would actually see for a given failure. */
async function messageFor(call: () => Promise<unknown>) {
  try {
    await call();
  } catch (e) {
    return e as ApiError;
  }
  throw new Error('expected the call to reject, but it resolved');
}

/** ApiError console.warns its detail under __DEV__, which jest-expo sets. */
let warn: jest.SpyInstance;
beforeEach(() => {
  warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

describe('network failures', () => {
  it('never surfaces the raw fetch exception to the user', async () => {
    failWith(new TypeError('Failed to fetch'));
    const error = await messageFor(() => api.listRecipes());

    expect(error.message).toBe(
      "Asepo couldn't reach the internet. Check your connection and try again."
    );
    // The thing a user reads must not name a JS constructor.
    expect(error.message).not.toMatch(/TypeError|fetch|undefined/i);
  });

  it('keeps the technical cause on detail for the dev console', async () => {
    failWith(new TypeError('Failed to fetch'));
    const error = await messageFor(() => api.listRecipes());

    expect(error.detail).toContain('TypeError: Failed to fetch');
    expect(error.detail).toContain('/recipes');
    // Detail reaches the dev console, and only the dev console.
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('TypeError: Failed to fetch'));
  });
});

describe('status mapping', () => {
  // requirePro() on the server returns 401 for a missing/expired session and
  // 403 for a real session without Pro.
  it.each([
    [401, 'Sign in to use this.'],
    [403, 'This is an Asepo Pro feature.'],
    [429, 'Asepo is busy right now. Wait a moment and try again.'],
    [408, 'That took too long to load. Try again.'],
    [504, 'That took too long to load. Try again.'],
    [500, 'Something went wrong on our end. Try again in a moment.'],
    [503, 'Something went wrong on our end. Try again in a moment.'],
  ])('maps %i to plain language', async (status, expected) => {
    respondWith({}, { status });
    const error = await messageFor(() => api.listRecipes());

    expect(error.message).toBe(expected);
    expect(error.status).toBe(status);
  });

  it('keeps import-specific wording for a leftover 4xx on /import', async () => {
    respondWith({}, { status: 422 });
    const error = await messageFor(() => api.extractRecipe({ kind: 'text', text: 'x' }));

    expect(error.message).toBe(
      "The link might be private, deleted, or in a format we don't support yet"
    );
  });

  it('does not describe a non-import 4xx as a failed import', async () => {
    respondWith({}, { status: 422 });
    const error = await messageFor(() => api.listRecipes());

    expect(error.message).toBe("Asepo couldn't finish that. Try again.");
    expect(error.message).not.toMatch(/link|private|deleted/i);
  });
});

describe('malformed responses', () => {
  it('does not leak a SyntaxError when a 200 is not JSON', async () => {
    // A captive portal or proxy error page: HTTP 200, HTML body.
    respondWith('<html>Not JSON</html>');
    const error = await messageFor(() => api.listRecipes());

    expect(error).toBeInstanceOf(ApiError);
    expect(error.message).toBe('Something went wrong on our end. Try again in a moment.');
    expect(error.message).not.toMatch(/SyntaxError|JSON|token/i);
  });
});

describe('extractRecipe', () => {
  it('surfaces the backend error when a job reports failure', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ taskId: 't1' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ status: 'failed', error: 'Found steps but no ingredients' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      ) as unknown as typeof fetch;

    const error = await messageFor(() => api.extractRecipe({ kind: 'text', text: 'x' }));
    expect(error.message).toBe('Found steps but no ingredients');
  });

  it('returns the recipe once the job is ready', async () => {
    const recipe = { title: 'Cheese omelette', ingredients: [], instructions: ['Fold'] };
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ taskId: 't1' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ status: 'ready', recipe }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      ) as unknown as typeof fetch;

    await expect(api.extractRecipe({ kind: 'text', text: 'x' })).resolves.toEqual(recipe);
  });
});
