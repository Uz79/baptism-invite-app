# baptism-invite-app

Mobile-first baptism invitation web app with schedule, map links, and theme customization.

Built on the [cartography-lab-app](https://github.com/Uz79/cartography-lab-app) design system (`@cartography-lab/tokens`, `@cartography-lab/ui`).

## Setup

Requires Node 20+ and a sibling checkout of `cartography-lab-app`:

```
~/Documents/GitHub/
  cartography-lab-app/
  baptism-invite-app/   ← this repo
```

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
| `npm run typecheck` | TypeScript check |
