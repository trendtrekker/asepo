import { Router } from 'express';

import { isLlmConfigured } from '../llm.js';
import { getCredits } from '../kie.js';
import { supabaseAdmin } from '../supabase-admin.js';
import { checkPassword, clearSessionCookie, requireAdmin, setSessionCookie } from './auth.js';
import { escapeHtml, loginPage, page } from './layout.js';

type JobStatus = 'pending' | 'ready' | 'failed';
type JobLike = { status: JobStatus };

type ProfileRow = { id: string; is_pro: boolean; imports_used: number };
type RecipeRow = { id: string; title: string; cuisine: string; user_id: string; added_at: number };

function tally(jobs: Iterable<JobLike>) {
  const counts = { pending: 0, ready: 0, failed: 0 };
  for (const job of jobs) counts[job.status]++;
  return counts;
}

const fmtDate = (iso?: string | null) => (iso ? new Date(iso).toLocaleString() : '—');

/**
 * A factory rather than importing importJobs/imageJobs directly avoids a
 * circular import — index.ts owns those maps and passes them in when it
 * mounts this router, rather than this module reaching back into index.ts.
 */
export function createAdminRouter(deps: {
  importJobs: Map<string, JobLike>;
  imageJobs: Map<string, JobLike>;
}) {
  const router = Router();

  router.get('/login', (req, res) => {
    res.send(loginPage());
  });

  router.post('/login', (req, res) => {
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    if (!checkPassword(password)) {
      return res.status(401).send(loginPage({ error: 'Wrong password.' }));
    }
    setSessionCookie(res);
    res.redirect('/admin');
  });

  router.post('/logout', (_req, res) => {
    clearSessionCookie(res);
    res.redirect('/admin/login');
  });

  router.use(requireAdmin);

  // ---------------------------------------------------------------- dashboard
  router.get('/', async (_req, res) => {
    const kieConfigured = Boolean(process.env.KIE_API_KEY?.trim());
    const [kieCredits, llmConfigured, usersResult, recipeCount] = await Promise.all([
      kieConfigured ? getCredits() : Promise.resolve(null),
      Promise.resolve(isLlmConfigured()),
      supabaseAdmin().auth.admin.listUsers({ page: 1, perPage: 1000 }),
      supabaseAdmin().from('recipes').select('id', { count: 'exact', head: true }),
    ]);

    const importTally = tally(deps.importJobs.values());
    const imageTally = tally(deps.imageJobs.values());
    const userCount = usersResult.data?.users.length ?? 0;

    const statusPill = (ok: boolean, okText: string, badText: string) =>
      `<span class="pill ${ok ? 'ok' : 'bad'}">${ok ? okText : badText}</span>`;

    const body = `
      <p class="sub">Live server & account status.</p>
      <div class="cards">
        <div class="card"><div class="value">${userCount}${userCount === 1000 ? '+' : ''}</div><div class="label">Total users</div></div>
        <div class="card"><div class="value">${recipeCount.count ?? '—'}</div><div class="label">Total recipes (all users)</div></div>
        <div class="card"><div class="value">${kieCredits ?? '—'}</div><div class="label">kie.ai credits remaining</div></div>
        <div class="card"><div class="value">${statusPill(kieConfigured, 'Configured', 'Not set')}</div><div class="label">kie.ai API key</div></div>
        <div class="card"><div class="value">${statusPill(llmConfigured, 'Configured', 'Not set')}</div><div class="label">LLM (healthify/nutrition)</div></div>
      </div>

      <h1 style="font-size:16px">Import jobs (last hour, in-memory)</h1>
      <div class="cards">
        <div class="card"><div class="value">${importTally.pending}</div><div class="label">Pending</div></div>
        <div class="card"><div class="value">${importTally.ready}</div><div class="label">Ready</div></div>
        <div class="card"><div class="value">${importTally.failed}</div><div class="label">Failed</div></div>
      </div>

      <h1 style="font-size:16px">Image generation jobs (last hour, in-memory)</h1>
      <div class="cards">
        <div class="card"><div class="value">${imageTally.pending}</div><div class="label">Pending</div></div>
        <div class="card"><div class="value">${imageTally.ready}</div><div class="label">Ready</div></div>
        <div class="card"><div class="value">${imageTally.failed}</div><div class="label">Failed</div></div>
      </div>
    `;
    res.send(page({ title: 'Dashboard', activeHref: '/admin', body }));
  });

  // -------------------------------------------------------------------- users
  router.get('/users', async (req, res) => {
    const pageNum = Math.max(1, Number(req.query.page) || 1);
    const perPage = 50;

    const { data, error } = await supabaseAdmin().auth.admin.listUsers({ page: pageNum, perPage });
    if (error) return res.status(500).send(page({ title: 'Users', activeHref: '/admin/users', body: `<p class="empty">Could not load users: ${escapeHtml(error.message)}</p>` }));

    const users = data.users;
    const ids = users.map((u) => u.id);
    const { data: profiles } = ids.length
      ? await supabaseAdmin().from('profiles').select('id,is_pro,imports_used').in('id', ids)
      : { data: [] as { id: string; is_pro: boolean; imports_used: number }[] };
    const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

    const rows = users
      .map((u) => {
        const prof = profileById.get(u.id);
        return `<tr>
          <td><a href="/admin/users/${u.id}">${escapeHtml(u.email ?? u.id)}</a></td>
          <td>${prof?.is_pro ? '<span class="pill pro">Pro</span>' : '<span class="pill free">Free</span>'}</td>
          <td>${prof?.imports_used ?? 0}</td>
          <td>${fmtDate(u.created_at)}</td>
          <td>${fmtDate(u.last_sign_in_at)}</td>
        </tr>`;
      })
      .join('');

    const body = `
      <p class="sub">Page ${pageNum} — ${users.length} account${users.length === 1 ? '' : 's'} on this page.</p>
      <table>
        <thead><tr><th>Email</th><th>Plan</th><th>Imports used</th><th>Created</th><th>Last sign-in</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="5" class="empty">No users.</td></tr>'}</tbody>
      </table>
      <div style="margin-top:16px; display:flex; gap:10px;">
        ${pageNum > 1 ? `<a class="btn secondary" href="/admin/users?page=${pageNum - 1}">← Previous</a>` : ''}
        ${users.length === perPage ? `<a class="btn secondary" href="/admin/users?page=${pageNum + 1}">Next →</a>` : ''}
      </div>
    `;
    res.send(page({ title: 'Users', activeHref: '/admin/users', body }));
  });

  router.get('/users/:id', async (req, res) => {
    const { id } = req.params;
    const admin = supabaseAdmin();

    const [{ data: userData, error: userError }, { data: profile }, recipes, cookbooks, grocery, plan] =
      await Promise.all([
        admin.auth.admin.getUserById(id),
        admin.from('profiles').select('*').eq('id', id).single<ProfileRow>(),
        admin.from('recipes').select('id', { count: 'exact', head: true }).eq('user_id', id),
        admin.from('cookbooks').select('id', { count: 'exact', head: true }).eq('user_id', id),
        admin.from('grocery_items').select('id', { count: 'exact', head: true }).eq('user_id', id),
        admin.from('plan_entries').select('id', { count: 'exact', head: true }).eq('user_id', id),
      ]);

    if (userError || !userData.user) {
      return res.status(404).send(page({ title: 'User not found', activeHref: '/admin/users', body: '<p class="empty">No such user.</p>' }));
    }
    const user = userData.user;

    const body = `
      <p class="sub"><a href="/admin/users">← Back to users</a></p>
      <div class="cards">
        <div class="card"><div class="value">${escapeHtml(user.email)}</div><div class="label">Email</div></div>
        <div class="card"><div class="value">${profile?.is_pro ? 'Pro' : 'Free'}</div><div class="label">Plan</div></div>
        <div class="card"><div class="value">${profile?.imports_used ?? 0}</div><div class="label">Imports used</div></div>
        <div class="card"><div class="value">${fmtDate(user.created_at)}</div><div class="label">Created</div></div>
      </div>
      <div class="cards">
        <div class="card"><div class="value">${recipes.count ?? 0}</div><div class="label">Recipes</div></div>
        <div class="card"><div class="value">${cookbooks.count ?? 0}</div><div class="label">Cookbooks</div></div>
        <div class="card"><div class="value">${grocery.count ?? 0}</div><div class="label">Grocery items</div></div>
        <div class="card"><div class="value">${plan.count ?? 0}</div><div class="label">Plan entries</div></div>
      </div>
      <div class="actions">
        <form class="inline" method="post" action="/admin/users/${user.id}/pro">
          <button class="btn" type="submit">${profile?.is_pro ? 'Revoke Pro' : 'Grant Pro'}</button>
        </form>
        <form class="inline" method="post" action="/admin/users/${user.id}/delete"
              onsubmit="return confirm('Permanently delete this account and everything in it? This cannot be undone.');">
          <button class="btn danger" type="submit">Delete account</button>
        </form>
      </div>
    `;
    res.send(page({ title: user.email ?? 'User', activeHref: '/admin/users', body }));
  });

  router.post('/users/:id/pro', async (req, res) => {
    const { id } = req.params;
    const { data: profile } = await supabaseAdmin().from('profiles').select('is_pro').eq('id', id).single<Pick<ProfileRow, 'is_pro'>>();
    // supabase-js has no generated Database type here, so .update()'s expected
    // argument type is `never` — same reason reads need `.single<T>()` above.
    await supabaseAdmin().from('profiles').update({ is_pro: !profile?.is_pro } as never).eq('id', id);
    res.redirect(`/admin/users/${id}`);
  });

  router.post('/users/:id/delete', async (req, res) => {
    const { id } = req.params;
    await supabaseAdmin().auth.admin.deleteUser(id);
    res.redirect('/admin/users');
  });

  // ----------------------------------------------------------------- recipes
  router.get('/recipes', async (req, res) => {
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    let query = supabaseAdmin().from('recipes').select('id,title,cuisine,user_id,added_at');
    if (q) query = query.ilike('title', `%${q}%`);
    const { data: recipes, error } = await query
      .order('added_at', { ascending: false })
      .limit(100)
      .returns<RecipeRow[]>();

    const rows = (recipes ?? [])
      .map(
        (r) => `<tr>
          <td>${escapeHtml(r.title)}</td>
          <td>${escapeHtml(r.cuisine)}</td>
          <td><a href="/admin/users/${r.user_id}">${r.user_id.slice(0, 8)}…</a></td>
          <td>
            <form class="inline" method="post" action="/admin/recipes/${r.id}/delete"
                  onsubmit="return confirm('Delete “${escapeHtml(r.title)}”? This cannot be undone.');">
              <button class="btn danger" type="submit">Delete</button>
            </form>
          </td>
        </tr>`
      )
      .join('');

    const body = `
      <p class="sub">Search across every user's recipes — the one view RLS doesn't let the app itself produce.</p>
      <form method="get" action="/admin/recipes" style="margin-bottom:16px;">
        <input class="search" type="text" name="q" placeholder="Search by title…" value="${escapeHtml(q)}">
      </form>
      ${error ? `<p class="empty">Could not load recipes: ${escapeHtml(error.message)}</p>` : ''}
      <table>
        <thead><tr><th>Title</th><th>Cuisine</th><th>Owner</th><th></th></tr></thead>
        <tbody>${rows || '<tr><td colspan="4" class="empty">No recipes found.</td></tr>'}</tbody>
      </table>
    `;
    res.send(page({ title: 'Recipes', activeHref: '/admin/recipes', body }));
  });

  router.post('/recipes/:id/delete', async (req, res) => {
    await supabaseAdmin().from('recipes').delete().eq('id', req.params.id);
    res.redirect('/admin/recipes');
  });

  return router;
}
