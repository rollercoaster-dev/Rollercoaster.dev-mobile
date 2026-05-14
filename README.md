# Rollercoaster.dev Mobile

Mobile app and shared badge packages for [Rollercoaster.dev](https://rollercoaster.dev) — a personal learning and goal tracking app for neurodivergent users.

Extracted from [`openbadges-monorepo`](https://github.com/rollercoaster-dev/openbadges-monorepo) on 2026-05-14 with Git history preserved via `git filter-repo`.

## Layout

```
apps/
  native-rd/         React Native / Expo app (see apps/native-rd/README.md)
packages/
  openbadges-core/   Credential building, Ed25519 signing, PNG baking
  design-tokens/     Style Dictionary tokens (Unistyles export for RN)
docs/                Cross-cutting plans + architecture (CI contract, E2E runner)
```

App-specific docs and plans live under `apps/native-rd/docs/`.

## Quick start

```bash
bun install
bun run native:ios       # iOS simulator
bun run native:android   # Android device/emulator
```

Workspace tasks:

```bash
bun run build            # build packages, then native-rd
bun run type-check
bun run lint
bun run test
```

## Where to look

| Topic                  | Path                                                      |
| ---------------------- | --------------------------------------------------------- |
| App-level instructions | `apps/native-rd/AGENTS.md`, `apps/native-rd/CLAUDE.md`    |
| Build targets          | `apps/native-rd/CLAUDE.md` (load `native-rd-build` skill) |
| CI contract            | `docs/architecture/ci-contract.md`                        |
| E2E runner plans       | `docs/plans/active/mac-mini-*.md`, `ios-usb-e2e-pivot.md` |
| Extraction history     | `docs/plans/completed/2026-05-14-mobile-extraction.md`    |

## Tech stack

Bun 1.3.7, Turborepo, TypeScript, Expo / React Native, Jest, Style Dictionary, tsup.
