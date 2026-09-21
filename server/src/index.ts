import 'dotenv/config';

import { timingSafeEqual } from 'node:crypto';
import cors from 'cors';
import express from 'express';

import { createAdminRouter } from './admin/routes.js';
import { authenticate, authenticateOrGuest, authenticatePro, isAuthFailure } from './auth.js';
import { imageCacheInput, readCache, writeCache, type CacheKind } from './cache.js';
import { extractFromIdea, extractFromImage, extractFromText, extractFromUrl, ExtractionError, type ExtractedRecipe } from './extract.js';
import { getCredits, getImageStatus, imagePromptFor, KieError, startImageGeneration } from './kie.js';
import { estimateNutrition, healthifyRecipe, isLlmConfigured, LlmError, suggestMeals } from './llm.js';
import { createRateLimiter } from './rate-limit.js';
import { storeImage, storeImageFromDataUrl } from './storage.js';
import { supabaseAdmin } from './supabase-admin.js';

/**
 * Asepo backend. Implements the contract the app expects in src/lib/api/http.ts.
 *
 * Import, suggestion and image routes accept either a session or a stable
 * guest-installation ID. Pro and account routes require a session. Anything
 * that spends money is additionally rate limited per caller. This matters because
 * EXPO_PUBLIC_API_URL ships inside the app bundle, so this address is public
 * the moment the app is:
 *
 *   POST /import        -> { taskId, labels }   account/guest, rate limited
 *   GET  /import/:id    -> { status, step, label, recipe?, error? }   account/guest, own job only
 *   POST /suggest-meals -> { suggestions: [{ title, description }] }  account/guest, rate limited
 *   POST /images        -> { taskId, status }   account/guest, rate limited
 *   GET  /images/:id    -> { taskId, status, url?, error? }   account/guest, own job only
 *   POST /healthify     -> { ingredients, instructions, summary }  Pro, rate limited
 *   POST /nutrition     -> { calories, protein, carbs, fat }       Pro, rate limited
 *   DELETE /account     -> 204, auth
 *   /admin/*            -> server-rendered admin dashboard, password-gated
 */

const PORT = Number(process.env.PORT ?? 8787);
/** Public origin used to build image URLs. Must be reachable by the phone. */
const PUBLIC_URL = process.env.PUBLIC_URL?.trim()
  || process.env.RENDER_EXTERNAL_URL?.trim()
  || `http://localhost:${PORT}`;

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
  /** Who started it. Task ids are short and random, not unguessable. */
  userId: string;
  freeQuotaCharged: boolean;
  freeQuotaDayKey: string;
  freeQuotaRefunded?: boolean;
};

type ImageJob = {
  status: 'pending' | 'ready' | 'failed';
  kieTaskId?: string;
  url?: string;
  error?: string;
  createdAt: number;
  userId: string;
  cacheInput?: string;
};

const importJobs = new Map<string, ImportJob>();
const imageJobs = new Map<string, ImageJob>();

// Form posts (login, grant-Pro, delete buttons) — scoped to /admin only, the
// rest of the API is JSON-only.
app.use('/admin', express.urlencoded({ extended: true }));
app.use('/admin', createAdminRouter({ importJobs, imageJobs }));

const newId = () => Math.random().toString(36).slice(2, 12);

/* ------------------------------------------------------------------ *
 * RevenueCat subscription webhooks
 * ------------------------------------------------------------------ */

const SUPABASE_USER_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

app.post('/webhooks/revenuecat', async (req, res) => {
  const expectedAuthorization = process.env.REVENUECAT_WEBHOOK_AUTHORIZATION?.trim();
  if (!expectedAuthorization) {
    res.status(503).json({ error: 'RevenueCat webhook is not configured' });
    return;
  }

  const suppliedAuthorization = req.header('authorization') ?? '';
  const expectedBytes = Buffer.from(expectedAuthorization);
  const suppliedBytes = Buffer.from(suppliedAuthorization);
  if (expectedBytes.length !== suppliedBytes.length || !timingSafeEqual(expectedBytes, suppliedBytes)) {
    res.sendStatus(401);
    return;
  }

  const body = req.body as {
    event?: {
      id?: unknown;
      type?: unknown;
      event_timestamp_ms?: unknown;
      app_user_id?: unknown;
      original_app_user_id?: unknown;
      aliases?: unknown;
      entitlement_ids?: unknown;
      expiration_at_ms?: unknown;
      period_type?: unknown;
    };
  };
  const event = body?.event;
  const eventType = typeof event?.type === 'string' ? event.type : '';
  const eventTimestamp = event?.event_timestamp_ms;
  if (!event || typeof event.id !== 'string' || !eventType || typeof eventTimestamp !== 'number' || !Number.isFinite(eventTimestamp)) {
    res.status(400).json({ error: 'Invalid RevenueCat event' });
    return;
  }

  // RevenueCat's synthetic test event has a sample account ID and no real
  // entitlement; acknowledge it without writing to the subscription table.
  if (eventType === 'TEST') {
    res.sendStatus(200);
    return;
  }

  // Purchases made by guests can begin with an anonymous App User ID. Once
  // they sign in, RevenueCat includes the account UUID in the aliases list.
  const aliases = Array.isArray(event.aliases) ? event.aliases : [];
  const userId = [event.app_user_id, ...aliases, event.original_app_user_id]
    .find((candidate): candidate is string => typeof candidate === 'string' && SUPABASE_USER_ID.test(candidate));
  if (!userId) {
    // A guest purchase is still handled by the SDK on-device. There is no
    // Supabase account to grant until RevenueCat associates the customer with
    // the user's account ID.
    res.sendStatus(200);
    return;
  }

  const entitlementIds = Array.isArray(event.entitlement_ids) ? event.entitlement_ids : [];
  const entitled = entitlementIds.includes('asepo_pro');
  const expirationMs = event.expiration_at_ms;
  const expiresAt = typeof expirationMs === 'number' && Number.isFinite(expirationMs)
    ? new Date(expirationMs).toISOString()
    : null;
  const ended = eventType === 'EXPIRATION' || eventType === 'REFUND';
  const isPro = entitled && !ended && expiresAt !== null && Date.parse(expiresAt) > Date.now();
  const isTrial = isPro && event.period_type === 'TRIAL';

  try {
    const { error } = await supabaseAdmin().rpc('apply_revenuecat_subscription_event', {
      p_user_id: userId,
      p_is_pro: isPro,
      p_expires_at: expiresAt,
      p_is_trial: isTrial,
      p_event_timestamp_ms: Math.trunc(eventTimestamp),
    } as never);
    if (error) {
      console.error('[revenuecat] entitlement update failed', error.message);
      res.status(500).json({ error: 'Could not update subscription access' });
      return;
    }
    res.sendStatus(200);
  } catch (error) {
    console.error('[revenuecat] webhook processing failed', error);
    res.status(500).json({ error: 'Could not update subscription access' });
  }
});

/* ------------------------------------------------------------------ *
 * Rate limits
 *
 * Sized to be invisible to a person cooking and obstructive to a script.
 * Free access allows three imports per UTC day for three days and Pro is unbounded, so twenty
 * imports an hour is far past any real session while still capping what a
 * single account can spend if someone automates it.
 *
 * Polling is deliberately separate and generous: an import is polled every
 * two seconds for up to two minutes, so one legitimate import is already
 * sixty requests and the expensive limiter would refuse it immediately.
 * ------------------------------------------------------------------ */

const HOUR_MS = 60 * 60 * 1000;
const importLimiter = createRateLimiter({ limit: 20, windowMs: HOUR_MS });
const imageLimiter = createRateLimiter({ limit: 20, windowMs: HOUR_MS });
const suggestLimiter = createRateLimiter({ limit: 30, windowMs: HOUR_MS });
const proLlmLimiter = createRateLimiter({ limit: 30, windowMs: HOUR_MS });
const pollLimiter = createRateLimiter({ limit: 900, windowMs: HOUR_MS });
const freeAccessStatusLimiter = createRateLimiter({ limit: 60, windowMs: HOUR_MS });

type DailyFreeAccessRow = {
  allowed: boolean;
  reason: 'OK' | 'PRO' | 'DAILY_LIMIT' | 'FREE_PERIOD_EXPIRED';
  is_pro: boolean;
  started_at: string;
  expires_at: string;
  day_key: string;
  imports_today: number;
  imports_remaining: number;
};

function dailyAccessIdentity(userId: string) {
  return userId.startsWith('guest:') ? userId : `user:${userId}`;
}

async function readDailyFreeAccess(
  req: express.Request,
  identity: string,
  startedAt: string | undefined,
  consume: boolean
): Promise<DailyFreeAccessRow | null> {
  const suppliedGuestId = req.header('x-asepo-guest-id')?.trim();
  const guestKey = suppliedGuestId && /^[0-9a-f-]{36}$/i.test(suppliedGuestId)
    ? `guest:${suppliedGuestId}`
    : identity.startsWith('guest:') ? identity : null;
  const safeStartedAt = startedAt && Number.isFinite(Date.parse(startedAt))
    ? new Date(startedAt).toISOString()
    : null;

  try {
    const { data, error } = await supabaseAdmin().rpc('daily_free_access_status', {
      p_identity_key: identity,
      p_guest_key: guestKey,
      p_started_at: safeStartedAt,
      p_consume: consume,
    } as never);
    if (error) {
      console.error('[free-access] usage lookup failed', error.message);
      return null;
    }
    const rows = data as unknown as DailyFreeAccessRow[] | null;
    return rows?.[0] ?? null;
  } catch (error) {
    console.error('[free-access] usage lookup failed', error);
    return null;
  }
}

function freeAccessResponse(row: DailyFreeAccessRow) {
  return {
    allowed: row.allowed,
    reason: row.reason,
    isPro: row.is_pro,
    startedAt: row.started_at,
    expiresAt: row.expires_at,
    dayKey: row.day_key,
    importsUsedToday: row.imports_today,
    importsRemainingToday: row.imports_remaining,
  };
}

/**
 * The gate every costed route opens with: establish who is calling, then
 * charge them for it. Returns the caller, or null having already answered.
 */
async function gate(
  req: express.Request,
  res: express.Response,
  limiter: ReturnType<typeof createRateLimiter>,
  options: { pro?: boolean } = {}
): Promise<{ userId: string } | null> {
  const caller = options.pro ? await authenticatePro(req) : await authenticateOrGuest(req);
  if (isAuthFailure(caller)) {
    res.status(caller.status).json({ error: caller.error });
    return null;
  }

  const decision = limiter(caller.userId);
  if (!decision.allowed) {
    // Retry-After is the standard way to say when, and the app maps 429 to
    // "Asepo is busy right now. Wait a moment and try again."
    res.set('Retry-After', String(decision.retryAfterSeconds));
    res.status(429).json({ error: 'Too many requests. Try again shortly.' });
    return null;
  }

  return caller;
}

app.get('/free-access', async (req, res) => {
  const caller = await gate(req, res, freeAccessStatusLimiter);
  if (!caller) return;
  const requestedStart = typeof req.query.startedAt === 'string' ? req.query.startedAt : undefined;
  const status = await readDailyFreeAccess(req, dailyAccessIdentity(caller.userId), requestedStart, false);
  if (!status) {
    res.status(503).json({ error: 'Could not check free access. Try again shortly.' });
    return;
  }
  res.json(freeAccessResponse(status));
});

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

app.post('/import', async (req, res) => {
  const caller = await gate(req, res, importLimiter);
  if (!caller) return;

  const source = req.body as { kind?: string; url?: string; text?: string; uri?: string };
  const hasSource = (source?.kind === 'url' && typeof source.url === 'string' && Boolean(source.url.trim()))
    || (source?.kind === 'text' && typeof source.text === 'string' && Boolean(source.text.trim()))
    || (source?.kind === 'image' && typeof source.uri === 'string' && Boolean(source.uri.trim()))
    || (source?.kind === 'idea' && typeof source.text === 'string' && Boolean(source.text.trim()));
  if (!hasSource) {
    res.status(400).json({ error: 'Send a recipe link, text, photo, or dish name.' });
    return;
  }

  const freeAccess = await readDailyFreeAccess(req, dailyAccessIdentity(caller.userId), undefined, true);
  if (!freeAccess) {
    res.status(503).json({ error: 'Could not check free access. Try again shortly.' });
    return;
  }
  if (!freeAccess.allowed) {
    const dailyLimit = freeAccess.reason === 'DAILY_LIMIT';
    res.status(403).json({
      code: dailyLimit ? 'FREE_DAILY_LIMIT' : 'FREE_PERIOD_EXPIRED',
      error: dailyLimit ? 'Daily free imports used' : 'Free access has ended',
    });
    return;
  }

  const id = newId();

  const pipeline = pipelineFor(source);
  importJobs.set(id, {
    status: 'pending',
    step: 0,
    label: pipeline[0],
    labels: pipeline,
    createdAt: Date.now(),
    userId: caller.userId,
    freeQuotaCharged: !freeAccess.is_pro,
    freeQuotaDayKey: freeAccess.day_key,
  });
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

      // Share only public URLs and generic dish ideas. Pasted text and photos
      // may contain private material, so they deliberately bypass this cache.
      let cacheKind: CacheKind | null = null;
      let cacheInput: string | null = null;
      if (source.kind === 'url' && source.url) {
        cacheKind = 'url';
        cacheInput = source.url;
      } else if (source.kind === 'idea' && source.text) {
        cacheKind = 'idea';
        cacheInput = source.text;
      }

      const cached = cacheKind && cacheInput
        ? await readCache<ExtractedRecipe>(cacheKind, cacheInput)
        : null;

      let recipe: ExtractedRecipe;
      if (cached) {
        recipe = cached;
      } else if (source.kind === 'url' && source.url) {
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
      if (recipe.imageUrl && !cached) {
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

      if (!cached && cacheKind && cacheInput) {
        await writeCache(cacheKind, cacheInput, recipe);
      }

      job.recipe = recipe;
      job.status = 'ready';
    } catch (e) {
      if (job.freeQuotaCharged && !job.freeQuotaRefunded) {
        job.freeQuotaRefunded = true;
        try {
          const { error } = await supabaseAdmin().rpc('refund_daily_free_import', {
            p_identity_key: dailyAccessIdentity(job.userId),
            p_usage_day: job.freeQuotaDayKey,
          } as never);
          if (error) console.error(`[import ${id}] free quota refund failed`, error.message);
        } catch (refundError) {
          console.error(`[import ${id}] free quota refund failed`, refundError);
        }
      }
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

app.get('/import/:id', async (req, res) => {
  const caller = await gate(req, res, pollLimiter);
  if (!caller) return;

  const job = importJobs.get(req.params.id);
  // Someone else's job is reported as missing rather than forbidden — task ids
  // are ten random characters, and confirming one exists is itself an answer.
  if (!job || job.userId !== caller.userId) {
    return res.status(404).json({ status: 'failed', error: 'Unknown task' });
  }

  res.json({
    status: job.status,
    step: job.step,
    label: job.label,
    labels: job.labels,
    ...(job.recipe ? { recipe: job.recipe } : {}),
    ...(job.error ? { error: job.error } : {}),
  });
});

/**
 * Names a handful of specific dishes for a loose request ("what can I have
 * for breakfast today?"). Synchronous rather than a job like /import — the
 * model call is short, and there's no source to fetch first. Free: it only
 * names dishes, the import limit is enforced when one is actually turned
 * into a saved recipe via the existing 'idea' import path.
 */
app.post('/suggest-meals', async (req, res) => {
  if (!(await gate(req, res, suggestLimiter))) return;

  const prompt = typeof req.body?.prompt === 'string' ? req.body.prompt.trim() : '';
  if (!prompt) return res.status(400).json({ error: 'Describe what you want to eat' });
  if (!isLlmConfigured()) return res.status(503).json({ error: 'Meal suggestions are not configured' });

  try {
    const cached = await readCache<Awaited<ReturnType<typeof suggestMeals>>>('suggestion', prompt);
    const suggestions = cached ?? await suggestMeals(prompt);
    if (!cached) await writeCache('suggestion', prompt, suggestions);
    res.json({ suggestions });
  } catch (e) {
    if (e instanceof LlmError && e.userSafe) {
      return res.status(422).json({ error: e.message });
    }
    console.error('[suggest-meals] failed —', e);
    res.status(500).json({ error: 'Could not come up with suggestions right now. Try again.' });
  }
});

/* ------------------------------------------------------------------ *
 * Images
 * ------------------------------------------------------------------ */

app.post('/images', async (req, res) => {
  const caller = await gate(req, res, imageLimiter);
  if (!caller) return;

  const { title, cuisine, ingredients } = req.body as {
    title?: string;
    cuisine?: string;
    ingredients?: string[];
  };

  if (!title) return res.status(400).json({ status: 'failed', error: 'title is required' });

  const id = newId();
  const cacheInput = imageCacheInput({ title, cuisine, ingredients });
  const cached = await readCache<{ url: string }>('image', cacheInput);
  if (cached?.url) {
    imageJobs.set(id, { status: 'ready', url: cached.url, createdAt: Date.now(), userId: caller.userId });
    return res.json({ taskId: id, status: 'ready', url: cached.url });
  }

  imageJobs.set(id, { status: 'pending', createdAt: Date.now(), userId: caller.userId, cacheInput });

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
    imageJobs.set(id, { status: 'failed', error, createdAt: Date.now(), userId: caller.userId });
    res.status(e instanceof KieError ? 400 : 500).json({ taskId: id, status: 'failed', error });
  }
});

app.get('/images/:id', async (req, res) => {
  const caller = await gate(req, res, pollLimiter);
  if (!caller) return;

  const job = imageJobs.get(req.params.id);
  if (!job || job.userId !== caller.userId) {
    return res.status(404).json({ status: 'failed', error: 'Unknown task' });
  }

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
      if (job.cacheInput) await writeCache('image', job.cacheInput, { url: job.url });
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
 * Healthify — Pro-only. Entitlement lives in auth.ts alongside plain
 * authentication, so there is one definition of a valid session.
 * ------------------------------------------------------------------ */

app.post('/healthify', async (req, res) => {
  if (!(await gate(req, res, proLlmLimiter, { pro: true }))) return;

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
  if (!(await gate(req, res, proLlmLimiter, { pro: true }))) return;

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
  const caller = await authenticate(req);
  if (isAuthFailure(caller)) return res.status(caller.status).json({ error: caller.error });

  // Not rate limited: an account can only be deleted once, and the second
  // attempt fails on its own when the session stops resolving.
  const { error } = await supabaseAdmin().auth.admin.deleteUser(caller.userId);
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
