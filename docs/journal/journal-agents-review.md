# AGENTS review notes

## 2026-04-10

- Task: review merged `AGENTS.md` and suggest a cleaner split between project-local and reusable global instructions.
- Observed split point: project-specific Weatherpane rules are lines 1-96; generic reusable context begins after `<!-- User context start -->`.
- Noted duplication/conflict candidates:
- branch base differs: project block says branch from `main`; generic block says always use `dev` for preflight sync.
- testing guidance differs: project block says use mocks by default in tests/local demo; generic block forbids mocks in e2e and mandates TDD for all work.
- issue/PR workflow in generic block is broader and may over-constrain simple local tasks.
- hardcoded names to generalize: `Ori`, `Codex`, Weatherpane specifics should either stay local or move to variables/placeholders.
- Structural issue: duplicate `<!-- User context start -->` marker appears twice.
