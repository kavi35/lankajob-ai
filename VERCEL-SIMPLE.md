# Vercel-only deploy (no database)

Simple CV analyzer — works with **Vercel only**. No Railway, Supabase, or PostgreSQL.

## Flow

```
Upload CV  →  Read PDF  →  Extract Text  →  Analyze Skills  →  Match Score  →  Show Results
```

- CV data saved in **browser** (localStorage)
- PDF parsing runs on **Vercel serverless**
- Skills + match scores calculated in **browser**
- Jobs from TopJobs.lk (+ sample fallback)

## Deploy on Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New Project**
2. Import `kavi35/lankajob-ai`
3. **Root Directory:** `apps/web`
4. **Environment Variable:**
   ```
   NEXT_PUBLIC_STANDALONE=true
   ```
5. **Deploy** — done!

Do **not** set `NEXT_PUBLIC_API_URL`.

## Local test

```powershell
cd apps\web
# Create .env.local with:
# NEXT_PUBLIC_STANDALONE=true
npm run dev
```

Open http://localhost:3000/cv → upload a PDF → see skills + match scores.

## What you get

| Feature | Works? |
|---------|--------|
| PDF / DOCX upload | ✅ |
| Skill extraction | ✅ |
| Job match scores | ✅ |
| Save CV in cloud | ❌ (browser only) |
| User accounts (Clerk) | Optional |

## Upgrade later

When you want a real database, set `NEXT_PUBLIC_STANDALONE=false` and add Railway + Supabase (see README.md).
