# Railway deployment

This monorepo has two apps. Each Railway **service** must set **Root Directory** to the correct folder.

| Service | Root Directory | Start command |
|---------|----------------|---------------|
| **web** (Next.js) | `apps/web` | `npm run start` |
| **api** (FastAPI) | `apps/api` | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |

If Root Directory is wrong, builds fail (e.g. "no start script" at repo root, or `npm install` peer errors).

---

## Web service (Next.js)

**If logs say `Found workspace with 1 packages`**, Railway is building from the **repo root**, not `apps/web`.

### Option A — Root Directory `apps/web` (recommended)

1. **Settings** → **Root Directory** → `apps/web`
2. **Settings** → **Deploy** — clear custom `--workspace=web` commands:
   - Build: `npm run build` (or leave empty)
   - Start: `npm run start`
3. Railpack reads `apps/web/railpack.json` automatically.

### Option B — Repo root (monorepo)

If Root Directory is blank or `/`, the repo includes `railpack.json` at the root with:
- Build: `npm run build --workspace=web`
- Start: `npm run start --workspace=web`

### Env vars (web service)

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
NEXT_PUBLIC_API_URL=https://YOUR-API-RAILWAY-URL
```

**Networking** → **Generate Domain**

Config files: `railpack.json` (root or `apps/web`), `apps/web/railway.toml`

---

## API service (FastAPI)

1. **Settings** → **Root Directory** → `apps/api`
2. **Settings** → **Deploy** → Start Command:
   ```
   uvicorn app.main:app --host 0.0.0.0 --port $PORT
   ```
3. **Variables**:
   ```
   DATABASE_URL=postgresql+asyncpg://...
   SUPABASE_URL=https://xxx.supabase.co
   SUPABASE_SERVICE_KEY=eyJ...
   SUPABASE_STORAGE_BUCKET=cvs
   CORS_ORIGINS=https://your-web-url
   ```
4. **Networking** → **Generate Domain**
5. Test: `https://YOUR-API-URL/health`

Config files: `apps/api/railway.toml`, `apps/api/nixpacks.toml`

---

## Vercel (alternative for web)

You can host the frontend on Vercel instead of Railway:

- Root Directory: `apps/web`
- `NEXT_PUBLIC_API_URL` → Railway API URL
