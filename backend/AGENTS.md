# Backend Rules

## Backend Stack

- FastAPI
- PostgreSQL
- SQLAlchemy
- httpx
- async/await architecture

---

# Backend Architecture

Folder responsibilities:

- api/ -> route handlers only
- services/ -> business logic
- models/ -> SQLAlchemy models
- database/ -> DB setup/session management
- utils/ -> reusable helpers

---

# API Rules

- Keep routes thin
- Routes should orchestrate, not implement logic
- Use async endpoints
- Return structured JSON responses
- Use proper HTTP status codes
- Handle errors gracefully

---

# Service Layer Rules

- External API integrations belong in services/
- GitHub API logic belongs in github_service.py
- Services should remain modular and reusable
- Avoid giant service classes
- Keep external integrations isolated

---

# Database Rules

- Use PostgreSQL
- Use SQLAlchemy ORM
- Avoid raw SQL unless justified
- Keep models normalized
- Use migrations later
- Do not access DB directly from routes

---

# HTTP Rules

- Use httpx AsyncClient
- Use timeouts
- Handle rate limits properly
- Retry only when appropriate
- Validate external responses

---

# Async Rules

- Prefer async for IO-bound operations
- Avoid blocking calls inside async routes
- Avoid synchronous external requests

---

# Response Rules

- Responses should be predictable and structured
- Avoid inconsistent response formats
- Use pagination for large results

---

# Logging Rules

- Use structured logging later
- Avoid excessive print debugging
- Log failures clearly

---

# Error Handling Rules

- Fail gracefully
- Return meaningful error messages
- Avoid exposing internal implementation details

---

# Forbidden Patterns

- No business logic in routes
- No DB logic inside routes
- No giant monolithic files
- No synchronous GitHub API requests
- No duplicate helper functions
- No hardcoded credentials
- No mixed responsibilities inside services

---

# Future Scalability Goals

The backend should later support:
- analytics
- AI summarization
- issue clustering
- background jobs
- caching
- authentication
- browser extension integration