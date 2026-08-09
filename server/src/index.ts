import 'dotenv/config';

import cors from 'cors';
import express from 'express';

import { extractFromIdea, extractFromImage, extractFromText, extractFromUrl, ExtractionError, type ExtractedRecipe } from './extract.js';
import { getCredits, getImageStatus, imagePromptFor, KieError, startImageGeneration } from './kie.js';
import { estimateNutrition, healthifyRecipe, isLlmConfigured, LlmError } from './llm.js';
import { storeImage, storeImageFromDataUrl } from './storage.js';
import { supabaseAdmin } from './supabase-admin.js';

/**
 * Asepo backend. Implements the contract the app expects in src/lib/api/http.ts:
 *   POST /import        -> { taskId }
 *   GET  /import/:id    -> { status, step, label, recipe?, error? }
 *   POST /images        -> { taskId, status }
 *   GET  /images/:id    -> { taskId, status, url?, error? }
 *   POST /healthify      -> { ingredients, instructions, summary } — Pro only, bearer token required
 *   POST /nutrition      -> { calories, protein, carbs, fat } — Pro only, bearer token required
 *   DELETE /account      -> 204, bearer token required
 */

const PORT = Number(process.env.PORT ?? 8787);
/** Public origin used to build image URLs. Must be reachable by the phone. */
const PUBLIC_URL = process.env.PUBLIC_URL?.trim() || `http://localhost:${PORT}`;

const app = express();
app.use(cors());
// Photo imports send a base64-encoded image in the JSON body, well past the
// default 1mb limit — a phone photo easily runs 3-8mb once base64-inflated.
app.use(express.json({ limit: '12mb' }));

/* ------------------------------------------------------------------ *
 * Job store
 *
 * In memory, so jobs are lost on restart. Fine for a single dev server;
 * move to Redis or a database before running more than one instance.
 * ------------------------------------------------------------------ */

type ImportJob = {
  status: 'pending' | 'ready' | 'failed';
  step: number;
  label: string;
  labels: readonly string[];
  recipe?: ExtractedRecipe;
  error?: string;
  createdAt: number;
};

type ImageJob = {
  status: 'pending' | 'ready' | 'failed';
  kieTaskId?: string;
  url?: string;
  error?: string;
  createdAt: number;
};

const importJobs = new Map<string, ImportJob>();
const imageJobs = new Map<string, ImageJob>();

const newId = () => Math.random().toString(36).slice(2, 12);

/** Drops jobs older than an hour so the maps don't grow without bound. */
setInterval(
  () => {
    const cutoff = Date.now() - 60 * 60 * 1000;
    for (const [id, job] of importJobs) if (job.createdAt < cutoff) importJobs.delete(id);
    for (const [id, job] of imageJobs) if (job.createdAt < cutoff) imageJobs.delete(id);
  },
  10 * 60 * 1000
).unref();

/* ------------------------------------------------------------------ *
 * Recipes
 * ------------------------------------------------------------------ */

app.get('/health', async (_req, res) => {
  const configured = Boolean(process.env.KIE_API_KEY?.trim());
  res.json({
    ok: true,
    kieConfigured: configured,
    // Image generation costs credits, so surface the balance rather than
    // discovering it's empty mid-import.
    kieCredits: configured ? await getCredits() : null,
    publicUrl: PUBLIC_URL,
  });
});

// The app seeds its library from here on a fresh install. Returning an empty
// list means the user starts with nothing, which is correct for a real account;
// the app keeps its own local copy after that.
app.get('/recipes', (_req, res) => {
  res.json([]);
});

/* ------------------------------------------------------------------ *
 * Import
 * ------------------------------------------------------------------ */

/**
 * Stage names shown in the app. Worded per source so a website import doesn't
 * claim to be "reading the video".
 */
const PIPELINES = {
  social: ['Fetching the post', 'Reading the caption', 'Finding ingredients', 'Structuring the recipe'],
  web: ['Fetching the page', 'Reading the recipe', 'Finding ingredients', 'Structuring the recipe'],
  text: ['Reading your text', 'Finding ingredients', 'Structuring the recipe', 'Checking the result'],
  image: ['Uploading the photo', 'Reading the photo', 'Finding ingredients', 'Structuring the recipe'],
  idea: ['Looking up the dish', 'Writing ingredients', 'Writing the steps', 'Structuring the recipe'],
} as const;

const SOCIAL_HOSTS = /tiktok|instagram|youtube|youtu\.be|facebook|pinterest/i;

function pipelineFor(source: { kind?: string; url?: string }): readonly string[] {
  if (source.kind === 'text') return PIPELINES.text;
  if (source.kind === 'image') return PIPELINES.image;
  if (source.kind === 'idea') return PIPELINES.idea;
  return source.url && SOCIAL_HOSTS.test(source.url) ? PIPELINES.social : PIPELINES.web;
}

app.post('/import', (req, res) => {
  const source = req.body as { kind?: string; url?: string; text?: string; uri?: string };
  const id = newId();

  const pipeline = pipelineFor(source);
  importJobs.set(id, { status: 'pending', step: 0, label: pipeline[0], labels: pipeline, createdAt: Date.now() });
  // Send every stage name up front so the UI can render the checklist correctly
  // without having to observe each transient step.
  res.json({ taskId: id, labels: pipeline });

  void (async () => {
    const job = importJobs.get(id)!;
    const advance = (step: number) => {
      job.step = step;
      job.label = pipeline[step];
    };

    try {
      advance(0);

      let recipe: ExtractedRecipe;
      if (source.kind === 'url' && source.url) {
        recipe = await extractFromUrl(source.url);
      } else if (source.kind === 'text' && source.text) {
        recipe = await extractFromText(source.text);
      } else if (source.kind === 'image' && source.uri) {
        recipe = await extractFromImage(source.uri);
      } else if (source.kind === 'idea' && source.text) {
        recipe = await extractFromIdea(source.text);
      } else {
        throw new ExtractionError('Send either a link, some recipe text, a photo, or a dish name');
      }

      // The fetch and extraction are the slow part; the rest is near-instant.
      // Still walk every stage in order — the app renders one row per stage and
      // labels a skipped stage with its default, which for a website import
      // wrongly reads "Reading the video".
      for (const step of [1, 2, 3]) {
        advance(step);
        await new Promise((r) => setTimeout(r, 200));
      }

      // Re-host the source image. Social CDNs hand out *signed, expiring* URLs
      // — a TikTok thumbnail carries x-signature and x-expires roughly two days
      // out — so storing the original would leave every imported recipe
      // pictureless within days. Same reason we re-host kie.ai's output.
      if (recipe.imageUrl) {
        try {
          // A photo import's "imageUrl" is the base64 data: URL the phone sent
          // us directly — nothing to fetch, just write the bytes we already have.
          recipe.imageUrl =
            source.kind === 'image'
              ? await storeImageFromDataUrl(recipe.imageUrl)
              : await storeImage(recipe.imageUrl);
        } catch {
          delete recipe.imageUrl;
        }
      }

      job.recipe = recipe;
      job.status = 'ready';
    } catch (e) {
      job.status = 'failed';
      // This message is rendered verbatim on the import-failed screen, so only
      // ExtractionError — the class whose messages are written for users —
      // passes through. Anything else is an internal fault (a bad fetch, a
      // malformed model reply, a plain bug) whose text would mean nothing to a
      // cook, so it stays in the server log and the app gets something honest.
      if (e instanceof ExtractionError) {
        job.error = e.message;
      } else {
        console.error(`[import ${id}] failed —`, e);
        job.error = 'Something went wrong reading that. Try again.';
      }
    }
  })();
});

app.get('/import/:id', (req, res) => {
  const job = importJobs.get(req.params.id);
  if (!job) return res.status(404).json({ status: 'failed', error: 'Unknown task' });

  res.json({
    status: job.status,
    step: job.step,
    label: job.label,
    labels: job.labels,
    ...(job.recipe ? { recipe: job.recipe } : {}),
    ...(job.error ? { error: job.error } : {}),
  });
});

/* ------------------------------------------------------------------ *
 * Images
 * ------------------------------------------------------------------ */

app.post('/images', async (req, res) => {
  const { title, cuisine, ingredients } = req.body as {
    title?: string;
    cuisine?: string;
    ingredients?: string[];
  };

  if (!title) return res.status(400).json({ status: 'failed', error: 'title is required' });

  const id = newId();
  imageJobs.set(id, { status: 'pending', createdAt: Date.now() });

  try {
    const kieTaskId = await startImageGeneration(imagePromptFor({ title, cuisine, ingredients }));
    imageJobs.get(id)!.kieTaskId = kieTaskId;
    res.json({ taskId: id, status: 'pending' });
  } catch (e) {
    // KieError messages are diagnostic — a missing KIE_API_KEY, or kie.ai's own
    // response text passed through verbatim. The app currently swallows image
    // failures, but that's a reason not to rely on it, not a reason to leak.
    console.error(`[images ${id}] failed to start —`, e);
    const error = 'Could not generate a photo for this recipe.';
    imageJobs.set(id, { status: 'failed', error, createdAt: Date.now() });
    res.status(e instanceof KieError ? 400 : 500).json({ taskId: id, status: 'failed', error });
  }
});

app.get('/images/:id', async (req, res) => {
  const job = imageJobs.get(req.params.id);
  if (!job) return res.status(404).json({ status: 'failed', error: 'Unknown task' });

  // Terminal states are cached — no need to ask kie.ai again.
  if (job.status !== 'pending' || !job.kieTaskId) {
    return res.json({ taskId: req.params.id, status: job.status, url: job.url, error: job.error });
  }

  try {
    const status = await getImageStatus(job.kieTaskId);

    if (status.status === 'ready') {
      // Copy to our own storage before kie.ai expires the original.
      job.url = await storeImage(status.urls[0]);
      job.status = 'ready';
    } else if (status.status === 'failed') {
      job.status = 'failed';
      job.error = status.error;
    }
  } catch (e) {
    job.status = 'failed';
    job.error = e instanceof Error ? e.message : String(e);
  }

  res.json({ taskId: req.params.id, status: job.status, url: job.url, error: job.error });
});

/* ------------------------------------------------------------------ *
 * Pro entitlement — used by /healthify and /nutrition below. The client
 * already gates these buttons on isPro, but that flag is trivially
 * self-settable (it's just a synced local preference, same as diet or
 * allergies — there's no real payment system behind it yet). This can't
 * verify a genuine purchase either, since none exists, but it closes the
 * bigger hole: without it, *anyone*, including a fully anonymous caller
 * with no account at all, could hit these LLM-backed endpoints for free.
 * Requiring a real session and checking profiles.is_pro at least means it
 * costs an account, not zero.
 * ------------------------------------------------------------------ */

async function requirePro(req: express.Request): Promise<{ status: number; error: string } | null> {
  const authHeader = req.header('authorization') ?? '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return { status: 401, error: 'Sign in required' };

  const admin = supabaseAdmin();
  const { data: userData, error: authError } = await admin.auth.getUser(token);
  if (authError || !userData.user) return { status: 401, error: 'Invalid or expired session' };

  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('is_pro')
    .eq('id', userData.user.id)
    .single<{ is_pro: boolean }>();
  if (profileError || !profile?.is_pro) return { status: 403, error: 'Asepo Pro required' };

  return null;
}

/* ------------------------------------------------------------------ *
 * Healthify — Pro-only.
 * ------------------------------------------------------------------ */

app.post('/healthify', async (req, res) => {
  const entitlementError = await requirePro(req);
  if (entitlementError) return res.status(entitlementError.status).json({ error: entitlementError.error });

  const { title, ingredients, instructions, servings } = req.body as {
    title?: string;
    ingredients?: { qty: string; unit: string; name: string }[];
    instructions?: string[];
    servings?: number;
  };

  if (!title || !ingredients?.length || !instructions?.length) {
    return res.status(400).json({ error: 'title, ingredients and instructions are required' });
  }
  if (!isLlmConfigured()) {
    // The env-var names are for whoever runs the server, not the caller.
    console.error('[server] LLM not configured — set LLM_API_KEY or KIE_API_KEY');
    return res.status(503).json({ error: 'This is unavailable right now. Try again shortly.' });
  }

  try {
    const result = await healthifyRecipe({ title, ingredients, instructions, servings });
    res.json(result);
  } catch (e) {
    // Only deliberately user-safe model errors carry text worth showing.
    const safe = e instanceof LlmError && e.userSafe;
    if (!safe) console.error('[healthify] failed —', e);
    res.status(e instanceof LlmError ? 422 : 500).json({
      error: safe ? (e as LlmError).message : 'Could not rework that recipe',
    });
  }
});

/* ------------------------------------------------------------------ *
 * Nutrition — Pro-only, same reasoning as /healthify above.
 * ------------------------------------------------------------------ */

app.post('/nutrition', async (req, res) => {
  const entitlementError = await requirePro(req);
  if (entitlementError) return res.status(entitlementError.status).json({ error: entitlementError.error });

  const { title, ingredients, servings } = req.body as {
    title?: string;
    ingredients?: { qty: string; unit: string; name: string }[];
    servings?: number;
  };

  if (!title || !ingredients?.length || !servings) {
    return res.status(400).json({ error: 'title, ingredients and servings are required' });
  }
  if (!isLlmConfigured()) {
    // The env-var names are for whoever runs the server, not the caller.
    console.error('[server] LLM not configured — set LLM_API_KEY or KIE_API_KEY');
    return res.status(503).json({ error: 'This is unavailable right now. Try again shortly.' });
  }

  try {
    const result = await estimateNutrition({ title, ingredients, servings });
    res.json(result);
  } catch (e) {
    const safe = e instanceof LlmError && e.userSafe;
    if (!safe) console.error('[nutrition] failed —', e);
    res.status(e instanceof LlmError ? 422 : 500).json({
      error: safe ? (e as LlmError).message : 'Could not estimate nutrition for that recipe',
    });
  }
});

/* ------------------------------------------------------------------ *
 * Account deletion — the one operation the app's anon key can never do
 * itself (Supabase has no client-side "delete my own account" call; it's
 * an admin-only API). Trust boundary: the caller must present the access
 * token of the session they're asking to delete — verified server-side via
 * the admin client below — so this can only ever delete the account making
 * the request, never an arbitrary user id someone might pass in.
 * ------------------------------------------------------------------ */

app.delete('/account', async (req, res) => {
  const authHeader = req.header('authorization') ?? '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing bearer token' });

  const admin = supabaseAdmin();
  const { data, error: authError } = await admin.auth.getUser(token);
  if (authError || !data.user) return res.status(401).json({ error: 'Invalid or expired session' });

  const { error } = await admin.auth.admin.deleteUser(data.user.id);
  if (error) return res.status(500).json({ error: error.message });

  res.status(204).end();
});

app.listen(PORT, () => {
  console.log(`Asepo server on http://localhost:${PORT}`);
  console.log(`Public URL for images: ${PUBLIC_URL}`);
  if (!process.env.KIE_API_KEY?.trim()) {
    console.log('KIE_API_KEY not set — /import works, /images will return an error.');
  }
});
