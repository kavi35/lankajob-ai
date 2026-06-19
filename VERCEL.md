# Vercel Deploy — Important

## Required settings

In Vercel → Project → **Settings** → **General**:

| Setting | Value |
|---------|--------|
| Root Directory | `apps/web` |
| Production Branch | `main` |
| Framework | Next.js |

## Do NOT redeploy old failed builds

If logs show `Commit: ef903d2` — that is **old broken code**.

Always deploy latest commit from branch `main` (currently `7cf8bfa` or newer).

## Deploy latest code

1. Vercel Dashboard → your project
2. **Deployments** tab
3. Click **Create Deployment** (top right)
4. Select branch **`main`**
5. Confirm commit message includes **"Fix Vercel build"**
6. Click **Deploy**

## Verify success

Build log must show:

```
Commit: 7cf8bfa (or newer)
✓ Compiled successfully
```

## Environment variables (Vercel)

```
NEXT_PUBLIC_API_URL=https://your-backend-url.up.railway.app
```

Optional (Clerk auth):

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
```
