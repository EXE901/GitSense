# Contributing to GitSense

GitSense is an internal workflow intelligence platform. This guide
keeps contributions tight, deterministic, and aligned.

---


## Development setup

```bash
# Backend
cd backend
python -m venv venv
. venv/Scripts/activate     # Windows
pip install -r requirements.txt
cp .env.example .env        # fill secrets
uvicorn app.main:app --reload

# Frontend (in a separate shell)
cd frontend
npm install
echo "NEXT_PUBLIC_API_BASE_URL=http://localhost:8000" > .env.local
npm run dev
```

Backend: <http://localhost:8000>. Frontend: <http://localhost:3000>.

---

## What good contributions look like

- **Small, focused, atomic.** One concern per pull request.
- **Architecture preserved.** No giant refactors, no rewrites of
  the AI layer, no new infra dependencies introduced casually.
- **Grounded in real data.** Never fake metrics. Never seed
  numbers to make the demo look richer.
- **Type-safe.** TypeScript strict mode; Python type hints where
  appropriate.
- **Quiet.** No `console.log`, no `print()`, no `TODO` /
  `FIXME` left behind.
- **Sanitized.** Any user-controlled string that lands in HTML,
  CSV, JSON, or Markdown must go through `lib/share-safety.ts`
  (frontend) or appropriate backend sanitization.

---

## Validation before opening a PR

Run all four locally; they must all exit with status 0:

```bash
# Backend syntax
python -m py_compile backend/app/main.py
python -m py_compile backend/app/services/ai_briefing_service.py

# Frontend
cd frontend
npx tsc --noEmit
npx eslint .
npx next build
```

If the change touches UI, capture before/after screenshots at
desktop (1440×900) and mobile (390×844). Include them in the PR
description.

---

## Commit messages

Keep the subject under 72 chars and write in imperative mood:

```
fix(ai-briefing): enforce 10s outer asyncio timeout boundary
feat(dashboard): add first-sync onboarding guidance
chore(repo): quarantine unused public placeholders
docs(readme): document AI grounding contract
```

---

## Pull request checklist

Before requesting review, confirm:

- [ ] Scope matches an open issue or has been agreed in advance.
- [ ] No new top-level dependencies without justification.
- [ ] No business logic in routes / pages — services and `lib/`
      only.
- [ ] AI fallback path still works (verified locally with provider
      key removed).
- [ ] `npx tsc --noEmit && npx eslint . && npx next build` are
      clean.
- [ ] Backend `py_compile` is clean for any modified Python file.
- [ ] No secrets, cookies, screenshots, or local DB files added
      to the repository.

---

## Reporting bugs / proposing features

Open an issue using the templates in
[`.github/ISSUE_TEMPLATE/`](.github/ISSUE_TEMPLATE). Include:

- Steps to reproduce (for bugs).
- Expected vs actual behavior.
- Whether the AI provider was reachable when the issue occurred.
- Browser + OS for frontend issues.

For features, describe the operational problem you are trying to
solve. Avoid feature ideas that require fabricating data.
