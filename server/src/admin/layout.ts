/** Shared HTML shell for every /admin page — no view engine, just template literals. */

const NAV_ITEMS = [
  { href: '/admin', label: 'Dashboard', icon: '▦' },
  { href: '/admin/users', label: 'Users', icon: '◔' },
  { href: '/admin/recipes', label: 'Recipes', icon: '▤' },
];

export function escapeHtml(s: unknown): string {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[c]!);
}

export function page(opts: { title: string; activeHref?: string; body: string; flash?: string }): string {
  const nav = NAV_ITEMS.map(
    (item) => `<a href="${item.href}" class="nav-link${opts.activeHref === item.href ? ' active' : ''}">
      <span class="nav-icon">${item.icon}</span>${item.label}
    </a>`
  ).join('');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(opts.title)} — Asepo Admin</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: -apple-system, Segoe UI, Roboto, Arial, sans-serif; background: #F7F5F2; color: #1B2C43; }

  .shell { display: flex; min-height: 100vh; }

  .sidebar { width: 220px; flex-shrink: 0; background: #fff; border-right: 1px solid #E2DCD3; display: flex; flex-direction: column; padding: 20px 14px; }
  .brand { display: flex; align-items: center; gap: 9px; padding: 6px 10px 22px; font-weight: 700; letter-spacing: 0.5px; font-size: 15px; }
  .brand .mark { width: 26px; height: 26px; border-radius: 7px; background: #1B2C43; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; }

  .nav-link { display: flex; align-items: center; gap: 11px; padding: 9px 12px; border-radius: 8px; color: #56606F; text-decoration: none; font-size: 14px; font-weight: 500; margin-bottom: 2px; }
  .nav-icon { font-size: 15px; width: 18px; text-align: center; color: #9BA3AF; }
  .nav-link.active { background: #FBEDE6; color: #C2410C; }
  .nav-link.active .nav-icon { color: #C2410C; }
  .nav-link:hover:not(.active) { background: #F7F5F2; }

  .sidebar-footer { margin-top: auto; padding-top: 14px; border-top: 1px solid #E2DCD3; }
  form.logout { margin: 0; }
  form.logout button { width: 100%; display: flex; align-items: center; gap: 11px; background: none; border: none; color: #56606F; font-size: 14px; font-weight: 500; cursor: pointer; padding: 9px 12px; border-radius: 8px; text-align: left; font-family: inherit; }
  form.logout button:hover { background: #F7F5F2; color: #1B2C43; }

  main { flex: 1; padding: 30px 36px; max-width: 1180px; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  .sub { color: #6B7280; font-size: 14px; margin: 0 0 22px; }
  .flash { background: #EFEBE4; border-radius: 8px; padding: 10px 14px; margin-bottom: 20px; font-size: 14px; }

  .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 14px; margin-bottom: 24px; }
  .card { background: #fff; border: 1px solid #E2DCD3; border-radius: 12px; padding: 16px; }
  .card .card-top { display: flex; align-items: center; gap: 8px; color: #6B7280; font-size: 12.5px; margin-bottom: 10px; }
  .card .card-icon { width: 26px; height: 26px; border-radius: 7px; background: #FBEDE6; color: #C2410C; display: flex; align-items: center; justify-content: center; font-size: 13px; }
  .card .value-row { display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; }
  .card .value { font-size: 24px; font-weight: 700; }
  .card .label { font-size: 12px; color: #6B7280; margin-top: 2px; }
  .trend { font-size: 11.5px; font-weight: 700; padding: 2px 7px; border-radius: 6px; }

  .panels { display: grid; grid-template-columns: 1.6fr 1fr; gap: 16px; margin-bottom: 24px; align-items: stretch; }
  .panel { background: #fff; border: 1px solid #E2DCD3; border-radius: 12px; padding: 18px 20px; }
  .panel h2 { font-size: 15px; margin: 0 0 4px; }
  .panel .panel-sub { font-size: 12px; color: #6B7280; margin: 0 0 14px; }
  .donut-row { display: flex; align-items: center; gap: 20px; }
  .legend { list-style: none; margin: 0; padding: 0; font-size: 13px; flex: 1; }
  .legend li { display: flex; align-items: center; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #F1EFEA; }
  .legend li:last-child { border-bottom: none; }
  .legend .swatch { width: 8px; height: 8px; border-radius: 50%; display: inline-block; margin-right: 8px; }
  .legend .name { display: flex; align-items: center; color: #1B2C43; }
  .legend .pct { color: #6B7280; font-weight: 600; }

  table { width: 100%; border-collapse: collapse; background: #fff; border: 1px solid #E2DCD3; border-radius: 10px; overflow: hidden; }
  th, td { text-align: left; padding: 10px 14px; border-bottom: 1px solid #E2DCD3; font-size: 14px; }
  th { background: #EFEBE4; font-size: 12px; text-transform: uppercase; letter-spacing: 0.4px; color: #6B7280; }
  tr:last-child td { border-bottom: none; }
  a { color: #C2410C; }
  .btn { display: inline-block; background: #1B2C43; color: #fff; border: none; border-radius: 6px; padding: 7px 14px; font-size: 13px; cursor: pointer; text-decoration: none; }
  .btn.danger { background: #B91C1C; }
  .btn.secondary { background: #EFEBE4; color: #1B2C43; }
  .actions { display: flex; gap: 8px; }
  form.inline { display: inline; margin: 0; }
  .search { padding: 9px 12px; border: 1px solid #E2DCD3; border-radius: 8px; font-size: 14px; width: 320px; }
  .pill { display: inline-block; padding: 2px 9px; border-radius: 10px; font-size: 12px; font-weight: 600; }
  .pill.pro { background: #C2410C; color: #fff; }
  .pill.free { background: #EFEBE4; color: #6B7280; }
  .pill.ok { background: #DCFCE7; color: #166534; }
  .pill.warn { background: #FEF3C7; color: #92400E; }
  .pill.bad { background: #FEE2E2; color: #991B1B; }
  .empty { color: #6B7280; font-size: 14px; padding: 20px 0; }

  @media (max-width: 860px) {
    .panels { grid-template-columns: 1fr; }
  }
</style>
</head>
<body>
<div class="shell">
  <div class="sidebar">
    <div class="brand"><span class="mark">A</span>Asepo Admin</div>
    <nav>${nav}</nav>
    <div class="sidebar-footer">
      <form class="logout" method="post" action="/admin/logout">
        <button type="submit"><span class="nav-icon">⏻</span>Log out</button>
      </form>
    </div>
  </div>
  <main>
    <h1>${escapeHtml(opts.title)}</h1>
    ${opts.flash ? `<div class="flash">${escapeHtml(opts.flash)}</div>` : ''}
    ${opts.body}
  </main>
</div>
</body>
</html>`;
}

export function loginPage(opts: { error?: string } = {}): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Sign in — Asepo Admin</title>
<style>
  body { margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center; font-family: -apple-system, Segoe UI, Roboto, Arial, sans-serif; background: #1B2C43; }
  form { background: #fff; padding: 32px; border-radius: 12px; width: 320px; }
  h1 { font-size: 18px; margin: 0 0 4px; color: #1B2C43; }
  p.sub { font-size: 13px; color: #6B7280; margin: 0 0 20px; }
  input { width: 100%; padding: 10px 12px; border: 1px solid #E2DCD3; border-radius: 8px; font-size: 14px; margin-bottom: 12px; box-sizing: border-box; }
  button { width: 100%; padding: 11px; background: #C2410C; color: #fff; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; }
  .error { background: #FEE2E2; color: #991B1B; font-size: 13px; padding: 8px 12px; border-radius: 6px; margin-bottom: 12px; }
</style>
</head>
<body>
<form method="post" action="/admin/login">
  <h1>Asepo Admin</h1>
  <p class="sub">Enter the admin password to continue.</p>
  ${opts.error ? `<div class="error">${escapeHtml(opts.error)}</div>` : ''}
  <input type="password" name="password" placeholder="Password" autofocus required>
  <button type="submit">Sign in</button>
</form>
</body>
</html>`;
}
