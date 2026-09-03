# baptism-invite-app

Mobile-first baptism invitation web app with schedule, map links, and dual-access theme settings.

## Access modes (owner link vs guest link)

| Who | URL | Settings |
|-----|-----|----------|
| **Owner (admin)** | `https://your-app.vercel.app/?admin=YOUR_TOKEN` | Full theme editor + save/delete palettes |
| **Guest** | `https://your-app.vercel.app/` | Pick from Jednobarwne / Wielobarwne palettes you saved |

The `?admin=` token is verified server-side, then stripped from the address bar and kept only in `sessionStorage` — nothing admin-related is shown in the guest UI.

## Setup

Requires Node 20+.

```bash
cd ~/Documents/GitHub/baptism-invite-app
cp apps/web/.env.local.example apps/web/.env.local
# edit ADMIN_TOKEN
npm install
npm run dev
```

- Guest: http://localhost:5177/
- Owner: http://localhost:5177/?admin=maja-owner (or whatever you set in `.env.local`)

Locally, palettes are stored in `apps/web/data/palettes.json` so saves persist for anyone hitting the same machine.

## Vercel (shared palettes for real guests)

1. Project **Root Directory** = `apps/web`
2. Environment variables:
   - `ADMIN_TOKEN` — same secret as in your owner link
   - `BLOB_READ_WRITE_TOKEN` — from a [Vercel Blob](https://vercel.com/docs/storage/vercel-blob) store (required for production saves that guests can see)
3. Redeploy after setting env vars

Without Blob on Vercel, guests still see the seed palettes, but admin **save/delete** returns an error until Blob is connected.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Build tokens + start Vite (includes `/api/*` middleware) |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm run typecheck` | TypeScript check |
