# Issue #387 — ci: publish web Storybook to GitHub Pages

- **Milestone:** native-rd: Beta Stabilization & Cleanup
- **Parent epic:** none
- **Branch:** `feat/issue-387-storybook-github-pages`
- **Type:** CI / infrastructure (1 PR)

## Why now

The web Storybook (`@storybook/react-native-web-vite`) is already a first-class artifact: `ci-native-rd.yml` builds it on every PR (`storybook:web:build` step), so it's continuously verified but never published. Publishing it gives reviewers, designers, and ND user-testers a live, linkable view of the component library and the 14 themes without a local checkout — directly useful for the "Beta Stabilization & Cleanup" and upcoming user-testing work. It's a self-contained infra task with no code dependencies (`dep:independent`).

## Goal

A push to `main` that touches the component/story/token surface automatically rebuilds the web Storybook and publishes it to GitHub Pages at **`https://rollercoaster-dev.github.io/Rollercoaster.dev-mobile/`**. A maintainer can also redeploy on demand via `workflow_dispatch`.

## Readiness

- ✅ Web Storybook builds — `bun run storybook:web:build` → `apps/native-rd/.storybook-web-static/` (163 files, ~13s). Verified locally on this branch's base.
- ✅ Build verified in CI already — `ci-native-rd.yml:101-103` runs the same command on every PR; install + build with no separate turbo/deps prebuild step is proven to work (`@rollercoaster-dev/design-tokens` is transpiled by Vite via `modulesToTranspile`).
- ✅ Subpath-safe — output uses **relative** asset paths (`./sb-manager/…`, `./assets/…`) and query-param routing (`?path=/story/…`), so it works under the `/Rollercoaster.dev-mobile/` project subpath with **no base-path config**. Verified by grepping `index.html` / `iframe.html` in the build output.
- ✅ Repo is **public** → GitHub Pages is free.
- ⚠️ **Pages is not enabled** on the repo (`GET /repos/.../pages` → 404). Requires a one-time owner action in repo Settings (see "Manual step" below). The workflow's `actions/configure-pages` can enable it automatically on first run for a public repo, but documenting the manual toggle is the reliable path.
- ✅ `.storybook-web-static/` is already git-ignored (`.gitignore:15`) — nothing to add there.

## Scope

| File                                    | Change                                                                      |
| --------------------------------------- | --------------------------------------------------------------------------- |
| `.github/workflows/storybook-pages.yml` | **New.** Build + deploy workflow (full YAML below).                         |
| `apps/native-rd/README.md`              | Update the Storybook row (~line 83) / add a line linking the published URL. |

No application code changes. The plan commit itself only adds this doc; the workflow + README land in implementation commits.

### Workflow file (drop-in)

```yaml
# Publishes the web Storybook to GitHub Pages.
# Build is mirrored from ci-native-rd.yml's "Storybook web build" step.
name: storybook-pages

on:
  push:
    branches: [main]
    # Mirror ci-native-rd.yml's native-rd surface so any input to the
    # Storybook build (components, stories, assets/fonts, tokens) redeploys.
    paths:
      - "apps/native-rd/**"
      - "!apps/native-rd/docs/**"
      - "!apps/native-rd/research/**"
      - "!apps/native-rd/prototypes/**"
      - "packages/design-tokens/**"
      - "packages/openbadges-core/**"
      - "bun.lock"
      - ".github/workflows/storybook-pages.yml"
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

# Don't cancel an in-flight deploy; queue the next one.
concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build-and-deploy:
    name: Build & Deploy Storybook
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - name: Checkout
        uses: actions/checkout@v6

      - name: Setup Bun
        uses: oven-sh/setup-bun@v2
        with:
          bun-version-file: "package.json"

      - name: Setup Node
        uses: actions/setup-node@v6
        with:
          node-version-file: "apps/native-rd/.nvmrc"

      - name: Cache Bun dependencies
        uses: actions/cache@v5
        with:
          path: ~/.bun/install/cache
          key: ${{ runner.os }}-bun-${{ hashFiles('bun.lock') }}
          restore-keys: |
            ${{ runner.os }}-bun-

      - name: Install dependencies
        run: bun install --frozen-lockfile

      - name: Build web Storybook
        working-directory: apps/native-rd
        run: bun run storybook:web:build

      - name: Configure Pages
        uses: actions/configure-pages@v5

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: apps/native-rd/.storybook-web-static

      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v5
```

Pin rationale: `checkout@v6` / `setup-node@v6` / `cache@v5` match `ci-native-rd.yml` house style; `configure-pages@v5` / `upload-pages-artifact@v3` / `deploy-pages@v5` are the current majors per the official Pages starter workflow.

## Manual step (owner-only, document in PR description)

Before the first deploy can succeed, enable Pages once:

**Repo → Settings → Pages → Build and deployment → Source → "GitHub Actions".**

This is the `hitl` gate on this issue. After it's set, the workflow is fully autonomous on subsequent `main` pushes.

## Tests touched

None. This is CI plumbing; correctness is proven by the deploy succeeding and the site rendering. The Storybook build itself is already covered by `ci-native-rd.yml` on PRs.

## Acceptance criteria → evidence

| Criterion                                                                 | Evidence in PR                                                                           |
| ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Workflow builds web SB & deploys via configure/upload/deploy-pages        | `.github/workflows/storybook-pages.yml` (build + 3 Pages steps)                          |
| Triggers: push to `main` (path-filtered) + `workflow_dispatch`            | `on:` block in the workflow                                                              |
| `pages: write` + `id-token: write`, `github-pages` env, concurrency group | `permissions:`, `environment:`, `concurrency:` blocks                                    |
| Pages setting documented                                                  | "Manual step" section above, restated in PR description                                  |
| Storybook reachable at project URL & renders stories                      | First successful `storybook-pages` run; deployment `page_url` resolves and loads stories |
| README/docs link the published URL                                        | `apps/native-rd/README.md` diff                                                          |

## Out of scope (explicit)

- **Custom domain** (`storybook.rollercoaster.dev`) — deferred; clean follow-up (add DNS CNAME + `cname:` input on `configure-pages` / Pages setting).
- **On-device (native) Storybook** — unchanged; this is the web build only.
- **PR-preview deploys** — only `main` publishes; PR builds stay verify-only in `ci-native-rd.yml`.
- **Bundle-size optimization** — the build warns about >500 kB chunks (`BadgeRenderer`, `iframe`); cosmetic, not blocking. Not addressed here.

## Risks

- **First deploy fails if Pages isn't enabled.** Mitigation: the manual step above; `configure-pages` may auto-enable on public repos but don't rely on it.
- **Path filter too narrow.** If a story renders content from a path not in the filter (e.g. a new top-level dir), edits there won't trigger a redeploy. `workflow_dispatch` is the manual escape hatch; widen the filter if it bites.

## Re-entry instructions

If `/clear`-ed mid-flow:

1. `git branch --show-current` → should be `feat/issue-387-storybook-github-pages`.
2. This plan is committed; implementation = add `.github/workflows/storybook-pages.yml` (YAML above is drop-in) + the README link, then `/self-review` → `/finalize`.
3. The PR description must restate the one-time **Settings → Pages → GitHub Actions** manual step for the repo owner.
4. Verify locally first: `cd apps/native-rd && bun run storybook:web:build` should emit `.storybook-web-static/` with relative-path `index.html`.
