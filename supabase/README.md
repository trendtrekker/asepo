# Supabase schema

Migrations are tracked here in git so the schema has real history, same as
the app code. They're not applied automatically — this repo isn't linked to
the Supabase CLI, so apply them by hand:

1. Open your project's [SQL Editor](https://supabase.com/dashboard/project/_/sql/new).
2. Paste the contents of `migrations/0001_init.sql` and run it.
3. Check **Table Editor** — you should see `profiles`, `cookbooks`, `recipes`,
   `grocery_items`, and `plan_entries`, and **Storage** should have a
   `recipe-photos` bucket.

Apply later numbered migrations in order as well. `0004_recipe_cache.sql`
adds the server-only shared recipe cache used to avoid repeated AI calls for
the same public URL, dish idea, meal suggestion, or generated recipe image.
Its rows expire automatically when read; old expired rows can be deleted with
`delete from recipe_cache where expires_at <= now();`. Pasted text and uploaded
photos are deliberately never written to this shared cache.

Future schema changes get their own numbered file (`0002_*.sql`, ...) rather
than editing `0001_init.sql` in place, so the history stays honest about what
actually ran against the live database and in what order.

## Auth providers

Email signup uses a password plus a six-digit confirmation code. Configure it
in the Supabase dashboard before testing:

1. Under **Authentication → Email Templates → Confirm signup**, use
   `{{ .Token }}` in the message body. Using only `{{ .ConfirmationURL }}`
   sends a link instead of the code expected by the app.
2. Under **Project Settings → Authentication → SMTP Settings**, enable custom
   SMTP and enter the Resend SMTP credentials. The Resend API key is the SMTP
   password and must stay in Supabase; never add it to the app or this repo.
3. Use a sender address on a domain verified in Resend. Resend's test sender
   is suitable only for sending to the Resend account owner's address.

For Google sign-in, enable it under
**Authentication → Providers → Google** in the dashboard — you'll need an
OAuth client from [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
first, with Supabase's callback URL (shown on that provider settings page)
added as an authorized redirect URI.
