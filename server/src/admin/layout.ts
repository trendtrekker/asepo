/** Shared HTML shell for every /admin page — no view engine, just template literals. */

const NAV_ITEMS = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/recipes', label: 'Recipes' },
];

export function escapeHtml(s: unknown): string {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[c]!);
}

export function page(opts: { title: string; activeHref?: string; body: string; flash?: string }): string {
  const nav = NAV_ITEMS.map(
    (item) => `<a href="${item.href}" class="nav-link${opts.activeHref === item.href ? ' active' : ''}">${item.label}</a>`
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
  header { display: flex; align-items: center; justify-content: space-between; padding: 14px 28px; background: #1B2C43; color: #fff; }
  header .brand { font-weight: 700; letter-spacing: 1px; }
  nav { display: flex; gap: 20px; }
  .nav-link { color: #CADCFC; text-decoration: none; font-size: 14px; padding: 6px 0; }
  .nav-link.active, .nav-link:hover { color: #fff; border-bottom: 2px solid #C2410C; }
  form.logout { margin: 0; }
  form.logout button { background: none; border: none; color: #CADCFC; font-size: 14px; cursor: pointer; padding: 0; }
  form.logout button:hover { color: #fff; }
  main { max-width: 1080px; margin: 0 auto; padding: 28px; }
  h1 { font-size: 24px; margin: 0 0 4px; }
  .sub { color: #6B7280; font-size: 14px; margin: 0 0 24px; }
  .flash { background: #EFEBE4; border-radius: 8px; padding: 10px 14px; margin-bottom: 20px; font-size: 14px; }
  .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 14px; margin-bottom: 28px; }
  .card { background: #fff; border: 1px solid #E2DCD3; border-radius: 10px; padding: 16px; }
  .card .value { font-size: 26px; font-weight: 700; }
  .card .label { font-size: 12px; color: #6B7280; margin-top: 2px; }
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
</style>
</head>
<body>
<header>
  <div class="brand">ASEPO ADMIN</div>
  <nav>
    ${nav}
    <form class="logout" method="post" action="/admin/logout"><button type="submit">Log out</button></form>
  </nav>
</header>
<main>
  <h1>${escapeHtml(opts.title)}</h1>
  ${opts.flash ? `<div class="flash">${escapeHtml(opts.flash)}</div>` : ''}
  ${opts.body}
</main>
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
