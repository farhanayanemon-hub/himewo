# HiMewo — Deploy to your own domain (off Replit)

Production stack (nothing hosted on Replit):

- **Supabase** — Postgres database + Auth
- **Cloudflare R2** — image/file storage
- **Cloudflare Stream** — video/livestream (add later)
- **Railway** — backend API server (persistent; required for WebSocket realtime)
- **Cloudflare Pages** — web app (static)
- **Your domain** — DNS pointing at the hosts above

The codebase is fully env-driven, so you do NOT change code to deploy — you only
create accounts, set environment variables, and run the build/start commands below.

---

## Step 1 — Supabase (Database + Auth)

1. Create a project at https://supabase.com (region: Singapore or Mumbai).
2. Collect:
   - `DATABASE_URL` — Project Settings > Database > Connection string > **URI**
   - `SUPABASE_URL`, `SUPABASE_ANON_KEY` — Settings > API
   - `SUPABASE_SERVICE_ROLE_KEY` — Settings > API (secret)
   - `SUPABASE_JWT_SECRET` — Settings > API > JWT Settings
3. Push the database schema (run locally once, with the Supabase URL):
   ```bash
   DATABASE_URL="<your-supabase-uri>" pnpm --filter @workspace/db run push
   ```

## Step 2 — Cloudflare R2 (storage)

1. In the Cloudflare dashboard: **R2 > Create bucket** named `media`.
2. Enable public access: either turn on the bucket's **r2.dev** public URL, or
   attach a custom domain (e.g. `media.yourdomain.com`). This value is `R2_PUBLIC_URL`.
3. **R2 > Manage API Tokens > Create** an S3 token with Object Read & Write.
   Collect: Account ID (`R2_ACCOUNT_ID`), Access Key ID (`R2_ACCESS_KEY_ID`),
   Secret Access Key (`R2_SECRET_ACCESS_KEY`).
4. Set the bucket **CORS policy** to allow browser uploads, e.g.:
   ```json
   [
     {
       "AllowedOrigins": ["https://yourdomain.com"],
       "AllowedMethods": ["PUT", "GET"],
       "AllowedHeaders": ["Content-Type"],
       "MaxAgeSeconds": 3600
     }
   ]
   ```

## Step 3 — Push code to GitHub

Repo: `github.com/farhanayanemon-hub/himewo`. Push the latest commit (use the
Git panel / `git push`). Railway and Cloudflare Pages deploy from this repo.

## Step 4 — Backend on Railway

1. https://railway.app > New Project > Deploy from GitHub repo.
2. Settings:
   - **Build command:** `pnpm --filter @workspace/api-server run build`
   - **Start command:** `node artifacts/api-server/dist/index.mjs`
3. **Variables** (see `artifacts/api-server/.env.example`):
   `NODE_ENV=production`, `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`, `R2_ACCOUNT_ID`,
   `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_URL`.
   (Railway sets `PORT` automatically.)
4. Add a custom domain (e.g. `api.yourdomain.com`) under the service's Settings >
   Networking. Note the resulting backend URL.

## Step 5 — Web app on Cloudflare Pages

1. Cloudflare dashboard > **Workers & Pages > Create > Pages** > connect the repo.
2. Build settings:
   - **Build command:** `pnpm install && pnpm --filter @workspace/web run build`
   - **Build output directory:** `artifacts/web/dist/public`
3. **Environment variables** (build-time; see `artifacts/web/.env.example`):
   `VITE_API_URL=https://api.yourdomain.com`, `VITE_SUPABASE_URL`,
   `VITE_SUPABASE_ANON_KEY`, `BASE_PATH=/`.
4. SPA routing is handled by `artifacts/web/public/_redirects`.

## Step 6 — Domain & DNS

- `yourdomain.com` -> Cloudflare Pages (web)
- `api.yourdomain.com` -> Railway (backend)
- `media.yourdomain.com` -> R2 public bucket (optional custom domain for storage)

Realtime: the web app opens a WebSocket to `VITE_API_URL` (`/api/ws`). Railway
supports WebSockets, so realtime works once the backend domain is set.

## Step 7 — Verify

- Open `https://yourdomain.com`, sign up / log in (Supabase Auth).
- Create a post with an image — confirms the R2 upload + public URL.
- Check realtime (notifications / chat) updates live.

---

## Video / livestream (later)

Cloudflare Stream is the chosen provider. Credentials
(`CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_STREAM_API_TOKEN`) will be entered via the
planned admin panel Settings page (stored encrypted) rather than as env vars.
