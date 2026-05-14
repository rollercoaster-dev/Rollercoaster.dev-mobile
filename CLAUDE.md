# Claude Code Instructions — Rollercoaster.dev Mobile

Workspace root. The app and the rules that govern it live one level down.

**Primary instruction file:** [`apps/native-rd/CLAUDE.md`](apps/native-rd/CLAUDE.md) — read first for hard rules, commands, design system, ND accessibility, and the `native-rd-build` skill pointer.

**Agent map:** [`AGENTS.md`](AGENTS.md) (this repo's root) and [`apps/native-rd/AGENTS.md`](apps/native-rd/AGENTS.md) (app scope).

## Hard rules at the root level

- **Never** add a workspace dependency on `@rollercoaster-dev/openbadges-types`, `@rollercoaster-dev/rd-logger`, or `@rollercoaster-dev/shared-config` — those are registry deps in this repo, not workspace packages.
- **Never** restore CI references to removed monorepo apps (`openbadges-system`, `openbadges-modular-server`, `openbadges-ui`).
- Workspace commands live in root `package.json`: `bun run native:ios`, `bun run native:android`, `bun run type-check`, `bun run lint`, `bun run test`.

## Root commands

| Task      | Command                  |
| --------- | ------------------------ |
| Install   | `bun install`            |
| Build all | `bun run build`          |
| Typecheck | `bun run type-check`     |
| Lint      | `bun run lint`           |
| Test      | `bun run test`           |
| iOS sim   | `bun run native:ios`     |
| Android   | `bun run native:android` |

Everything else (Jest patterns, Storybook, EAS, design system) is in `apps/native-rd/CLAUDE.md`.
