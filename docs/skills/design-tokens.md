# Design Tokens Skill

## When to read this

Read this before: adding new colors, changing theme appearance, adding new UI components that need color/spacing tokens, or extending the token system.

## Token file location

`frontend/app/styles/tokens.css`

## Naming convention

All tokens use shadcn naming (kebab-case, `--color-*` prefix). This ensures compatibility with Tailwind v4 utilities (`bg-*`, `text-*`, `border-*`) and existing shadcn components.

## How tokens work in Tailwind v4

`@theme { --color-primary: #ba0036; }` generates:
- CSS custom property on `:root`
- Utilities: `bg-primary`, `text-primary`, `border-primary`, `ring-primary`, etc.

`.dark { --color-primary: #ffb2b6; }` overrides the CSS custom property at runtime when `.dark` is on `<html>`.

## Semantic color roles

| Token | Purpose |
|---|---|
| `background` / `foreground` | Page base and primary text |
| `card` / `card-foreground` | Elevated surface containers |
| `popover` / `popover-foreground` | Floating overlays, tooltips |
| `primary` / `primary-foreground` | Brand action color (Rausch Red) |
| `secondary` / `secondary-foreground` | Supporting actions |
| `accent` / `accent-foreground` | Hover states, subtle highlights |
| `muted` / `muted-foreground` | De-emphasized content, labels |
| `destructive` / `destructive-foreground` | Error states |
| `border` | Structural outlines (use sparingly) |
| `input` | Form input backgrounds |
| `ring` | Focus ring color |

## Non-color tokens

| Token | Value | Use |
|---|---|---|
| `--radius-sm` | `0.5rem` | Buttons |
| `--radius-md` | `1.5rem` | Cards, editorial tiles |
| `--radius-lg` | `2rem` | Modals, large panels |
| `--radius-full` | `9999px` | Chips, pills |
| `--font-display` | Plus Jakarta Sans Variable | Headlines, temperatures |
| `--font-body` | Be Vietnam Pro (light) / Plus Jakarta Sans (dark) | Body text, labels |
| `--font-sans` | Alias of `--font-body` — Tailwind `font-sans` utility maps here | General sans-serif utility |
| `--shadow-float` | Three-layer ambient system | Floating elements only |

## Font notes

Be Vietnam Pro has no variable font upstream. Static weights 400 and 700 are imported in `global.css`. Use the `font-body` token or `font-sans` utility for body text; use `font-display` for headlines.

## Design rules enforced by tokens

- **No-line rule**: Use `bg-muted` / `bg-card` color shifts for visual separation, never borders.
- **Shadow rule**: `shadow-float` only on truly floating elements. Flat cards get no shadow.
- **Radius consistency**: Always use a token — never arbitrary px values for border-radius.

## Adding new tokens

1. Add to `@theme {}` in `tokens.css` with a clear comment.
2. Add the dark-mode override in `.dark {}` if the value differs.
3. Update this skill file with the new token in the relevant table above.
4. Write a Playwright assertion in `tests/design-tokens.e2e.ts` to verify both modes.

## Do NOT

- Add hardcoded hex values in component files — always reference a token.
- Create component-scoped CSS custom properties that duplicate semantic tokens.
- Use `--color-*` tokens outside of `tokens.css` except through Tailwind utilities.
