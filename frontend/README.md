# GitSense — Frontend

Next.js App Router frontend for the GitSense engineering intelligence
platform.

For the full architecture overview, see the repository root
[`README.md`](../README.md).

---

## Tech stack

- Next.js 16 (App Router, server components)
- TypeScript
- Tailwind CSS 4
- `lucide-react` icons
- `recharts` for chart visualizations

---

## Development

```bash
npm install
echo "NEXT_PUBLIC_API_BASE_URL=http://localhost:8000" > .env.local
npm run dev
```

App runs at `http://localhost:3000`. The backend must be reachable
at `NEXT_PUBLIC_API_BASE_URL`.

### Optional env

| Variable                  | Default                      | Purpose                         |
| ------------------------- | ---------------------------- | ------------------------------- |
| `NEXT_PUBLIC_API_BASE_URL`| `""` (same-origin)           | Backend base URL                |
| `NEXT_PUBLIC_SITE_URL`    | `https://gitsense.app` in    | Used by `metadataBase` for      |
|                           | production                   | absolute OG / Twitter image URLs|

---

## Scripts

| Command         | What it does                              |
| --------------- | ----------------------------------------- |
| `npm run dev`   | Dev server with HMR (`next dev --webpack`)|
| `npm run build` | Production build (`next build --webpack`) |
| `npm run start` | Run production build                      |
| `npm run lint`  | ESLint over the workspace                 |

To typecheck without building: `npx tsc --noEmit`.

---

## Folder layout

```
src/
├── app/
│   ├── (app)/                Authenticated routes (dashboard,
│   │                          analytics, settings, etc.)
│   ├── (auth)/               Sign-in / sign-up / reset / OAuth
│   ├── globals.css           Tailwind + design tokens
│   ├── layout.tsx            Root layout + metadata + theme bootstrap
│   └── page.tsx              Landing page
├── components/
│   ├── auth/                 Auth forms, OAuth buttons, providers
│   ├── branding/             Product logo / wordmark
│   ├── dashboard/            Briefing, health, insights, charts,
│   │                          heatmap, issues feed, filter bar, etc.
│   ├── landing/              Marketing sections
│   ├── layout/               App / auth layouts, scroll restoration
│   ├── settings/             Settings page client
│   ├── theme/                Theme provider + toggle
│   └── topbar/               Export, share, notifications popovers
├── hooks/
│   └── use-active-section.ts
└── lib/                      API clients, shared types, share/export
                              sanitization, theme helpers
```

---

## Branding

All app icons, favicon, and OG/Twitter images resolve to a single
asset: `public/logos/symbol.svg`. Do not introduce alternate
favicons or icon variants without updating the `metadata.icons`
block in `src/app/layout.tsx`.

---

## Notes

- This project follows the rules in [`AGENTS.md`](./AGENTS.md).
  Frontend changes should keep components small, prefer server
  components when interactivity is not needed, and never embed
  business logic in routes.
- The AI briefing card (`components/dashboard/briefing-card.tsx`)
  reads from the FastAPI `/ai/briefing` endpoint. It expects the
  backend to enforce its own timeout + deterministic fallback.
