# Claude Code Instructions — Rollercoaster.dev Mobile

Workspace root. The app and the rules that govern it live one level down.

**Primary instruction file:** [`apps/native-rd/CLAUDE.md`](apps/native-rd/CLAUDE.md) — read first for hard rules, commands, design system, ND accessibility, and the `native-rd-build` skill pointer.

**Agent map:** [`AGENTS.md`](AGENTS.md) (this repo's root) and [`apps/native-rd/AGENTS.md`](apps/native-rd/AGENTS.md) (app scope).

## Hard rules at the root level

- **Never** add a workspace dependency on `@rollercoaster-dev/openbadges-types`, `@rollercoaster-dev/rd-logger`, or `@rollercoaster-dev/shared-config` — those are registry deps in this repo, not workspace packages.
- **Never** restore CI references to removed monorepo apps (`openbadges-system`, `openbadges-modular-server`, `openbadges-ui`).
- **DCO is mandatory.** Every non-merge commit on a PR to `main` needs a `Signed-off-by: <name> <email>` trailer (enforced by `.github/workflows/dco.yml`; rationale in `LICENSING.md`). The husky hook at `.husky/prepare-commit-msg` adds it automatically — run `bun install` after clone so husky activates. If you ever bypass hooks (`--no-verify`, amends in editors that strip trailers, web-UI suggestions), append the trailer manually before pushing. `format.signOff = true` in git config does **not** do this — it only affects `git format-patch`.
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
