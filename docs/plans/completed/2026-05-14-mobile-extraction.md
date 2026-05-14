# Rollercoaster.dev Mobile Extraction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a new GitHub repository named `Rollercoaster.dev-mobile` containing `apps/native-rd`, `packages/openbadges-core`, and `packages/design-tokens` with relevant Git history preserved and with install, build, type-check, test, and mobile launch validation passing.

**Architecture:** Use a filtered clone of the current monorepo so the new repository keeps path-specific commit history while dropping unrelated apps and packages. Keep the extracted project as a small Bun/Turborepo workspace with `apps/native-rd`, `packages/openbadges-core`, and `packages/design-tokens`, then fix workspace references that pointed to packages not being extracted. Validate both history preservation and runtime/tooling behavior before publishing the new remote.

**Tech Stack:** Git, `git-filter-repo`, Bun 1.3.7, Turborepo, TypeScript, Expo/React Native, Jest, Style Dictionary, tsup.

---

## Scope And Decisions

This extraction includes:

- `apps/native-rd/`
- `packages/openbadges-core/`
- `packages/design-tokens/`
- root workspace/tooling files needed by those packages
- relevant GitHub workflow files after they are narrowed to the extracted repo

This extraction does not include unrelated applications or packages:

- `apps/docs/`
- `apps/openbadges-system/`
- `apps/openbadges-modular-server/`
- `packages/openbadges-ui/`
- `packages/shared-config/`
- `packages/rd-logger/`
- `packages/openbadges-types/`

Dependency decisions:

- Keep `@rollercoaster-dev/openbadges-core` and `@rollercoaster-dev/design-tokens` as `workspace:*` dependencies of `native-rd`.
- Change `native-rd`'s `openbadges-types` dependency from `workspace:*` to a registry version matching the current extracted ecosystem, `^4.0.0`.
- Add `@rollercoaster-dev/rd-logger: ^0.4.0` as a **direct** dependency of `native-rd` (24+ source files import it across hooks, screens, services, db, crypto, sentry; relying on transitive hoisting through `openbadges-core` is fragile under Bun's resolver). A runtime shim exists at `apps/native-rd/src/shims/rd-logger.js` — verify whether it fully replaces the npm package before deciding; if the shim is the actual runtime, the direct dep can be dropped.
- Keep `openbadges-core`'s runtime dependencies on `openbadges-types` and `@rollercoaster-dev/rd-logger` as registry dependencies.
- Remove `openbadges-core`'s dev dependency on `@rollercoaster-dev/shared-config` by replacing its shared config usage with local TypeScript and ESLint config in the extracted repo.
- Keep the directory layout unchanged so imports, Metro config, docs links, and package history remain easy to reason about.

Publishing context (verified 2026-05-14):

- `@rollercoaster-dev/rd-logger@0.4.0`, `openbadges-types@4.0.0`, `@rollercoaster-dev/openbadges-core@0.1.3`, and `@rollercoaster-dev/design-tokens@0.2.0` are all live on npm. The `"private": true` flag in their source manifests blocks accidental republish but does not delist existing versions.
- npm publishing was intentionally disabled across the monorepo on 2026-05-13 (PR #1070). Existing versions resolve normally; **new versions cannot be cut from the current publish pipeline** until it is re-enabled or replaced. This does not block extraction (mobile consumes existing versions and keeps `openbadges-core` / `design-tokens` as workspace packages), but the first time mobile needs a fix to one of the remaining registry deps, the publish flow must be addressed first.

## Progress Notifications

Send a one-line Telegram update at the start and end of every Task, and at the critical checkpoints listed below. Pings keep the user informed when they are away from the terminal.

Sender: `tg-send` (available on PATH at `/Users/hailmary/.local/bin/tg-send`, credentials in `~/.config/telegram/env`). Verified working 2026-05-14.

Convention:

- ▶️ = task/step starting
- ✅ = expected outcome reached
- 🚀 = irreversible/published action (push to remote, etc.)
- ⚠️ = expected outcome skipped (e.g. E2E unavailable) — not a failure, but worth flagging
- ❌ = unexpected failure → send the ping and stop the run

Critical checkpoints (in addition to per-task start/end):

- After `git filter-repo` (Task 2 Step 2) — confirms history rewrite completed
- After `bun install` regenerates the lockfile (Task 5 Step 2)
- After the root `bun run build` (Task 6 Step 3)
- After iOS simulator smoke launch (Task 8 Step 2)
- After the extraction-cleanup commit (Task 10 Step 4)
- After `git push -u origin main` to the new remote (Task 11 Step 3)
- After CI verification on the new remote (Task 11 Step 4)
- Final completion (end of Task 12)

Failure protocol: if any step's actual output does not match "Expected:", run

```bash
tg-send "❌ Task <N> Step <M> failed: <one-line cause>"
```

then stop and surface to the user before continuing.

## Files

Files and directories created outside the source monorepo:

- Create: `<TARGET>/`
- Create: GitHub repository `rollercoaster-dev/Rollercoaster.dev-mobile`

Files kept by history filtering:

- Keep: `apps/native-rd/**`
- Keep: `packages/openbadges-core/**`
- Keep: `packages/design-tokens/**`
- Keep: `package.json`
- Keep: `bun.lock`
- Keep: `turbo.json`
- Keep: `tsconfig.json`
- Keep: `bunfig.toml` (referenced by `turbo.json` `globalDependencies`)
- Keep: `.npmrc`
- Keep: `.gitignore`
- Keep: `.prettierignore`
- Keep: `eslint.config.mjs` (root flat config consumed by `bun run lint`)
- Keep: `.env.example`
- Keep: `.coderabbit.yaml`
- Keep: `.husky/**`
- Keep: `scripts/check-install.ts` (referenced by replacement root `package.json` scripts)
- Keep: `.github/PULL_REQUEST_TEMPLATE.md`
- Keep: `.github/dependabot.yml`
- Keep temporarily: `.github/workflows/ci-native-rd.yml`
- Keep temporarily: `.github/workflows/codeql.yml`
- Keep temporarily: `.github/workflows/claude-code-review.yml`
- Keep temporarily: `.github/workflows/claude.yml`
- Keep temporarily: `patches/ajv-formats@3.0.1.patch`

Files modified after extraction:

- Modify: `package.json`
- Modify: `tsconfig.json`
- Modify: `turbo.json`
- Modify: `eslint.config.mjs` (strip references to removed packages)
- Modify: `apps/native-rd/package.json`
- Modify: `apps/native-rd/README.md`
- Modify: `apps/native-rd/AGENTS.md` (remove monorepo-only references)
- Modify: `apps/native-rd/CLAUDE.md` (remove monorepo-only references)
- Modify: `apps/native-rd/scripts/worktree-boot.sh` (audit for monorepo-root path assumptions)
- Modify: `apps/native-rd/scripts/agent-logs.sh` (audit for monorepo-root path assumptions)
- Modify: `packages/openbadges-core/package.json`
- Modify: `packages/openbadges-core/tsconfig.json`
- Modify: `packages/openbadges-core/eslint.config.mjs`
- Modify: `packages/openbadges-core/README.md`
- Modify: `packages/design-tokens/package.json`
- Modify: `.github/dependabot.yml` (drop ecosystems for removed apps)
- Modify: `.github/workflows/ci-native-rd.yml`
- Modify: `.github/workflows/codeql.yml`
- Modify: `.github/workflows/claude.yml`
- Modify: `.github/workflows/claude-code-review.yml`

Files removed after extraction if they are still present and no longer apply:

- Delete: CI workflows that only target removed apps or publishing flows
- Delete: docs links that point only to removed monorepo systems and have no mobile replacement
- Delete: stale generated caches such as `apps/native-rd/.expo/` if present in the filtered working tree

## Task 1: Prepare Tools And Baseline

**Files:**

- Read: `<SOURCE>/package.json`
- Read: `<SOURCE>/apps/native-rd/package.json`
- Read: `<SOURCE>/packages/openbadges-core/package.json`
- Read: `<SOURCE>/packages/design-tokens/package.json`
- Read: `<SOURCE>/apps/native-rd/src/shims/rd-logger.js`
- Read: `<SOURCE>/apps/native-rd/jest.config.js`

Notify start:

```bash
tg-send "▶️ Task 1/12: Prepare tools and baseline"
```

- [ ] **Step 0: Pin the canonical source path and verify npm publish state**

Two working copies of the source monorepo exist locally:

- `/Volumes/SpinDrive/Code/rollercoaster.dev/monorepo` (primary working directory in current sessions)
- `/Users/hailmary/Code/rollercoaster.dev/monorepo` (additional working directory)

Confirm which is the canonical, up-to-date checkout before cloning. Run in both:

```bash
git -C /Volumes/SpinDrive/Code/rollercoaster.dev/monorepo rev-parse HEAD
git -C /Users/hailmary/Code/rollercoaster.dev/monorepo rev-parse HEAD
```

Use whichever matches the intended source commit. For the rest of this plan, `<SOURCE>` refers to that path and `<TARGET>` refers to `<parent>/Rollercoaster.dev-mobile/`.

Then verify the registry deps are actually resolvable:

```bash
npm view @rollercoaster-dev/rd-logger version
npm view openbadges-types version
```

Expected:

- `@rollercoaster-dev/rd-logger` returns `0.4.0`.
- `openbadges-types` returns `4.0.0`.
- Both will be consumed from the registry by `openbadges-core` and `native-rd`. If either is missing, stop and re-plan dependency strategy before filtering.

- [ ] **Step 0a: Verify the `rd-logger` shim's role**

Read `apps/native-rd/src/shims/rd-logger.js`, `apps/native-rd/jest.config.js` (for `moduleNameMapper` / `setupFiles`), and `apps/native-rd/metro.config.js` (for `resolver.resolveRequest` and `extraNodeModules`).

Expected:

- Determine whether `@rollercoaster-dev/rd-logger` imports in source files actually resolve to the shim at runtime (via Metro alias or babel plugin) or to the npm package.
- If shim is the runtime: omit the direct `rd-logger` dep from `native-rd/package.json` (Task 4 Step 4). It still ships transitively for `openbadges-core`.
- If shim is only test-time: keep `@rollercoaster-dev/rd-logger: ^0.4.0` as a direct dep in `native-rd/package.json`.

Record the decision in the extraction notes.

- [ ] **Step 1: Confirm the source repo is clean enough to copy**

Run (substituting the `<SOURCE>` chosen in Step 0):

```bash
cd <SOURCE>
git status --short
git branch --show-current
git rev-parse HEAD
```

Expected:

- Current branch is the intended source branch, normally `main`.
- Any uncommitted changes are either intentionally included by committing them first, or intentionally excluded by cloning from committed history only.
- Record the source commit SHA in the extraction notes.

- [ ] **Step 2: Install or confirm `git-filter-repo`**

Run:

```bash
git filter-repo --version
```

Expected:

- Prints a version string.

If the command is missing, run:

```bash
brew install git-filter-repo
git filter-repo --version
```

Expected:

- Prints a version string after installation.

- [ ] **Step 3: Confirm Bun and Turborepo availability**

Run:

```bash
bun --version
bun x turbo --version
```

Expected:

- Bun prints `1.3.7` or a compatible version satisfying the repo `engines`.
- Turbo prints a version compatible with `^2.9.12`.

Notify complete:

```bash
tg-send "✅ Task 1/12: tools verified, source SHA <sha>"
```

## Task 2: Create The Filtered Repository

**Files:**

- Create: `<TARGET>/`

Notify start:

```bash
tg-send "▶️ Task 2/12: Filter repository to mobile scope"
```

- [ ] **Step 1: Make a fresh local clone**

Run (substituting `<SOURCE>` and choosing `<TARGET>` parent — typically the sibling directory of `<SOURCE>`):

```bash
cd <parent-of-source>
git clone <SOURCE> Rollercoaster.dev-mobile
cd Rollercoaster.dev-mobile
```

Expected:

- A new local repository exists at `<TARGET>` = `<parent>/Rollercoaster.dev-mobile`.
- `git status --short` is empty.

- [ ] **Step 2: Filter to the mobile app and two packages**

Run:

```bash
cd <TARGET>
git filter-repo \
  --path apps/native-rd/ \
  --path packages/openbadges-core/ \
  --path packages/design-tokens/ \
  --path package.json \
  --path bun.lock \
  --path turbo.json \
  --path tsconfig.json \
  --path bunfig.toml \
  --path .npmrc \
  --path .gitignore \
  --path .prettierignore \
  --path eslint.config.mjs \
  --path .env.example \
  --path .coderabbit.yaml \
  --path .husky/ \
  --path scripts/check-install.ts \
  --path patches/ajv-formats@3.0.1.patch \
  --path .github/PULL_REQUEST_TEMPLATE.md \
  --path .github/dependabot.yml \
  --path .github/workflows/ci-native-rd.yml \
  --path .github/workflows/codeql.yml \
  --path .github/workflows/claude-code-review.yml \
  --path .github/workflows/claude.yml
```

Expected:

- The command completes successfully.
- The filtered repo contains only the selected app, packages, root tooling, selected patch, and selected GitHub files.

Critical checkpoint:

```bash
COMMIT_COUNT=$(git rev-list --count HEAD)
tg-send "✅ Filter complete — ${COMMIT_COUNT} commits retained"
```

- [ ] **Step 3: Verify the filtered tree**

Run:

```bash
find . -maxdepth 3 -type d | sort
git status --short
```

Expected:

- Present directories include `apps/native-rd`, `packages/openbadges-core`, and `packages/design-tokens`.
- Removed directories such as `apps/openbadges-system`, `apps/openbadges-modular-server`, and `packages/openbadges-ui` are absent.
- `git status --short` is empty immediately after filtering.

- [ ] **Step 4: Audit and prune tags**

`git filter-repo` keeps tags whose target commits survive filtering. Some tags reference releases of packages that no longer exist in this repo (`openbadges-server-*`, etc.).

Run:

```bash
git tag --list | sort
```

Decide per category:

- Drop release tags for removed packages (e.g. anything matching `openbadges-server-*`, `openbadges-system-*`, `openbadges-ui-*`, `rd-logger-*`, `openbadges-types-*`).
- Keep release tags for kept packages (`openbadges-core-*`, `design-tokens-*`, `native-rd-*`).
- Keep monorepo-wide tags only if they remain meaningful.

Apply by listing the to-drop tags and removing them, e.g.:

```bash
git tag --list 'openbadges-server-*' 'openbadges-system-*' 'openbadges-ui-*' 'rd-logger-*' 'openbadges-types-*' | xargs -I{} git tag -d {}
```

Expected:

- `git tag --list` shows only tags relevant to the extracted scope.

Notify complete:

```bash
tg-send "✅ Task 2/12: filtered tree verified, tags pruned"
```

## Task 3: Validate Preserved History

**Files:**

- Read: Git history for extracted paths

Notify start:

```bash
tg-send "▶️ Task 3/12: Validate preserved history"
```

- [ ] **Step 1: Check history for the native app**

Run:

```bash
cd <TARGET>
git log --oneline -- apps/native-rd | head -20
git log --follow --oneline -- apps/native-rd/package.json | head -20
```

Expected:

- Multiple historical commits appear.
- `apps/native-rd/package.json` history follows earlier edits to that file.

- [ ] **Step 2: Check history for `openbadges-core`**

Run:

```bash
git log --oneline -- packages/openbadges-core | head -20
git log --follow --oneline -- packages/openbadges-core/package.json | head -20
```

Expected:

- Multiple historical commits appear for the package.
- The package manifest has non-empty history.

- [ ] **Step 3: Check history for `design-tokens`**

Run:

```bash
git log --oneline -- packages/design-tokens | head -20
git log --follow --oneline -- packages/design-tokens/package.json | head -20
```

Expected:

- Multiple historical commits appear for the package.
- The package manifest has non-empty history.

- [ ] **Step 4: Compare a source history sample**

Run in source repo:

```bash
cd <SOURCE>
git log --oneline -- apps/native-rd/package.json | head -5
```

Run in extracted repo:

```bash
cd <TARGET>
git log --oneline -- apps/native-rd/package.json | head -5
```

Expected:

- Commit subjects match where the commits touched kept paths.
- Commit SHAs differ because history was rewritten by filtering.

Notify complete:

```bash
tg-send "✅ Task 3/12: history checks pass for all 3 packages"
```

## Task 4: Repair Workspace Configuration

**Files:**

- Modify: `package.json`
- Modify: `tsconfig.json`
- Modify: `turbo.json`
- Modify: `apps/native-rd/package.json`
- Modify: `packages/openbadges-core/package.json`
- Modify: `packages/openbadges-core/tsconfig.json`
- Modify: `packages/openbadges-core/eslint.config.mjs`

Notify start:

```bash
tg-send "▶️ Task 4/12: Repair workspace configuration"
```

- [ ] **Step 1: Update root `package.json` identity**

Edit `package.json` so the root metadata matches the extracted repo:

```json
{
  "name": "rollercoaster-dev-mobile",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "description": "Mobile app and shared badge packages for Rollercoaster.dev",
  "workspaces": ["packages/*", "apps/*"],
  "scripts": {
    "dev": "bun run turbo dev --filter=native-rd",
    "check:install": "bun scripts/check-install.ts",
    "build": "bun run check:install && bun run turbo build",
    "test": "bun run turbo test",
    "test:unit": "bun run turbo test:unit",
    "test:integration": "bun run turbo test:integration",
    "test:e2e": "bun run turbo test:e2e",
    "test:coverage": "bun run turbo test:coverage",
    "lint": "bun run turbo lint",
    "lint:fix": "bun run turbo lint --fix",
    "type-check": "bun run check:install && bun run turbo type-check",
    "format": "bunx prettier --write \"**/*.{ts,tsx,js,jsx,json,md}\"",
    "format:check": "bunx prettier --check \"**/*.{ts,tsx,js,jsx,json,md}\"",
    "native:start": "cd apps/native-rd && bun run start",
    "native:ios": "cd apps/native-rd && bash scripts/run-ios.sh",
    "native:ios:e2e": "cd apps/native-rd && bun run ios:e2e",
    "native:android": "cd apps/native-rd && bun run android",
    "native:test": "cd apps/native-rd && bun run test",
    "clean": "bun run turbo clean && rm -rf node_modules .turbo .bun-cache"
  },
  "devDependencies": {
    "@types/bun": "latest",
    "@types/node": "^25.6.2",
    "eslint": "^9.39.4",
    "prettier": "^3.8.3",
    "turbo": "^2.9.12",
    "typescript": "^6.0.3"
  },
  "packageManager": "bun@1.3.7",
  "engines": {
    "bun": ">=1.3.7"
  },
  "patchedDependencies": {
    "ajv-formats@3.0.1": "patches/ajv-formats@3.0.1.patch"
  }
}
```

If `scripts/check-install.ts` is not included in the filtered repo, either include it with a second filter pass before this task or remove `check:install` from the root scripts and call `bun run turbo build` / `bun run turbo type-check` directly. Prefer including `scripts/check-install.ts` only if it has no dependencies on removed monorepo packages.

- [ ] **Step 2: Update root TypeScript project references**

Edit `tsconfig.json` to reference only the extracted TypeScript package:

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "compilerOptions": {
    "composite": true
  },
  "include": [],
  "references": [{ "path": "./packages/openbadges-core" }]
}
```

Expected:

- No references remain to `packages/rd-logger`, `packages/openbadges-types`, or removed apps.

- [ ] **Step 3: Keep `turbo.json` focused on extracted packages**

Edit `turbo.json` only if validation shows removed global environment values or task outputs are confusing CI. A minimal valid version is:

```json
{
  "$schema": "https://turbo.build/schema.json",
  "ui": "tui",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", "build/**"],
      "cache": true
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "test": {
      "cache": true,
      "outputs": ["coverage/**"]
    },
    "test:unit": {
      "cache": true,
      "outputs": ["coverage/**"]
    },
    "test:integration": {
      "cache": true,
      "outputs": ["coverage/**"]
    },
    "test:e2e": {
      "dependsOn": ["build"],
      "cache": true,
      "outputs": ["coverage/**"]
    },
    "test:coverage": {
      "cache": true,
      "outputs": ["coverage/**"]
    },
    "lint": {
      "cache": true,
      "outputs": []
    },
    "type-check": {
      "dependsOn": ["^build"],
      "cache": true,
      "outputs": []
    },
    "format": {
      "cache": false,
      "outputs": []
    },
    "format:check": {
      "cache": true,
      "outputs": []
    },
    "clean": {
      "cache": false
    }
  },
  "globalDependencies": ["**/.env.*local", "tsconfig.json", "bunfig.toml"],
  "globalEnv": ["NODE_ENV", "CI", "BUN_ENV", "DEV_HOST"]
}
```

- [ ] **Step 4: Convert `native-rd` registry dependencies**

Edit `apps/native-rd/package.json` dependencies:

```json
{
  "dependencies": {
    "@rollercoaster-dev/design-tokens": "workspace:*",
    "@rollercoaster-dev/openbadges-core": "workspace:*",
    "@rollercoaster-dev/rd-logger": "^0.4.0",
    "openbadges-types": "^4.0.0"
  }
}
```

`@rollercoaster-dev/rd-logger` is added as a direct dependency because ~24 source files in `apps/native-rd/src/` import it (hooks, screens, components, services, db, crypto, sentry-report). Relying on transitive resolution through `openbadges-core` is fragile under Bun's hoisting.

If Task 1 Step 0a determined the runtime shim at `src/shims/rd-logger.js` fully replaces the npm package (Metro alias + jest moduleNameMapper both route imports to it), drop the direct `rd-logger` dep — the package still ships transitively via `openbadges-core` for type resolution.

Expected:

- `@rollercoaster-dev/design-tokens` remains `workspace:*`.
- `@rollercoaster-dev/openbadges-core` remains `workspace:*`.
- `openbadges-types` is not `workspace:*`.
- `@rollercoaster-dev/rd-logger` is either a direct registry dep (default) or intentionally absent (shim-only).

- [ ] **Step 5: Remove `openbadges-core` shared-config dependency**

Edit `packages/openbadges-core/package.json` so `@rollercoaster-dev/shared-config` is absent from `devDependencies`, and add any direct dev tools needed by existing scripts:

```json
{
  "devDependencies": {
    "tsup": "^8.4.0",
    "typescript": "^6.0.3",
    "eslint": "^9.39.4"
  }
}
```

Expected:

- `bun install` no longer tries to resolve `@rollercoaster-dev/shared-config` from the workspace.

- [ ] **Step 6: Replace `openbadges-core` TypeScript shared config**

Edit `packages/openbadges-core/tsconfig.json` to remove `extends: "@rollercoaster-dev/shared-config/tsconfig"` and use a local standalone config:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "dist",
    "rootDir": "src",
    "skipLibCheck": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "types": ["bun-types"]
  },
  "include": ["src/**/*.ts", "tests/**/*.ts", "tsup.config.ts"],
  "exclude": ["dist", "node_modules"]
}
```

Expected:

- `bun --filter @rollercoaster-dev/openbadges-core type-check` can run without `@rollercoaster-dev/shared-config`.

- [ ] **Step 7: Replace `openbadges-core` ESLint shared config**

Edit `packages/openbadges-core/eslint.config.mjs` to remove imports from `@rollercoaster-dev/shared-config/eslint`. Use a local flat config:

```js
import js from "@eslint/js";

export default [
  {
    ignores: ["dist/**", "node_modules/**", "coverage/**"],
  },
  js.configs.recommended,
  {
    files: ["src/**/*.ts", "tests/**/*.ts", "tsup.config.ts"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
    },
    rules: {
      "no-unused-vars": "off",
      "no-undef": "off",
    },
  },
];
```

Then add `@eslint/js` to the root or package dev dependencies if it is not already installed:

```bash
bun add -d @eslint/js
```

Expected:

- `bun --filter @rollercoaster-dev/openbadges-core lint` runs without importing removed workspace packages.

- [ ] **Step 8: Trim root `eslint.config.mjs`**

The root flat config (~7.9k in source) likely contains overrides scoped to removed packages (`apps/openbadges-system/**`, `packages/openbadges-ui/**`, `packages/rd-logger/**`, etc.). Edit `eslint.config.mjs` to:

- Remove any `files` patterns matching removed paths.
- Remove imports of `@rollercoaster-dev/shared-config/eslint` if present at the root.
- Keep globals/rules that still apply to `native-rd`, `openbadges-core`, and `design-tokens`.

Run:

```bash
bun run lint
```

Expected:

- Lint passes or only reports issues from kept code.
- No "cannot find module" errors from removed package imports.

Notify complete:

```bash
tg-send "✅ Task 4/12: workspace configs rewritten"
```

## Task 5: Install And Regenerate Lockfile

**Files:**

- Modify: `bun.lock`

Notify start:

```bash
tg-send "▶️ Task 5/12: Install and regenerate lockfile"
```

- [ ] **Step 1: Remove stale installs**

Run:

```bash
cd <TARGET>
rm -rf node_modules apps/native-rd/node_modules packages/openbadges-core/node_modules packages/design-tokens/node_modules .turbo .bun-cache
```

Expected:

- No dependency directory from the source repo remains.

- [ ] **Step 2: Install from the extracted root**

Run:

```bash
bun install
```

Expected:

- Install completes successfully.
- `bun.lock` is updated for the extracted workspace.
- No `workspace:*` resolution error appears for `openbadges-types` or `@rollercoaster-dev/shared-config`.

Critical checkpoint:

```bash
tg-send "✅ bun install succeeded, lockfile regenerated"
```

- [ ] **Step 3: Confirm workspace graph**

Run:

```bash
bun pm ls --depth 0
bun x turbo run build --dry=json
```

Expected:

- Workspaces include `native-rd`, `@rollercoaster-dev/openbadges-core`, and `@rollercoaster-dev/design-tokens`.
- Turbo dry run includes the extracted workspaces and no removed monorepo packages.

Notify complete:

```bash
tg-send "✅ Task 5/12: workspace graph confirmed (3 packages)"
```

## Task 6: Build And Type Validation

**Files:**

- Read: build output

Notify start:

```bash
tg-send "▶️ Task 6/12: Build & type-check"
```

- [ ] **Step 1: Build design tokens**

Run:

```bash
bun --filter @rollercoaster-dev/design-tokens build
```

Expected:

- `packages/design-tokens/build/js/index.js` exists.
- `packages/design-tokens/build/unistyles/index.ts` exists.
- No Style Dictionary errors appear.

- [ ] **Step 2: Build Open Badges core**

Run:

```bash
bun --filter @rollercoaster-dev/openbadges-core build
```

Expected:

- `packages/openbadges-core/dist/index.js` exists.
- `packages/openbadges-core/dist/index.d.ts` exists.
- No unresolved imports from removed workspace packages appear.

- [ ] **Step 3: Run root build**

Run:

```bash
bun run build
```

Expected:

- Turbo builds package dependencies before `native-rd`.
- `native-rd` prints its current no-op Expo build message.
- No removed package appears in the build graph.

Critical checkpoint:

```bash
tg-send "✅ Turbo build green"
```

- [ ] **Step 4: Run root type-check**

Run:

```bash
bun run type-check
```

Expected:

- `openbadges-core` type-check passes.
- `native-rd` type-check passes with both `tsconfig.json` and `tsconfig.test.json`.
- No `workspace:*` dependency resolution errors appear.

Notify complete:

```bash
tg-send "✅ Task 6/12: type-check passes"
```

## Task 7: Test Validation

**Files:**

- Read: test output

Notify start:

```bash
tg-send "▶️ Task 7/12: Tests and lint"
```

- [ ] **Step 1: Run Open Badges core tests**

Run:

```bash
bun --filter @rollercoaster-dev/openbadges-core test
```

Expected:

- Bun test suite passes.
- Tests using `openbadges-types` resolve from the registry dependency.

- [ ] **Step 2: Run native unit tests**

Run:

```bash
cd <TARGET>/apps/native-rd
bun run test:ci
```

Expected:

- Jest suite passes.
- Mocks for `@rollercoaster-dev/openbadges-core` still resolve.
- Imports from `@rollercoaster-dev/design-tokens/unistyles` still resolve through the workspace package.

- [ ] **Step 3: Run root test**

Run:

```bash
cd <TARGET>
bun test
```

Expected:

- Turbo runs tests for extracted packages.
- No removed app or package appears in test output.

- [ ] **Step 4: Run lint**

Run:

```bash
bun run lint
```

Expected:

- `native-rd` Expo lint runs.
- `openbadges-core` lint runs using local ESLint config.
- `design-tokens` is skipped or reports no lint task depending on its package scripts.

Notify complete:

```bash
tg-send "✅ Task 7/12: tests + lint pass"
```

## Task 8: Expo And Device Smoke Validation

**Files:**

- Read: Expo / Metro logs

Notify start:

```bash
tg-send "▶️ Task 8/12: Expo & device smoke validation"
```

- [ ] **Step 1: Start Metro from the extracted repo**

Run:

```bash
cd <TARGET>/apps/native-rd
bun run start:worktree
```

Expected:

- Metro starts on a worktree-safe port.
- No resolver errors appear for `@rollercoaster-dev/design-tokens/unistyles`, `@rollercoaster-dev/openbadges-core`, or `openbadges-types`.

- [ ] **Step 2: Run iOS simulator smoke test**

Run:

```bash
cd <TARGET>/apps/native-rd
bun run ios
```

Expected:

- The app builds and launches in the iOS simulator.
- The app reaches the initial screen without a redbox.
- Theme styling renders, proving design tokens are available.

Critical checkpoint:

```bash
tg-send "✅ iOS simulator launched, theme renders"
```

- [ ] **Step 3: Run focused mobile logs check**

Run:

```bash
cd <TARGET>/apps/native-rd
bun run logs:agent
```

Expected:

- Logs do not show module resolution failures.
- Logs do not show badge credential import failures.

- [ ] **Step 4: Run E2E smoke if simulator and Maestro are available**

Run:

```bash
cd <TARGET>/apps/native-rd
bun run test:e2e
```

Expected:

- E2E flows pass, or any simulator/tooling failure is documented separately from extraction correctness.

Notify complete (use ⚠️ instead of ✅ if E2E was skipped due to tooling unavailability):

```bash
tg-send "✅ Task 8/12: smoke validation complete"
```

## Task 9: Documentation And Metadata Cleanup

**Files:**

- Modify: `apps/native-rd/README.md`
- Modify: `apps/native-rd/AGENTS.md`
- Modify: `apps/native-rd/CLAUDE.md`
- Modify: `apps/native-rd/scripts/worktree-boot.sh`
- Modify: `apps/native-rd/scripts/agent-logs.sh`
- Modify: `packages/openbadges-core/README.md`
- Modify: `packages/design-tokens/package.json`
- Modify: `packages/openbadges-core/package.json`
- Modify: `.github/dependabot.yml`
- Modify: `.github/workflows/ci-native-rd.yml`
- Modify: `.github/workflows/codeql.yml`
- Modify: `.github/workflows/claude.yml`
- Modify: `.github/workflows/claude-code-review.yml`

Notify start:

```bash
tg-send "▶️ Task 9/12: Docs & metadata cleanup"
```

- [ ] **Step 1: Update repository URLs**

Edit package metadata:

```json
{
  "repository": {
    "type": "git",
    "url": "git+https://github.com/rollercoaster-dev/Rollercoaster.dev-mobile.git"
  },
  "bugs": {
    "url": "https://github.com/rollercoaster-dev/Rollercoaster.dev-mobile/issues"
  },
  "homepage": "https://github.com/rollercoaster-dev/Rollercoaster.dev-mobile#readme"
}
```

For package manifests with `"directory"`, keep:

```json
{
  "repository": {
    "type": "git",
    "url": "git+https://github.com/rollercoaster-dev/Rollercoaster.dev-mobile.git",
    "directory": "packages/openbadges-core"
  }
}
```

Expected:

- No package metadata points to the old monorepo as the primary source.

- [ ] **Step 2: Update README references**

Replace monorepo-local text such as:

```md
The `@rollercoaster-dev/openbadges-core` package lives at `packages/openbadges-core/` in the monorepo
```

With:

```md
The `@rollercoaster-dev/openbadges-core` package lives at `packages/openbadges-core/` in this repository.
```

Expected:

- README links still work inside the extracted repo.
- Historical context remains only where it is useful and clearly labeled.

- [ ] **Step 3: Narrow `ci-native-rd.yml`**

Edit `.github/workflows/ci-native-rd.yml` so it validates the extracted repo with:

```yaml
name: Mobile CI

on:
  pull_request:
  push:
    branches: [main]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: 1.3.7
      - run: bun install --frozen-lockfile
      - run: bun --filter @rollercoaster-dev/design-tokens build
      - run: bun --filter @rollercoaster-dev/openbadges-core build
      - run: bun run type-check
      - run: bun run lint
      - run: bun run test
```

Expected:

- CI does not reference removed apps, removed Docker builds, docs freshness, wiki publishing, or npm publishing.

- [ ] **Step 4: Narrow `codeql.yml`**

Edit `.github/workflows/codeql.yml` so the language matrix and `paths` filters reflect only the extracted scope:

- Languages: keep `javascript-typescript` (or whatever matches the source matrix entry that covers JS/TS); drop any language entries that targeted removed apps (e.g. server-side Bun-only paths).
- `paths` / `paths-ignore`: remove globs scoped to `apps/openbadges-system/**`, `apps/openbadges-modular-server/**`, `packages/openbadges-ui/**`, `packages/shared-config/**`, `packages/rd-logger/**`, `packages/openbadges-types/**`.
- Keep scans for `apps/native-rd/**`, `packages/openbadges-core/**`, `packages/design-tokens/**`.

Expected:

- A scheduled CodeQL run on the new repo completes without "no source files found" errors and without scanning paths that no longer exist.

- [ ] **Step 5: Narrow `claude.yml` and `claude-code-review.yml`**

Edit both workflows to:

- Remove branch/path triggers that referenced removed apps.
- Update any `@reviewer` mentions or scope hints that named removed packages.
- Drop steps that built or tested removed apps (e.g. Docker-server matrix entries).

Expected:

- Claude review workflows trigger only on PRs that touch the extracted scope and do not error on missing paths.

- [ ] **Step 6: Trim `.github/dependabot.yml`**

Edit `.github/dependabot.yml` to remove package-ecosystem entries scoped to removed paths (`apps/openbadges-system`, `apps/openbadges-modular-server`, `packages/openbadges-ui`, `packages/rd-logger`, `packages/openbadges-types`, `packages/shared-config`).

Keep ecosystems for:

- root npm (covers root `package.json`)
- `apps/native-rd` npm
- `packages/openbadges-core` npm
- `packages/design-tokens` npm
- GitHub Actions

Expected:

- Dependabot does not attempt to scan removed directories.

- [ ] **Step 7: Update `apps/native-rd` agent docs**

Edit `apps/native-rd/AGENTS.md` and `apps/native-rd/CLAUDE.md`:

- Remove or rewrite references to monorepo-only siblings (`apps/openbadges-system`, `apps/openbadges-modular-server`, `packages/openbadges-ui`, etc.).
- Update any "see root `AGENTS.md`" links — the root AGENTS.md was authored for the full monorepo and may need its own rewrite (or be retired in favor of the native-rd one).
- Keep references to `packages/openbadges-core` and `packages/design-tokens` since they still exist.

Expected:

- No agent doc points at a path that no longer exists.

- [ ] **Step 8: Audit `apps/native-rd/scripts/`**

Read `apps/native-rd/scripts/worktree-boot.sh` and `apps/native-rd/scripts/agent-logs.sh`. Both are invoked by `native:ios` / `start:worktree` / `logs:agent` and may contain monorepo-root path assumptions (e.g. `cd ../..` expecting specific siblings, references to removed app names in log filters).

Run:

```bash
rg "openbadges-system|openbadges-modular-server|openbadges-ui|rd-logger|openbadges-types|shared-config" apps/native-rd/scripts/
```

Expected:

- No matches, or only matches that are documented and intentional. Patch any monorepo-root assumptions.

Notify complete:

```bash
tg-send "✅ Task 9/12: docs and CI workflows narrowed"
```

## Task 10: Final Local Acceptance Gate

**Files:**

- Read: repository state

Notify start:

```bash
tg-send "▶️ Task 10/12: Final acceptance gate"
```

- [ ] **Step 1: Run full validation suite**

Run:

```bash
cd <TARGET>
bun install --frozen-lockfile
bun --filter @rollercoaster-dev/design-tokens build
bun --filter @rollercoaster-dev/openbadges-core build
bun run type-check
bun run lint
bun run test
```

Expected:

- Every command exits 0.

- [ ] **Step 2: Confirm no removed workspace references remain**

Run:

```bash
rg "apps/openbadges|apps/docs|packages/openbadges-ui|packages/shared-config|@rollercoaster-dev/shared-config|workspace:\\*" package.json apps packages .github eslint.config.mjs
```

Expected:

- `workspace:*` appears only for packages that exist in the extracted repo (`@rollercoaster-dev/openbadges-core`, `@rollercoaster-dev/design-tokens`).
- References to removed packages appear only in historical docs or changelogs where they are intentionally contextual.
- No active config file imports `@rollercoaster-dev/shared-config`.
- Note: `packages/rd-logger` and `packages/openbadges-types` references are expected to remain as **registry deps** (`@rollercoaster-dev/rd-logger`, `openbadges-types`) and as type imports in source code — those are correct, not stale.

- [ ] **Step 3: Confirm Git status**

Run:

```bash
git status --short
git diff --stat
```

Expected:

- Only intentional extraction cleanup files are modified.
- Generated build outputs are either intentionally ignored or intentionally tracked according to existing package rules.

- [ ] **Step 4: Commit extraction cleanup**

Run:

```bash
git add \
  package.json bun.lock turbo.json tsconfig.json \
  eslint.config.mjs bunfig.toml .npmrc .gitignore .prettierignore \
  apps/native-rd packages/openbadges-core packages/design-tokens \
  scripts .github
git commit -m "chore: adapt mobile extraction workspace"
```

Expected:

- Commit succeeds.
- Commit contains only post-filter cleanup needed for the new repo.

Critical checkpoint:

```bash
tg-send "✅ Extraction cleanup committed"
tg-send "✅ Task 10/12: full validation green"
```

## Task 11: Create GitHub Repository And Push

**Files:**

- Remote: `github.com/rollercoaster-dev/Rollercoaster.dev-mobile`

Notify start:

```bash
tg-send "▶️ Task 11/12: Create remote and push"
```

- [ ] **Step 1: Create the GitHub repository**

Run (visibility flag chosen to match product strategy — `--private` shown):

```bash
gh repo create rollercoaster-dev/Rollercoaster.dev-mobile \
  --private \
  --description "Rollercoaster.dev mobile app and shared badge packages" \
  --disable-issues=false \
  --disable-wiki
```

Settings to verify in the GitHub UI afterward:

- Default branch: `main`.
- Initialize with README: disabled (the local repository already has history).
- Branch protection on `main`: align with monorepo conventions (PR required, status checks once CI is green).

- [ ] **Step 2: Add the new remote**

Run:

```bash
cd <TARGET>
git remote remove origin
git remote add origin git@github.com:rollercoaster-dev/Rollercoaster.dev-mobile.git
git remote -v
```

Expected:

- `origin` points to `git@github.com:rollercoaster-dev/Rollercoaster.dev-mobile.git`.

- [ ] **Step 3: Push all rewritten history**

Run:

```bash
git push -u origin main
```

Expected:

- Push succeeds.
- GitHub shows the filtered commit history.

Critical checkpoint:

```bash
tg-send "🚀 Pushed to github.com/rollercoaster-dev/Rollercoaster.dev-mobile"
```

- [ ] **Step 4: Verify remote history and CI**

Run:

```bash
gh repo view rollercoaster-dev/Rollercoaster.dev-mobile --web
gh run list --repo rollercoaster-dev/Rollercoaster.dev-mobile --limit 5
```

Expected:

- The repo opens in GitHub.
- The initial CI run is visible.
- CI passes or failures match local validation findings and are fixed before handoff.

Critical checkpoint + notify complete:

```bash
tg-send "✅ Initial CI run visible on new remote"
tg-send "✅ Task 11/12: remote live"
```

## Task 12: Source Monorepo Follow-Up

**Files:**

- Modify later, in source monorepo only after the new repository is validated

Notify start:

```bash
tg-send "▶️ Task 12/12: Source monorepo follow-up"
```

- [ ] **Step 1: Decide whether this extraction is copy-only or a true move**

Recommended default given the monorepo is paused and mobile-only work is active: **true move**. The source monorepo has no active consumer of `native-rd` or `design-tokens`, and `openbadges-core` has no other consumer either.

If copy-only:

- Leave source paths in the monorepo.
- Add documentation linking to the new repository.

If true move:

- Create a separate PR in the monorepo removing `apps/native-rd`, `packages/openbadges-core`, and `packages/design-tokens`.
- Update monorepo `package.json`, `tsconfig.json`, `turbo.json`, CI, docs, project board links, and package references.
- Validate the source monorepo after removal with `bun install`, `bun run type-check`, `bun run lint`, and `bun test`.
- Note: removing `packages/openbadges-core` and `packages/design-tokens` from the source monorepo does not affect the live npm versions (`0.1.3` / `0.2.0`); those remain published. New versions cannot ship until the publish pipeline is re-enabled (disabled 2026-05-13 / PR #1070), but the new mobile repo will own that pipeline going forward.

- [ ] **Step 2: Update issue/project tracking**

Record:

- Source commit SHA used for extraction.
- New repo URL.
- Validation commands and results.
- Whether the source monorepo still owns the extracted paths.

Notify complete:

```bash
tg-send "🎉 Extraction complete — Rollercoaster.dev-mobile is live"
```

## Self-Review

Spec coverage:

- The plan creates a new repo named `Rollercoaster.dev-mobile`.
- The plan preserves Git history using `git filter-repo`.
- The plan extracts `apps/native-rd`, `packages/openbadges-core`, and `packages/design-tokens`.
- The plan validates history, install, build, type-check, tests, lint, Expo launch, E2E smoke, CI, and remote push.
- The plan handles known dependency fallout from `openbadges-types`, `@rollercoaster-dev/rd-logger`, and `@rollercoaster-dev/shared-config`.

Placeholder scan:

- `<SOURCE>` and `<TARGET>` are defined in Task 1 Step 0 and consistently used throughout subsequent tasks.
- No other task depends on an undefined placeholder.
- Each validation step includes exact commands and expected outcomes.

Type and package consistency:

- `native-rd` continues to consume the extracted core and token packages through workspace links.
- `openbadges-types` is converted to a registry dependency where needed and verified live on npm.
- `@rollercoaster-dev/rd-logger` is added as a direct registry dep on `native-rd` (or intentionally dropped if the runtime shim covers it).
- `openbadges-core` no longer depends on the removed shared config package.
- Registry resolution for `rd-logger` and `openbadges-types` is verified up-front (Task 1 Step 0) because npm publishing was disabled 2026-05-13; only existing versions are available going forward.
