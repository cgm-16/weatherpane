# Superpowers install notes

## 2026-04-10

- User requested: fetch and follow `https://raw.githubusercontent.com/obra/superpowers/refs/heads/main/.codex/INSTALL.md`.
- Remote instructions require:
- clone `https://github.com/obra/superpowers.git` to `~/.codex/superpowers`
- create symlink `~/.agents/skills/superpowers -> ~/.codex/superpowers/skills`
- restart Codex
- Current local state before install:
- `~/.codex` exists
- `~/.codex/superpowers` does not exist
- `~/.agents` does not exist
- Need to check for old bootstrap references in `~/.codex/AGENTS.md` before finishing migration validation.
- Required writes are outside the repo sandbox, so installation needs escalated shell commands.
- Migration validation result:
- `~/.codex/AGENTS.md` has no `superpowers` bootstrap block to remove.
- Install result:
- cloned repo to `~/.codex/superpowers`
- symlink created: `~/.agents/skills/superpowers -> /Users/ori/.codex/superpowers/skills`
- cloned repo HEAD: `917e5f5`
- Remaining manual follow-up from upstream instructions: restart Codex so it discovers the new skills.
