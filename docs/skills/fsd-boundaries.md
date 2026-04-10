# FSD boundaries

## Hard rules
- Respect Feature-Sliced Design boundaries
- No ad hoc cross-imports between sibling features
- Shared primitives go under `shared/`
- Domain entities go under `entities/`
- UI composition lives in widgets/pages, not low-level shared modules

## Review checklist
- Did this change create a forbidden deep import?
- Did it move business logic into presentation-only layers?
- Did it bypass the agreed folder ownership?
