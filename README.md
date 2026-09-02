# baptism-invite-app

Mobile-first baptism invitation web app with schedule, map links, and theme customization.

Built on the vendored `@cartography-lab/tokens` and `@cartography-lab/ui` packages in this monorepo.

## Setup

Requires Node 20+.

```bash
cd ~/Documents/GitHub/baptism-invite-app
npm install
npm run dev
```

Dev server: http://localhost:5177/

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Build tokens + start Vite dev server |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm run typecheck` | TypeScript check (web + UI package) |

## Vercel

**Important:** When redeploying, pick the latest commit on `main` (`Fix Vercel build: generate token CSS before Vite build.`) — do not “Redeploy” an older failed deployment.

If the Vercel project uses **Root Directory = `apps/web`** (common for `baptism-invite-app-web`), `apps/web/vercel.json` runs `npm install` from the monorepo root so workspace packages link correctly.

If **Root Directory** is the repo root, the root `vercel.json` applies instead:

- `installCommand`: `npm install` (workspace root — links `packages/*`)
- `buildCommand`: `npm run build` (tokens + web app)
- `outputDirectory`: `apps/web/dist`
