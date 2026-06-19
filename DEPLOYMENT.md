# LankaJob AI — Deployment Guide

## Prerequisites

- [Vercel](https://vercel.com) account
- [Railway](https://railway.app) account
- [Supabase](https://supabase.com) project
- [Clerk](https://clerk.com) application
- [OpenAI](https://platform.openai.com) API key
- Optional: [SerpAPI](https://serpapi.com) key for LinkedIn hybrid ingest

## 1. Supabase Setup

1. Create a new Supabase project
2. Go to **Storage** → create bucket `cvs` (private)
3. Copy **Database** → Connection string (pooler, port 6543)
4. Convert to async URL: `postgresql+asyncpg://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres`
5. Copy **Project URL** and **service_role** key for storage

## 2. Clerk Setup

1. Create application at clerk.com
2. Enable Email + Google sign-in
3. Add redirect URLs:
   - `https://your-domain.vercel.app/sign-in`
   - `https://your-domain.vercel.app/sign-up`
   - `http://localhost:3000/sign-in` (dev)
4. Copy **Publishable key** and **Secret key**
5. Copy **JWKS URL** and **Issuer** from JWT template for backend

## 3. Railway — API Service

1. New Project → Deploy from GitHub repo
2. Set root/build to `apps/api` with Dockerfile
3. Add environment variables:

```
DATABASE_URL=postgresql+asyncpg://...
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...
SUPABASE_STORAGE_BUCKET=cvs
OPENAI_API_KEY=sk-...
CLERK_JWKS_URL=https://xxx.clerk.accounts.dev/.well-known/jwks.json
CLERK_ISSUER=https://xxx.clerk.accounts.dev
SERPAPI_KEY=...
CORS_ORIGINS=https://your-domain.vercel.app,http://localhost:3000
```

4. Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Note the public Railway URL (e.g. `https://lankajob-api.up.railway.app`)

## 4. Railway — Worker Service

1. Duplicate the API service or add a new service from same Dockerfile
2. Use same env vars (except CORS not needed)
3. Start command: `python -m app.workers.scheduler`
4. Worker runs job scrapers every 4 hours

## 5. Database Migrations

Run once after first deploy:

```bash
cd apps/api
alembic upgrade head
```

Or rely on auto-create on startup (dev/small deployments).

## 6. Vercel — Frontend

1. Import GitHub repo
2. Set **Root Directory** to `apps/web`
3. Framework: Next.js
4. Install command: `npm install --legacy-peer-deps`
5. Environment variables:

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
NEXT_PUBLIC_API_URL=https://your-api.up.railway.app
```

6. Deploy

## 7. Custom Domain (Optional)

| Domain | Target |
|--------|--------|
| `lankajob.ai` | Vercel frontend |
| `api.lankajob.ai` | Railway API |

Update `CORS_ORIGINS` and Clerk allowed origins after adding domains.

## 8. Verify Deployment

1. Visit landing page — should load with dark gradient UI
2. Sign up via Clerk
3. Upload a CV on **My CV** page
4. Click **Analyze** then **Find Jobs**
5. Check **Job Matches** for scored results
6. Generate cover letter and interview prep

## 9. Monitoring

- Railway: Check `/health` endpoint returns `{"status":"ok"}`
- Worker logs: Confirm "Upserted N jobs" on scrape runs
- Vercel: Check function logs for API proxy errors

## Troubleshooting

| Issue | Fix |
|-------|-----|
| 401 on API calls | Verify Clerk JWT keys match; check token in Network tab |
| No job matches | Ensure worker ran; check `job_listings` table has rows |
| CV upload fails | Verify Supabase bucket exists and service key is correct |
| OpenAI errors | API works with fallback heuristics if key missing; add key for full AI |
