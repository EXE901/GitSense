# Deployment

GitSense splits cleanly into two deployable units: a Next.js
frontend and a FastAPI backend. PostgreSQL is the only required
external dependency. The AI provider is optional — the dashboard
falls back deterministically when no key is configured.

---

## Recommended stack

| Component  | Recommended host         | Why                                   |
| ---------- | ------------------------ | ------------------------------------- |
| Frontend   | Vercel                   | Native Next.js, edge caching          |
| Backend    | Render / Railway / Fly.io| Long-running Python, env management   |
| Database   | Supabase / Neon          | Managed Postgres with free tier       |
| AI provider| OpenRouter               | OpenAI-compatible, free DeepSeek tier |

---

## Backend

### 1. Provision Postgres

Create a database on Supabase, Neon, or any managed Postgres host.
Copy the connection string into `DATABASE_URL`.

### 2. Configure environment

Copy `backend/.env.example` to `.env` on the host (or use the
host's secret manager). Minimum required keys:

```env
DATABASE_URL=postgresql+asyncpg://...
JWT_SECRET_KEY=<long random secret>
GITHUB_CLIENT_ID=<github oauth app>
GITHUB_CLIENT_SECRET=<github oauth app>
GITHUB_REDIRECT_URI=https://<your-backend>/auth/oauth/github/callback
FRONTEND_GITHUB_CALLBACK_URL=https://<your-frontend>/auth/github/callback
GITHUB_TOKEN=<personal access token, optional but recommended>
OPENROUTER_API_KEY=<optional>
```

### 3. Run

```bash
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port $PORT --workers 2
```

For Render/Railway, set the start command to that line. For Docker,
the same command works inside a slim Python 3.12+ image.

### 4. CORS

`app/main.py` currently allows only `http://localhost:3000`. For
production, edit the `allow_origins` list to include your frontend
origin (or refactor to read from an env var; see roadmap).

---

## Frontend

### 1. Configure environment

```env
NEXT_PUBLIC_API_BASE_URL=https://<your-backend>
NEXT_PUBLIC_SITE_URL=https://<your-frontend>
```

### 2. Build

```bash
npm install
npm run build
npm run start   # or vercel deploy
```

On Vercel: import the `frontend/` directory as the project root,
set the two env vars above in the Vercel dashboard, and deploy.

---

## OAuth callbacks

GitHub and Google OAuth callbacks must be registered against the
**backend** origin, not the frontend origin:

- GitHub callback URL: `https://<backend>/auth/oauth/github/callback`
- Google callback URL: `https://<backend>/auth/oauth/google/callback`

The backend then redirects the user to the frontend
(`FRONTEND_GITHUB_CALLBACK_URL`) with the appropriate session
cookie set.

---

## Health checks

| Endpoint                           | Returns                          |
| ---------------------------------- | -------------------------------- |
| `GET /health`                      | `{"status":"healthy"}`           |
| `GET /ai/briefing` (no workspace)  | Deterministic no-data briefing   |

Use `/health` for the host's readiness probe; it never touches
the database or the AI provider.

---

## AI provider notes

- `OPENROUTER_API_KEY` is **optional**. If unset, every briefing
  falls back to the deterministic summarizer. The dashboard always
  renders.
- Free-tier providers (including OpenRouter's DeepSeek free model)
  may rate-limit or stall under sustained load. GitSense bounds
  every provider call with a 9 s SDK timeout plus a 10 s outer
  `asyncio.wait_for`. A stalled provider therefore degrades to the
  deterministic path in ~10 s, never longer.
- The briefing cache is process-local (90 s TTL). Behind multiple
  uvicorn workers, each worker maintains its own cache. This is
  acceptable for current scale; Redis is on the roadmap.

---

## Database migrations

The backend currently uses `init_db()` at startup (see
`backend/app/database/init_db.py`) to ensure required tables exist.
For schema changes in production, introduce Alembic — out of scope
for this initial deployment recipe.

---

## Smoke test after deploy

```bash
# 1. Health
curl -s https://<backend>/health
# -> {"status":"healthy"}

# 2. Public dashboard render
curl -sI https://<frontend>/dashboard?demo=1
# -> 200 OK

# 3. Briefing endpoint
curl -s https://<backend>/ai/briefing
# -> source=deterministic (no synced repositories yet)
```

If all three pass, the platform is live.
