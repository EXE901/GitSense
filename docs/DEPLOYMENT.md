# Deployment

GitSense splits into two deployable units. PostgreSQL is the only
required external dependency. The AI provider is optional —
the dashboard falls back deterministically when no key is
configured.

**Production deployment targets**

| Component  | Host       | Public URL                  |
| ---------- | ---------- | --------------------------- |
| Frontend   | Vercel     | `https://gitsense.tech`     |
| Backend    | Railway    | `https://api.gitsense.tech` |
| Database   | Neon       | `*.neon.tech` (Postgres)    |
| AI provider| OpenRouter | `https://openrouter.ai`     |

---

## 1. Provision Postgres on Neon

1. Create a project on <https://neon.tech>.
2. Copy the **pooled** connection string and prefix the scheme
   with `postgresql+asyncpg://` for SQLAlchemy async:
   ```
   postgresql+asyncpg://<user>:<password>@<host>/<db>?sslmode=require
   ```
3. Save this as `DATABASE_URL` in the Railway service env.

---

## 2. Backend on Railway

### 2.1 Create the service

1. New Railway project → "Deploy from GitHub repo".
2. Select this repository, set the **root directory** to
   `backend/`.
3. Railway detects Python via `runtime.txt` and reads start
   configuration from `backend/railway.json` and `backend/Procfile`:
   ```
   uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
   ```
4. Health check path is `/health` (configured in `railway.json`).

### 2.2 Environment variables

Configure these in the Railway service's variables tab. See
[`backend/.env.example`](../backend/.env.example) for the
authoritative list. Production values:

```env
DATABASE_URL=postgresql+asyncpg://...neon.tech/...?sslmode=require
JWT_SECRET_KEY=<64+ char random string>
ACCESS_TOKEN_EXPIRE_MINUTES=60

CORS_ALLOW_ORIGINS=https://gitsense.tech,https://www.gitsense.tech

GITHUB_CLIENT_ID=<from github oauth app>
GITHUB_CLIENT_SECRET=<from github oauth app>
GITHUB_REDIRECT_URI=https://api.gitsense.tech/auth/oauth/github/callback
FRONTEND_GITHUB_CALLBACK_URL=https://gitsense.tech/auth/github/callback
GITHUB_TOKEN=<optional personal access token for higher rate limit>

GOOGLE_CLIENT_ID=<optional>
GOOGLE_CLIENT_SECRET=<optional>
GOOGLE_REDIRECT_URI=https://api.gitsense.tech/auth/oauth/google/callback

RESEND_API_KEY=<from resend.com>
RESEND_FROM_EMAIL=GitSense <no-reply@gitsense.tech>
FRONTEND_EMAIL_VERIFICATION_URL=https://gitsense.tech/login
FRONTEND_PASSWORD_RESET_URL=https://gitsense.tech/reset-password

OPENROUTER_API_KEY=<sk-or-v1-...>
OPENROUTER_MODEL=deepseek/deepseek-v4-flash:free
OPENROUTER_REFERER=https://gitsense.tech
OPENROUTER_APP_TITLE=GitSense
```

### 2.3 Public domain

In Railway's service settings, expose a public domain and
attach the custom domain `api.gitsense.tech`. Point a CNAME
DNS record at the Railway-provided target.

---

## 3. Frontend on Vercel

### 3.1 Import

1. Vercel dashboard → "Add New… → Project".
2. Import this repo with **Root Directory** = `frontend/`.
3. Framework preset: Next.js (auto-detected).

### 3.2 Environment variables

In the Vercel project settings (set for Production, Preview,
and Development as appropriate):

```env
NEXT_PUBLIC_API_BASE_URL=https://api.gitsense.tech
NEXT_PUBLIC_SITE_URL=https://gitsense.tech
```

### 3.3 Domain

Attach the custom domain `gitsense.tech` (and optionally
`www.gitsense.tech`) in Vercel → Domains.

---

## 4. GitHub OAuth app

Configure in <https://github.com/settings/applications/new>:

| Field                       | Value                                                      |
| --------------------------- | ---------------------------------------------------------- |
| Application name            | `GitSense`                                                 |
| Homepage URL                | `https://gitsense.tech`                                    |
| Authorization callback URL  | `https://api.gitsense.tech/auth/oauth/github/callback`     |

The callback **must point at the backend**, not the frontend.
The backend completes the OAuth handshake and then redirects
the browser to `FRONTEND_GITHUB_CALLBACK_URL` with a session
fragment.

For local development, create a separate OAuth app with:

| Field                       | Value                                                  |
| --------------------------- | ------------------------------------------------------ |
| Homepage URL                | `http://localhost:3000`                                |
| Authorization callback URL  | `http://localhost:8000/auth/oauth/github/callback`     |

GitHub does not allow multiple callback URLs per OAuth app
on the free tier — keep one app per environment.

---

## 5. Google OAuth (optional)

In Google Cloud Console → Credentials → OAuth 2.0 Client IDs:

- **Authorized redirect URIs**:
  - `https://api.gitsense.tech/auth/oauth/google/callback`
  - `http://localhost:8000/auth/oauth/google/callback` (dev)

- **Authorized JavaScript origins**:
  - `https://gitsense.tech`
  - `http://localhost:3000` (dev)

---

## 6. Health checks

| Endpoint                                 | Returns                          |
| ---------------------------------------- | -------------------------------- |
| `GET https://api.gitsense.tech/health`   | `{"status":"healthy"}`           |
| `GET https://api.gitsense.tech/ai/briefing` | Deterministic briefing payload |

Railway uses `/health` as the readiness probe; it never
touches the database or AI provider.

---

## 7. AI provider notes

- `OPENROUTER_API_KEY` is **optional**. Unset → deterministic
  fallback. The dashboard always renders.
- Provider calls are bounded by a 9 s SDK timeout and a 10 s
  outer `asyncio.wait_for`, shielded via `asyncio.shield`.
- The briefing cache is process-local (90 s TTL). Behind
  multiple uvicorn workers, each worker maintains its own
  cache. Acceptable for current scale; Redis is on the roadmap.

---

## 8. Database migrations

The backend currently calls `init_db()` at startup
(see [`backend/app/database/init_db.py`](../backend/app/database/init_db.py))
to ensure required tables exist. For schema changes in
production, introduce Alembic — out of scope for this initial
deployment recipe.

---

## 9. Smoke test after deploy

```bash
# 1. Health
curl -s https://api.gitsense.tech/health
# -> {"status":"healthy"}

# 2. Public dashboard renders
curl -sI https://gitsense.tech/dashboard?demo=1
# -> 200 OK

# 3. Briefing endpoint returns JSON
curl -s https://api.gitsense.tech/ai/briefing
# -> {"summary":"...","source":"deterministic",...}

# 4. CORS allows the frontend
curl -sI -H "Origin: https://gitsense.tech" \
     https://api.gitsense.tech/health
# -> access-control-allow-origin: https://gitsense.tech
```

If all four pass, the platform is live.

---

## 10. Cookies & cross-origin auth

GitSense's authenticated flow does **not** rely on
cross-origin cookies. The frontend stores its access token in
`localStorage` and sends it as an `Authorization: Bearer ...`
header. Guest sessions are sent as an `X-Guest-Session-Id`
header. The backend's optional `gitsense_guest_session_id`
cookie is a same-origin convenience only and is not required
for the production split between `gitsense.tech` and
`api.gitsense.tech`.
