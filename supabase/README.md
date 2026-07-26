# Supabase schema

Migrations are tracked here in git so the schema has real history, same as
the app code. They're not applied automatically — this repo isn't linked to
the Supabase CLI, so apply them by hand:

1. Open your project's [SQL Editor](https://supabase.com/dashboard/project/_/sql/new).
2. Paste the contents of `migrations/0001_init.sql` and run it.
3. Check **Table Editor** — you should see `profiles`, `cookbooks`, `recipes`,
   `grocery_items`, and `plan_entries`, and **Storage** should have a
   `recipe-photos` bucket.

Future schema changes get their own numbered file (`0002_*.sql`, ...) rather
than editing `0001_init.sql` in place, so the history stays honest about what
actually ran against the live database and in what order.

## Auth providers

Email/password works with no extra setup. For Google sign-in, enable it under
**Authentication → Providers → Google** in the dashboard — you'll need an
OAuth client from [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
first, with Supabase's callback URL (shown on that provider settings page)
added as an authorized redirect URI.
