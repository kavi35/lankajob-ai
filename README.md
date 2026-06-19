# LankaJob AI

AI-powered job matching platform for Sri Lankan job seekers.

## Stack

- **Frontend:** Next.js 15, TypeScript, Tailwind CSS, Shadcn-style UI, Framer Motion, Recharts, Clerk Auth
- **Backend:** FastAPI, LangGraph, OpenAI GPT, PostgreSQL (Supabase)
- **Storage:** Supabase Storage (CV files)
- **Deploy:** Vercel (web) + Railway (API + worker)

## Project Structure

```
apps/web/     Next.js frontend
apps/api/     FastAPI backend + LangGraph agents + scrapers
docker-compose.yml   Local Postgres + API + worker
```

## Quick Start (Local)

**No Docker?** The API defaults to SQLite (`apps/api/lankajob.db`) — you can skip Postgres entirely for local dev.

### 1. Environment

Copy `.env.example` to `apps/api/.env` and `apps/web/.env.local`, then fill in keys.

### 2. Start API (PowerShell)

```powershell
cd apps\api
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### 3. Start frontend (new terminal, PowerShell)

```powershell
cd apps\web
npm install --legacy-peer-deps
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Optional: PostgreSQL via Docker

Start **Docker Desktop** first, then:

```powershell
docker compose up -d postgres
```

Set in `apps/api/.env`:

```
DATABASE_URL=postgresql+asyncpg://lankajob:lankajob@localhost:5432/lankajob
```

### 4. Optional: Background worker

```bash
cd apps/api
python -m app.workers.scheduler
```

## API Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/v1/cv/upload` | Upload CV |
| POST | `/api/v1/cv/{id}/analyze` | Analyze CV with AI |
| POST | `/api/v1/sessions` | Start job matching session |
| GET | `/api/v1/matches` | List job matches |
| POST | `/api/v1/matches/{id}/cover-letter` | Generate cover letter |
| POST | `/api/v1/matches/{id}/interview-prep` | Generate interview Q&A |
| GET | `/api/v1/skills/gaps` | Skill gap analysis |
| GET | `/health` | Health check |

## Deployment

### Vercel only (no database — simplest)

Works without Railway, Supabase, or PostgreSQL. CV data stays in the browser; jobs are scraped from TopJobs.lk via Vercel serverless functions.

1. Import repo on [Vercel](https://vercel.com), set **Root Directory** to `apps/web`
2. Environment variables:
   ```
   NEXT_PUBLIC_STANDALONE=true
   ```
   Do **not** set `NEXT_PUBLIC_API_URL` (or leave it empty).
3. Deploy — done.

Optional: add Clerk keys for sign-in. Without Clerk, the app runs in open dev mode.

### Vercel + Railway + Supabase (full stack)

For persistent CV storage, PostgreSQL, and background job scraping:

#### Vercel (Frontend)

1. Import repo, set root directory to `apps/web`
2. Add env vars: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `NEXT_PUBLIC_API_URL`
3. Set `NEXT_PUBLIC_STANDALONE=false`
4. Deploy

#### Railway (Backend)

1. Create service from `apps/api/Dockerfile`
2. Add PostgreSQL plugin or Supabase `DATABASE_URL`
3. Set env vars from `.env.example`
4. Deploy API service: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Deploy worker service: `python -m app.workers.scheduler`

### Supabase

1. Create project + `cvs` storage bucket (private)
2. Use pooler connection string for `DATABASE_URL`
3. Run migrations: `cd apps/api && alembic upgrade head`

### Clerk

1. Create app, enable Email/Google OAuth
2. Set sign-in/sign-up URLs for your Vercel domain
3. Copy JWKS URL and issuer to backend env

## Dev Mode (No Clerk)

If `CLERK_JWKS_URL` is empty, the API accepts requests without JWT and uses a dev user.

## License

MIT
# ai-job-finder
