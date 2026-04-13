# Design Tokens Skill

## When to use this skill

- Adding a new color, radius, font, or shadow token
- Changing a theme color value
- Implementing a UI component that needs color or spacing tokens
- Troubleshooting why a Tailwind color utility renders incorrectly

## Inputs to inspect first

- `frontend/app/styles/tokens.css` — source of truth for all token values
- `docs/Design.md` — design philosophy, color system rationale, forbidden patterns
- `tests/design-tokens.e2e.ts` — live token assertions for both themes

## Hard rules

- Never add hardcoded hex values in component files. Always reference a token via a Tailwind utility (`bg-primary`, `text-foreground`, etc.) or `var(--token-name)`.
- Never create component-scoped CSS custom properties that duplicate semantic tokens.
- All new tokens go in `tokens.css`. No token definitions in `global.css` or component files.
- Both `@theme {}` (light default) and `.dark {}` (dark override) must be updated if the token differs between modes.
- Write a Playwright assertion in `tests/design-tokens.e2e.ts` for every new token in both modes.
- Token names must use shadcn kebab-case naming: `--color-*`, `--radius-*`, `--font-*`, `--shadow-*`.

## Execution checklist

### Adding a new token

1. Intent: Determine the token's semantic role and both theme values.
   Action: Read `docs/Design.md` and identify where the token fits in the surface hierarchy.
   Done-check: You can state the light value and dark value with source (Stitch design system or design doc).

2. Intent: Add the token to `@theme {}` (light default).
   Action: Edit `frontend/app/styles/tokens.css` — add `--token-name: <light-value>;` inside `@theme {}`, with a comment naming the Stitch role (e.g., `/* outline_variant */`).
   Done-check: Token appears in `@theme {}` with a comment.

3. Intent: Add the dark override to `.dark {}`.
   Action: Edit `frontend/app/styles/tokens.css` — add `--token-name: <dark-value>;` inside `.dark {}`.
   Done-check: Override appears in `.dark {}`. Skip this step only if the value is identical in both modes.

4. Intent: Write a failing test.
   Action: Add assertions for the new token in `tests/design-tokens.e2e.ts` — one in the Haet-Ssal describe block and one in the Dal-Bit Night describe block.
   Done-check: `pnpm exec playwright test tests/design-tokens.e2e.ts --reporter=line` fails with the new assertion.

5. Intent: Confirm the test passes after implementation.
   Action: Restart the dev server if already running, then re-run the Playwright tests.
   Done-check: All tests pass including the new assertions.

6. Intent: Update this skill file.
   Action: Add the new token to the relevant table in the `## Token reference` section below.
   Done-check: Table entry exists with correct value and use description.

### Changing an existing token value

1. Read `docs/Design.md` — confirm the change aligns with the design philosophy.
   Done-check: You can cite the reason for the change.
2. Edit the value in `tokens.css` (both `@theme {}` and `.dark {}` if applicable).
3. Update the matching assertion in `tests/design-tokens.e2e.ts` to the new value.
4. Run `pnpm exec playwright test tests/design-tokens.e2e.ts --reporter=line` — all tests pass.
5. Commit with `fix(tokens):` or `refactor(tokens):` scope.

## Verification

```bash
pnpm exec playwright test tests/design-tokens.e2e.ts --reporter=line
```

Expected: all assertions pass. Each test reads the computed CSS custom property value from the browser — a pass means the token is correctly applied in the live app.

Also run:

```bash
pnpm typecheck
pnpm build
```

Expected: no errors. The build output should include the font assets for Plus Jakarta Sans and Be Vietnam Pro.

## Stop and ask Ori

- Token value is not in `docs/Design.md` or the Stitch design systems (Haet-Ssal / Dal-Bit Night) — do not invent values.
- Proposed token overlaps with an existing one in a way that changes meaning — stop and clarify.
- A component needs a value that does not map cleanly to any semantic role — stop instead of adding a one-off token.

## Portability note

- Claude Code: use `Read` for file reads, `Edit` for targeted edits, `Bash` for `pnpm` and `git` commands.
- Codex: use `cat` / `rg` for file reads, direct file writes for edits, shell for `pnpm` and `git`.

---

## Token reference

### Semantic color tokens

| Token                                    | Light value           | Dark value            | Purpose                                              |
| ---------------------------------------- | --------------------- | --------------------- | ---------------------------------------------------- |
| `background` / `foreground`              | `#fcf9f8` / `#1b1c1c` | `#131313` / `#e5e2e1` | Page base and primary text                           |
| `card` / `card-foreground`               | `#ffffff` / `#1b1c1c` | `#1c1b1b` / `#e5e2e1` | Elevated surface containers                          |
| `popover` / `popover-foreground`         | `#ffffff` / `#1b1c1c` | `#20201f` / `#e5e2e1` | Floating overlays, tooltips                          |
| `primary` / `primary-foreground`         | `#ba0036` / `#ffffff` | `#ffb2b6` / `#68001a` | Brand action color (Rausch Red)                      |
| `secondary` / `secondary-foreground`     | `#5e5e5e` / `#ffffff` | `#ffb2b6` / `#67001a` | Supporting actions                                   |
| `accent` / `accent-foreground`           | `#eae7e7` / `#1b1c1c` | `#2a2a2a` / `#e5e2e1` | Hover states, subtle highlights                      |
| `muted` / `muted-foreground`             | `#f0eded` / `#5c3f41` | `#20201f` / `#e5bdbe` | De-emphasized content, labels                        |
| `destructive` / `destructive-foreground` | `#ba1a1a` / `#ffffff` | `#ffb4ab` / `#690005` | Error states                                         |
| `border`                                 | `#e5bdbe`             | `#5c3f41`             | Structural outlines (use sparingly — see Hard rules) |
| `input`                                  | `#f6f3f2`             | `#1c1b1b`             | Form input backgrounds                               |
| `ring`                                   | `#ba0036`             | `#ffb2b6`             | Focus ring color                                     |
| `tertiary`                               | `#006a45`             | `#62dca3`             | Emerald — weather condition status (good/hazard)     |
| `surface-container-highest`              | `#ffffff`             | (same)                | Glass base: light mode glassmorphism                 |
| `surface-bright`                         | `#f0eded`             | `#393939`             | Glass base: dark mode glassmorphism                  |

### Non-color tokens

| Token            | Value                                                           | Use                        |
| ---------------- | --------------------------------------------------------------- | -------------------------- |
| `--radius-sm`    | `0.5rem`                                                        | Buttons                    |
| `--radius-md`    | `1.5rem`                                                        | Cards, editorial tiles     |
| `--radius-lg`    | `2rem`                                                          | Modals, large panels       |
| `--radius-full`  | `9999px`                                                        | Chips, pills               |
| `--font-display` | Plus Jakarta Sans Variable                                      | Headlines, temperatures    |
| `--font-body`    | Be Vietnam Pro (light) / Plus Jakarta Sans (dark)               | Body text, labels          |
| `--font-sans`    | Alias of `--font-body` — Tailwind `font-sans` utility maps here | General sans-serif utility |
| `--shadow-float` | Three-layer ambient system                                      | Floating elements only     |

**Font note:** Be Vietnam Pro has no variable font upstream. Static weights 400 and 700 are imported. Use `font-sans` or `font-body` utility/token for body text; use `var(--font-display)` for headlines.
