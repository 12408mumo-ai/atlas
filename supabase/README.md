# Supabase setup for Atlas

1. In your Supabase project, open **SQL Editor**.
2. Run `migrations/202611050001_atlas_user_data.sql`.
3. In Supabase Auth, enable email/password sign-in and choose whether to require email confirmation.
4. Copy the project URL and publishable (or legacy anon) key into `env.example`, then set the same values in Vercel for Preview and Production as appropriate.
5. For local development, copy the values into a local `.env.local` file. Do not commit that file.

The app uses Supabase Auth and Row Level Security. A user's complete Atlas world state, Memories data, assistant chat history, and non-secret assistant preferences are stored in separate JSONB columns in one row keyed by their Supabase Auth user ID. This matches the current app models and keeps every row private through RLS. Cloudflare R2 file bytes stay in R2; their object keys, owner, and metadata have a separate `atlas_media_assets` table.

## Key handling

- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are browser-visible values. This is expected; RLS is the security boundary.
- Never expose `SUPABASE_SERVICE_ROLE_KEY` or Cloudflare R2 credentials to browser code. Do not use the service-role key as the anon key.
- R2 uploads must go through a server route that signs requests or accepts the file server-side. The R2 variables listed in `env.example` are server-only and are not used by the current app yet.

## Current persistence behavior

- Without Supabase environment variables, app data falls back to local browser storage; login and account creation require Supabase configuration.
- With Supabase configured, sign-in and account creation use Supabase Auth. Authenticated world and Memories changes are saved to Supabase, with browser storage kept as a per-user cache.
- Existing anonymous browser data is not automatically copied into a newly signed-in account. This avoids leaking one browser user's data into another account; a deliberate import flow can be added separately.
- Assistant chat and non-secret preferences sync to Supabase. The BYOK provider key remains browser-local and is deliberately excluded from SQL. For Vercel-hosted AI keys, add a server-side AI proxy before using production keys.
- The SQL has the R2 object metadata table, but media upload/download is not yet wired to it. Add the server-side R2 upload/signing route before relying on Cloudflare storage.
