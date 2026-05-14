# Contributing

Thanks for considering a contribution. This is a personal-scale project for neurodivergent users — feedback and patches from the ND/accessibility community are especially welcome.

## Set up

Requires Bun 1.3.7+, plus Xcode (iOS) and/or Android Studio (Android) for native builds.

```bash
bun install
bun run native:ios       # iOS simulator
bun run native:android   # Android device/emulator
```

Workspace tasks (from the root):

```bash
bun run type-check
bun run lint
bun run test
bun run build            # build packages, then native-rd
```

## Before opening a PR

- `bun run type-check` passes
- `bun run lint` passes
- `bun run test` passes for affected packages
- Tests added for new behavior; existing tests updated when behavior changes
- ND accessibility checked where relevant: a11y contract tests pass, 44×44pt touch targets, `accessibilityRole` / `accessibilityLabel` set on interactive elements

See [`apps/native-rd/AGENTS.md`](apps/native-rd/AGENTS.md) for app-level conventions and [`AGENTS.md`](AGENTS.md) for the repo map.

## DCO sign-off (required)

This repo enforces the [Developer Certificate of Origin](https://developercertificate.org/) on AGPL-licensed components. Sign every commit:

```bash
git commit -s -m "your message"
```

This appends a `Signed-off-by: Your Name <you@example.com>` trailer. Without it, the DCO CI check will fail on PRs to `main`.

If you forgot, amend:

```bash
git commit --amend --signoff
```

For multiple commits, rebase with sign-off:

```bash
git rebase --signoff HEAD~N
```

See [`LICENSING.md`](LICENSING.md) for the rationale — short version: it preserves the option to dual-license AGPL code for institutions in the future.

## Licensing

Per-package licensing — see [`LICENSING.md`](LICENSING.md) for the full breakdown:

| Package                    | License       |
| -------------------------- | ------------- |
| `packages/openbadges-core` | Apache-2.0    |
| `packages/design-tokens`   | MIT           |
| `apps/native-rd`           | AGPL-3.0-only |

By submitting a contribution with DCO sign-off, you place your contribution under the relevant package's license and grant the project the rights described in the DCO.

## Issues

- **Bug reports:** include reproduction steps, expected vs. actual behavior, device + OS version
- **Feature requests:** explain the user need — especially how it serves ND users
- **Design feedback:** screenshots welcome; reference design tokens or themes by name when relevant
- **Security issues:** see [`SECURITY.md`](SECURITY.md) — please report privately, not in public issues

## Code style

ESLint + Prettier configs are checked in; lint-staged runs on commit. You generally don't need to format by hand.

## Commit & PR conventions

- Commit messages: prefix with `feat:`, `fix:`, `chore:`, `docs:`, etc. — see `git log` for the house style
- PR titles: keep under ~70 chars
- PR descriptions: a short summary, the why, and a test plan checklist

## Questions

Open a GitHub Discussion if you're unsure whether something belongs in an issue. For private matters, email `joe.czar@outlook.com`.
