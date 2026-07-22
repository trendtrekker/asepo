import 'dotenv/config';

import cors from 'cors';
import express from 'express';

import { extractFromText, extractFromUrl, ExtractionError, type ExtractedRecipe } from './extract.js';
import { getCredits, getImageStatus, imagePromptFor, KieError, startImageGeneration } from './kie.js';
import { storeImage, uploadDir } from './storage.js';

/**
 * Asepo backend. Implements the contract the app expects in src/lib/api/http.ts:
 *   POST /import        -> { taskId }
 *   GET  /import/:id    -> { status, step, label, recipe?, error? }
 *   POST /images        -> { taskId, status }
 *   GET  /images/:id    -> { taskId, status, url?, error? }
 */

const PORT = Number(process.env.PORT ?? 8787);
/** Public origin used to build image URLs. Must be reachable by the phone. */
const PUBLIC_URL = process.env.PUBLIC_URL?.trim() || `http://localhost:${PORT}`;

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use('/uploads', express.static(uploadDir, { maxAge: '30d', immutable: true }));

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

const PIPELINE = ['Fetching the page', 'Reading the video', 'Finding ingredients', 'Structuring the recipe'];

app.post('/import', (req, res) => {
  const source = req.body as { kind?: string; url?: string; text?: string };
  const id = newId();

  importJobs.set(id, { status: 'pending', step: 0, label: PIPELINE[0], createdAt: Date.now() });
  res.json({ taskId: id });

  void (async () => {
    const job = importJobs.get(id)!;
    const advance = (step: number) => {
      job.step = step;
      job.label = PIPELINE[step];
    };

    try {
      advance(0);

      let recipe: ExtractedRecipe;
      if (source.kind === 'url' && source.url) {
        recipe = await extractFromUrl(source.url);
      } else if (source.kind === 'text' && source.text) {
        recipe = await extractFromText(source.text);
      } else {
        throw new ExtractionError('Send either a link or some recipe text');
      }

      // The fetch is the slow part; the remaining steps are near-instant, but
      // the app shows them, so surface them in order rather than jumping.
      advance(2);
      await new Promise((r) => setTimeout(r, 250));
      advance(3);

      // Re-host the source image. Social CDNs hand out *signed, expiring* URLs
      // — a TikTok thumbnail carries x-signature and x-expires roughly two days
      // out — so storing the original would leave every imported recipe
      // pictureless within days. Same reason we re-host kie.ai's output.
      if (recipe.imageUrl) {
        try {
          recipe.imageUrl = await storeImage(recipe.imageUrl, PUBLIC_URL);
        } catch {
          delete recipe.imageUrl;
        }
      }

      job.recipe = recipe;
      job.status = 'ready';
    } catch (e) {
      job.status = 'failed';
      job.error = e instanceof Error ? e.message : String(e);
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
    const error = e instanceof KieError ? e.message : 'Could not start generation';
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
      job.url = await storeImage(status.urls[0], PUBLIC_URL);
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

app.listen(PORT, () => {
  console.log(`Asepo server on http://localhost:${PORT}`);
  console.log(`Public URL for images: ${PUBLIC_URL}`);
  if (!process.env.KIE_API_KEY?.trim()) {
    console.log('KIE_API_KEY not set — /import works, /images will return an error.');
  }
});
