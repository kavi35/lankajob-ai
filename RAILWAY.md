# Railway — Deploy API Only (NOT the web app)

Vercel hosts the website. Railway must run **only** `apps/api` (Python FastAPI).

If Railway logs show `npm install` or `web@0.1.0` — **Root Directory is wrong**.

## Setup

1. Delete any Railway service named `web`
2. **New** → GitHub → `kavi35/lankajob-ai`
3. Rename service to **`api`**
4. **Settings** → **Root Directory** → `apps/api`
5. **Settings** → **Deploy** → Start Command:
   ```
   uvicorn app.main:app --host 0.0.0.0 --port $PORT
   ```
6. **Variables** — add Supabase + CORS (see README)
7. **Networking** → **Generate Domain**
8. Test: `https://YOUR-URL/health`

## Required env vars

```
DATABASE_URL=postgresql+asyncpg://...
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...
SUPABASE_STORAGE_BUCKET=cvs
CORS_ORIGINS=https://your-app.vercel.app
```

## Vercel

```
NEXT_PUBLIC_API_URL=https://YOUR-RAILWAY-URL
```
