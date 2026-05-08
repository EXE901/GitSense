# GitHub Issue Intelligence - Global Rules

## Project Overview

This project is a fullstack GitHub issue analytics and intelligence platform.

Primary goals:
- Clean architecture
- Modular services
- Async-first backend
- Scalable frontend/backend separation
- AI-assisted development with minimal hallucinations
- Production-ready deployment
- Free/open-source friendly stack

---

# Tech Stack

Frontend:
- Next.js App Router
- TypeScript
- Tailwind CSS

Backend:
- FastAPI
- PostgreSQL
- SQLAlchemy
- httpx

Infrastructure:
- Docker
- Vercel
- Render/Railway
- Supabase or Neon

---

# Core Engineering Principles

- Prefer simplicity over premature optimization
- Prefer readability over cleverness
- Keep architecture modular
- Avoid tightly coupled code
- Build scalable foundations first
- Prefer explicit logic over magic abstractions

---

# AI Agent Operating Rules

Before implementing changes:
1. Briefly explain planned changes
2. Modify only relevant files
3. Avoid unrelated refactors
4. Preserve existing architecture
5. Keep commits focused and atomic

If uncertain:
- do not invent APIs
- do not invent library behavior
- do not fabricate configuration
- leave comments instead of hallucinating

---

# Architecture Rules

- Frontend and backend must remain separated
- Business logic must not exist inside routes or UI components
- Shared utilities belong in utils/ or lib/
- Keep files focused on single responsibilities
- Prefer service-oriented architecture

---

# Dependency Rules

- Avoid unnecessary dependencies
- Prefer built-in functionality when reasonable
- Explain justification before introducing large libraries
- Do not replace existing libraries without reason

---

# Security Rules

- Never hardcode secrets
- Use environment variables
- Never expose backend secrets to frontend
- Validate external input
- Sanitize user-provided values
- Handle API failures gracefully

---

# Performance Rules

- Prefer async operations for IO/network calls
- Use pagination for large datasets
- Avoid unnecessary re-renders
- Avoid unnecessary API requests
- Avoid loading massive datasets into memory

---

# Naming Conventions

Python:
- snake_case for variables/functions
- PascalCase for classes

TypeScript:
- camelCase for variables/functions
- PascalCase for components/types

Files:
- descriptive names
- avoid vague names like utils2.py or helperFinal.ts

---

# Forbidden Patterns

- No giant god files
- No duplicated logic
- No business logic in UI
- No business logic in API routes
- No synchronous external API calls
- No hardcoded secrets
- No unnecessary abstractions
- No uncontrolled global state
- No random architectural rewrites

---

# Code Quality Rules

- Use type hints where appropriate
- Keep functions small and focused
- Use meaningful variable names
- Add comments only when necessary
- Avoid deeply nested logic
- Prefer composition over inheritance

---

# AI Coding Workflow

Preferred workflow:
- Human controls architecture
- AI assists implementation
- Small bounded tasks only
- Review generated code before accepting

Preferred prompt style:
- specify scope
- specify allowed files
- specify restrictions
- specify expected behavior