# Supabase setup for Atlas

1. In your Supabase project, open **SQL Editor**.
2. Run `migrations/202611050001_atlas_user_data.sql`, then `migrations/202611050002_supabase_services.sql` in order.
3. In Supabase Auth, enable email/password sign-in and choose whether to require email confirmation.
4. Copy the project URL and publishable (or legacy anon) key into `env.example`, then set the same values in Vercel for Preview and Production as appropriate.
5. For local development, copy the values into a local `.env.local` file. Do not commit that file.

The app uses Supabase Auth and Row Level Security. A user's complete Atlas world state, Memories data, assistant chat history, and non-secret assistant preferences are stored in separate JSONB columns in one row keyed by their Supabase Auth user ID. This keeps the existing `supabase-js` sync compatible while storing all current app domains (Work, Study, People, Life, Memories, plans and assistant data).

The second migration adds:
- `profiles`, created from Supabase Auth metadata, with a user-only RLS policy.
- `atlas_media_assets`, which stores Cloudflare R2 object keys and file metadata; file bytes stay in R2.
- `timetable_import_jobs`, for a PDF extraction Edge Function to update.
- `atlas_notification_outbox` and `enqueue_due_atlas_reminders()`, which queues due project tasks and study deadlines. The migration schedules it every 15 minutes with `pg_cron` when available.
- Realtime publication entries for the app data, media metadata, timetable import jobs and notification queue.

The PDF extraction, AI proxy, signed R2 links and notification delivery are Edge Functions/server code, not SQL. This SQL creates the database tables and queue functions they use.

## Key handling

- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are browser-visible values. This is expected; RLS is the security boundary.
- Never expose `SUPABASE_SERVICE_ROLE_KEY` or Cloudflare R2 credentials to browser code. Do not use the service-role key as the anon key.
- R2 uploads go through the server-only route `app/api/r2/upload`, which returns a signed PUT. The secret key never leaves the server.

## Cloudflare R2 setup

1. In Cloudflare, open **R2 Object Storage** and create a bucket named `atlas-media`. Leave public access **off**.
2. Open **R2 → Manage R2 API Tokens** and create a token with **Object Read & Write**, scoped to that one bucket. Copy the **Access Key ID** and **Secret Access Key**.
3. Copy the **Account ID** from the Cloudflare dashboard sidebar (or the R2 overview page).
4. Add these four variables to Vercel for Production, Preview and Development:
   - `CLOUDFLARE_ACCOUNT_ID`
   - `CLOUDFLARE_R2_ACCESS_KEY_ID`
   - `CLOUDFLARE_R2_SECRET_ACCESS_KEY`
   - `CLOUDFLARE_R2_BUCKET_NAME` — `atlas-media`
5. Redeploy. The app only reports "Cloudflare storage is not set up yet" while these are missing.

How it works: `lib/r2.ts` signs requests with AWS Signature V4 (R2 speaks the S3 API). The browser asks `app/api/r2/upload` for a signed PUT, sends the file straight to R2, and stores a signed read URL in the memory entry. If R2 is unavailable the file stays in the browser so nothing is lost.

## Current persistence behavior

- Without Supabase environment variables, app data falls back to local browser storage; login and account creation require Supabase configuration.
- With Supabase configured, sign-in and account creation use Supabase Auth. Authenticated world and Memories changes are saved to Supabase, with browser storage kept as a per-user cache.
- Existing anonymous browser data is not automatically copied into a newly signed-in account. This avoids leaking one browser user's data into another account; a deliberate import flow can be added separately.
- Assistant chat and non-secret preferences sync to Supabase. The BYOK provider key remains browser-local and is deliberately excluded from SQL. For Vercel-hosted AI keys, add a server-side AI proxy before using production keys.
- The SQL has the R2 object metadata table. Photo and video uploads now go to Cloudflare R2 through the server signing route; the `atlas_media_assets` row is not yet written for each upload, so metadata sync for media is still to be added.
