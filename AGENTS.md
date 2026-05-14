# AGENTS.md

Workspace root for `Rollercoaster.dev-mobile`. Most agent work happens inside `apps/native-rd/` — start there.

## Where to go

| You want to…                       | Read                                                     |
| ---------------------------------- | -------------------------------------------------------- |
| Work on the app                    | `apps/native-rd/AGENTS.md`                               |
| Build for any target               | `apps/native-rd/CLAUDE.md` → `native-rd-build` skill     |
| Touch CI                           | `docs/architecture/ci-contract.md`, `.github/workflows/` |
| Touch the badge core / tokens      | `packages/openbadges-core/`, `packages/design-tokens/`   |
| Understand cross-cutting plans     | `docs/plans/active/`                                     |
| Understand how this repo was built | `docs/plans/completed/2026-05-14-mobile-extraction.md`   |

## Root-level conventions

- Bun 1.3.7 + Turborepo. Run tasks via `bun run <task>` from the root.
- `packages/openbadges-core` and `packages/design-tokens` are `workspace:*` consumers of each other and of `native-rd`.
- `openbadges-types` and `@rollercoaster-dev/rd-logger` are **registry** deps, not workspace packages.
- Plans live in `apps/native-rd/docs/plans/` (app-specific) or `docs/plans/` (cross-cutting infra).

## Git provenance

History was filtered from `openbadges-monorepo` on 2026-05-14. Cross-references to `apps/openbadges-*`, `packages/openbadges-ui`, `packages/shared-config`, or `packages/rd-logger` (as a workspace package) in older docs are historical — those siblings are not part of this repo.
