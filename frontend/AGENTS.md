<!-- BEGIN:nextjs-agent-rules -->
# Frontend Rules

## Frontend Stack

- Next.js App Router
- TypeScript
- Tailwind CSS

---

# Frontend Architecture

Folder responsibilities:

- app/ -> routes/pages/layouts
- components/ -> reusable UI components
- lib/ -> utilities/API helpers
- public/ -> static assets

---

# React Rules

- Use functional components only
- Prefer server components unless interactivity is needed
- Keep components small and reusable
- Avoid prop drilling when possible
- Avoid deeply nested component trees

---

# State Management Rules

- Use local state when possible
- Avoid unnecessary global state
- Keep state predictable and minimal
- Do not introduce state libraries prematurely

---

# UI Rules

- Use clean minimal UI
- Maintain responsive layouts
- Keep spacing/layout consistent
- Prefer accessibility-friendly components
- Avoid excessive animations
- Prefer readable interfaces over flashy effects

---

# Styling Rules

- Use Tailwind CSS
- Avoid large inline style objects
- Reuse utility patterns consistently
- Keep styling maintainable

---

# API Rules

- Keep API logic inside lib/
- Do not hardcode backend URLs
- Use environment variables
- Handle loading/error states properly
- Avoid duplicate fetch logic

---

# Performance Rules

- Avoid unnecessary re-renders
- Optimize large lists/tables
- Use memoization only when justified
- Avoid unnecessary client-side rendering

---

# Component Rules

- Components should have single responsibilities
- Avoid giant page components
- Extract reusable UI patterns
- Prefer composition over inheritance

---

# Accessibility Rules

- Use semantic HTML
- Ensure keyboard accessibility
- Maintain readable contrast/layout
- Add labels where appropriate

---

# Forbidden Patterns

- No giant components
- No duplicated UI logic
- No unnecessary abstractions
- No random custom hooks
- No hardcoded API URLs
- No excessive global state
- No mixing API logic into UI components

---

# Future Frontend Goals

Frontend should later support:
- analytics dashboard
- issue filtering
- charts/visualizations
- AI summaries
- export tools
- GitHub OAuth
- browser extension integration
<!-- END:nextjs-agent-rules -->
