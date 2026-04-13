# PR 26 Review Follow-up

## Goal

- Address the approved high-signal PR 26 review feedback on `feat/25-design-tokens`.

## Approved Scope

- Translate remaining English inline comments in `tests/design-tokens.e2e.ts` to Korean.
- Translate the remaining English inline comment in `frontend/app/styles/tokens.css` to Korean.
- Align dark-mode `--shadow-float` with the documented on-surface tint rule.
- Expand `tests/design-tokens.e2e.ts` coverage for the token families introduced by PR 26.

## Explicit Non-Scope

- `docs/Design.md` fenced code language labels.
- `frontend/app/styles/global.css` blank line Stylelint nit.
- Adding a new `.stylelintrc.json` or other speculative Stylelint configuration.

## Notes

- Local checkout started on `main`; PR files are on branch `feat/25-design-tokens`.
- PR 26 repository is `cgm-16/weatherpane`.
- `pnpm exec playwright test tests/design-tokens.e2e.ts --reporter=line` passes after the fix, but the dev server logs a React hydration mismatch involving `<html class="dark">`. This appears to be pre-existing test/server output and is out of scope for the review-thread fix.
