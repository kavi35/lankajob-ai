# Railway deployment

This monorepo has two apps. Each Railway **service** must set **Root Directory** correctly.

| Service | Root Directory | Start command |
|---------|----------------|---------------|
| **web** (Next.js) | `apps/web` | `npm run start` |
| **api** (FastAPI) | `apps/api` | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |

---

## Web service (Next.js) — required settings

### 1. Root Directory (critical)

**Settings** → **Root Directory** → `apps/web`

If this is wrong, builds fail with errors like:
- `No start command detected`
- `ENOENT: no such file or directory, open '/app/package.json'`
- `Found workspace with 1 packages` + `--workspace=web` commands

### 2. Clear dashboard overrides

**Settings** → **Deploy** — remove custom commands that reference the monorepo root:
- Do **not** use `npm run build --workspace=web`
- Do **not** use `npm run start --workspace=web`
- Leave build/start **empty** (Railpack auto-detects from `apps/web/package.json`)

### 3. Remove bad env vars (if set)

Delete `RAILPACK_CONFIG_FILE` if it points outside `apps/web`.

### 4. Watch paths

If **Watch Paths** is set to `/apps/web/**`, that is fine. Root Directory must still be `apps/web`.

### 5. Env vars

Optional build-time variable if Tailwind/lightningcss fails:

```
NPM_CONFIG_PRODUCTION=false
```

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
NEXT_PUBLIC_API_URL=https://YOUR-API-RAILWAY-URL
```

**Networking** → **Generate Domain**

Config: `apps/web/railpack.json` (start command only), `apps/web/.npmrc`

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

---

## Vercel (alternative for web)

- Root Directory: `apps/web`
- `NEXT_PUBLIC_API_URL` → Railway API URL
