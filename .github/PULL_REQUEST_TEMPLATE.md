## Summary

<!-- 1–3 sentences. What changed and why. -->

## Scope

- [ ] Bug fix
- [ ] Feature
- [ ] Refactor (no behavior change)
- [ ] Docs / repo hygiene
- [ ] Build / config

## Validation

Run all four locally and paste output (or confirm they exit 0):

- [ ] `python -m py_compile backend/app/main.py`
- [ ] `cd frontend && npx tsc --noEmit`
- [ ] `cd frontend && npx eslint .`
- [ ] `cd frontend && npx next build`

For UI changes, attach desktop (1440×900) and mobile (390×844)
screenshots.

## Architecture / AI safety checklist

- [ ] No new top-level dependencies (or justified in the
      description).
- [ ] No business logic added inside routes or page components.
- [ ] The deterministic fallback path still produces a valid
      response when the AI provider is removed.
- [ ] No fabricated metrics, no fake live streaming, no
      synthesized contributor / issue data.
- [ ] Provider isolation / timeout boundaries unchanged (or change
      is documented).

## Related issues

Closes #
