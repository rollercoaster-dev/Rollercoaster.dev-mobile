# AGENTS.md

Workspace root for `Rollercoaster.dev-mobile`. Most agent work happens inside `apps/native-rd/` — start there.

## Where to go

| You want to…                       | Read                                                       |
| ---------------------------------- | ---------------------------------------------------------- |
| Work on the app                    | `apps/native-rd/AGENTS.md`                                 |
| Build for any target               | `native-rd-build` skill (`apps/native-rd/.claude/skills/`) |
| Touch CI                           | `docs/architecture/ci-contract.md`, `.github/workflows/`   |
| Touch the badge core / tokens      | `packages/openbadges-core/`, `packages/design-tokens/`     |
| Understand cross-cutting plans     | `docs/plans/active/`                                       |
| Understand how this repo was built | `docs/plans/completed/2026-05-14-mobile-extraction.md`     |

## Hard rules

- **Never** add a workspace dependency on `@rollercoaster-dev/openbadges-types`, `@rollercoaster-dev/rd-logger`, or `@rollercoaster-dev/shared-config` — those are registry deps in this repo, not workspace packages.
- **Never** restore CI references to removed monorepo apps (`openbadges-system`, `openbadges-modular-server`, `openbadges-ui`).
- **DCO is mandatory.** Every non-merge commit on a PR to `main` needs a `Signed-off-by: <name> <email>` trailer (enforced by `.github/workflows/dco.yml`; rationale in `LICENSING.md`). The husky hook at `.husky/prepare-commit-msg` adds it automatically — run `bun install` after clone so husky activates. If you ever bypass hooks (`--no-verify`, amends in editors that strip trailers, web-UI suggestions), append the trailer manually before pushing. `format.signOff = true` in git config does **not** do this — it only affects `git format-patch`.
- **Commit identity is personal, never the employer.** This is Joe's personal project; the sign-off email must come from the repo's own `git config user.email` (`joe.czar@outlook.com`). An agent's session context may also carry the employer **account** email — that is not the commit identity, and it must never be written out here (or anywhere in this repo): never in a commit, `Signed-off-by:` trailer, PR body, config, or doc. A DCO sign-off certifies who is contributing, so an employer address on personal work wrongly implies employer involvement. Letting the husky hook add the trailer gets this right automatically, which is another reason not to use `--no-verify`.

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

Everything else (Jest patterns, Storybook, EAS, design system) is in `apps/native-rd/AGENTS.md`.

## Root-level conventions

- Agent instructions live in `AGENTS.md`. Every `CLAUDE.md` contains only `@AGENTS.md` (Claude Code's import), so Claude and Codex read the same file — never add instructions to a `CLAUDE.md`.
- Bun 1.3.7 + Turborepo. Run tasks via `bun run <task>` from the root.
- `packages/openbadges-core` and `packages/design-tokens` are `workspace:*` consumers of each other and of `native-rd`.
- `openbadges-types` and `@rollercoaster-dev/rd-logger` are **registry** deps, not workspace packages.
- Plans live in `apps/native-rd/docs/plans/` (app-specific) or `docs/plans/` (cross-cutting infra).

## Git provenance

History was filtered from `openbadges-monorepo` on 2026-05-14. Cross-references to `apps/openbadges-*`, `packages/openbadges-ui`, `packages/shared-config`, or `packages/rd-logger` (as a workspace package) in older docs are historical — those siblings are not part of this repo.
