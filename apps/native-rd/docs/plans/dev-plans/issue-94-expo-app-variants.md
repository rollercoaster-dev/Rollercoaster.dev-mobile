# Development Plan: Issue #94

## Issue Summary

**Title**: Adopt Expo multi-variant pattern: end `INSTALL_FAILED_VERSION_DOWNGRADE` friction
**Type**: enhancement / infrastructure
**Complexity**: SMALL (borderline TRIVIAL)
**Estimated Lines**: ~25 net (one new ~20-line `app.config.js`, one-line edit to each run script)
**Commits**: 2

## Scope decision (2026-06-12) — read this first

The issue's literal package map is `.dev` (local) / `.preview` (EAS preview/internal) /
base (production). **We are deliberately NOT doing the `.preview` split.** Two
findings drove this:

1. **What the friction actually is.** The reported `INSTALL_FAILED_VERSION_DOWNGRADE`
   happens only between a **local debug** install (`versionCode 1`, hardcoded by
   prebuild) and an **EAS** install (remote-managed `versionCode`, currently ~10).
   All EAS builds share the base package and a monotonic remote counter, so they
   never downgrade-collide with each other — only local-vs-EAS collides. Making
   **local** a separate package (`.dev`) fully resolves the reported pain.

2. **What CI actually submits (verified in `.github/workflows/`).** The project is
   **pre-production — internal testing only**. Internal builds come from
   `build-internal.yml`, which builds with the **preview** profile and then
   `eas submit`s those artifacts to the real store records:
   - iOS → TestFlight via `ascAppId 6766029904` (registered to `dev.rollercoaster.app`).
   - Android → Play **internal** track of the `dev.rollercoaster.app` Play app.

   If the preview profile produced `dev.rollercoaster.app.preview`, **both** submits
   would fail: Apple rejects a bundle id that doesn't match the ASC record, and Play
   has no listing for a `.preview` package. The issue's own verification checklist
   ("`eas submit` to Play Internal still uses the production package") is in direct
   tension with its `.preview` package map. Keeping preview = base package keeps the
   entire internal-testing pipeline green with zero CI or store-portal changes.

**Therefore: only local `expo run` gets `.dev`. Every EAS build (development,
preview, production) resolves to the base `dev.rollercoaster.app`.** This needs no
`eas.json` change at all — an EAS build that never sets `APP_VARIANT` falls through
to the base package.

This also means `app.json` stays fully intact (we layer `app.config.js` over it),
so the two downstream `app.json` consumers keep working untouched:

- `.github/release-please-config.json` still finds `$.expo.version`.
- `.github/workflows/build-production.yml:276-277` still `jq`-reads the base
  `ios.bundleIdentifier` / `android.package` (= the production values) for Sentry
  release naming.

## Intent Verification

- [ ] `cd apps/native-rd && APP_VARIANT=development npx expo config --json | jq '{a:.android.package, i:.ios.bundleIdentifier}'` → both `dev.rollercoaster.app.dev`.
- [ ] Same with `APP_VARIANT` unset (the EAS case) → both `dev.rollercoaster.app`.
- [ ] Resolved config still contains every field from today's `app.json` (plugins, fonts, locales, `ios.infoPlist`, `extra.eas.projectId`, owner, …) — proves the `...config` layering drops nothing.
- [ ] On a device that already has an internal-test (EAS preview) build installed, `bun run native:android` installs `dev.rollercoaster.app.dev` instead of failing `INSTALL_FAILED_VERSION_DOWNGRADE` (human/device step).
- [ ] `bun run type-check` exits 0.
- [ ] `bun run lint` exits 0.
- [ ] No change to `eas.json`, `release-please-config.json`, or any `.github/workflows/*` (verified by `git diff --stat`).

## Dependencies

| Issue | Title | Status | Type |
| ----- | ----- | ------ | ---- |
| None  | —     | —      | —    |

**Status**: All dependencies met. `has_blockers: false`.

## Objective

Add a dynamic `app.config.js`, layered over the existing `app.json`, that rewrites
`android.package` and `ios.bundleIdentifier` to `dev.rollercoaster.app.dev` **only**
when `APP_VARIANT=development` (set by the local run scripts). Every other path —
including all EAS builds — resolves to the base `dev.rollercoaster.app`. Result:
local dev installs as a distinct app that coexists with any EAS build on the same
device, eliminating the downgrade error without touching the internal-testing
submit pipeline.

## Decisions

| ID  | Decision                                                                        | Alternatives Considered                                    | Rationale                                                                                                                                                                                                                                                                              |
| --- | ------------------------------------------------------------------------------- | ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Only local `expo run` gets `.dev`; all EAS builds stay base package             | Full `.dev`/`.preview`/base per the issue                  | The `.preview` split breaks both `build-internal.yml` store submits (TestFlight + Play internal), which is the live internal-testing pipeline. `.dev`-for-local alone fixes the reported friction. See Scope decision.                                                                 |
| D2  | No `eas.json` change                                                            | Add `APP_VARIANT` to dev/preview profiles (issue's step 2) | With only local needing `.dev`, EAS builds simply leave `APP_VARIANT` unset and fall through to base. Adding it to the EAS development profile would make EAS dev-client builds `.dev` too and could re-introduce a local-vs-EAS-dev `versionCode` collision under the `.dev` package. |
| D3  | Both `android.package` and `ios.bundleIdentifier` get the `.dev` suffix locally | Android-only                                               | One symmetric override is simpler and matches Expo's paired-identifier convention. iOS has no downgrade error class, but a distinct local iOS bundle id is harmless and keeps the two platforms' local installs consistent.                                                            |
| D4  | Keep `app.json` fully intact; layer via `({ config }) => ({ ...config, ... })`  | Reduce `app.json` to a version stub                        | Layering keeps release-please and the `build-production.yml` Sentry-finalize `jq` reads working untouched.                                                                                                                                                                             |
| D5  | No display-name suffix                                                          | `"Rollercoaster.dev (Dev)"`                                | Not in the issue; out of scope.                                                                                                                                                                                                                                                        |

## Affected Files

- `apps/native-rd/app.config.js` — **new**. ~20 lines.
- `apps/native-rd/scripts/run-android.sh` — one added `export` line.
- `apps/native-rd/scripts/run-ios.sh` — one added `export` line.
- `apps/native-rd/app.json` — **unchanged** (intentional; see D4).
- `apps/native-rd/eas.json` — **unchanged** (intentional; see D2).
- `.github/**` — **unchanged**.

## Implementation Plan

### Step 1 (commit 1): Add `app.config.js`

**Files**: `apps/native-rd/app.config.js` (new)
**Commit**: `feat(native-rd): add app.config.js so local builds use a .dev package`

```js
// app.config.js — dynamic Expo config layered over app.json.
//
// Expo passes the parsed app.json `expo` object in as `config`; we spread it and
// override only the package identifiers. Everything else (plugins, fonts, locales,
// infoPlist, permissions, splash, extra, owner, …) flows through `...config`
// untouched, so app.json stays the single source of truth for static config and
// for release-please's version bump.
//
// APP_VARIANT contract:
//   "development" → dev.rollercoaster.app.dev   (LOCAL `expo run` only — set by the run scripts)
//   anything else → dev.rollercoaster.app       (ALL EAS builds: development, preview, production)
//
// Why only local is split: the INSTALL_FAILED_VERSION_DOWNGRADE error only occurs
// between a local debug build (versionCode 1) and an EAS build (remote counter).
// EAS internal-test (preview) builds must keep the base package so they can still
// be submitted to TestFlight / Play internal — see docs/plans/dev-plans/issue-94-*.
const BASE_PACKAGE = "dev.rollercoaster.app";
const packageName =
  process.env.APP_VARIANT === "development"
    ? `${BASE_PACKAGE}.dev`
    : BASE_PACKAGE;

// CommonJS: the repo has no "type":"module" and eslint pins **/*.config.js to
// sourceType "commonjs". Expo's loader accepts module.exports of a function.
module.exports = ({ config }) => ({
  ...config,
  android: { ...config.android, package: packageName },
  ios: { ...config.ios, bundleIdentifier: packageName },
});
```

Behavior verified against `@expo/config@55.0.17` source (not just docs):

- `Config.js:274-289` — when an `app.config.{js,ts,…}` exists alongside `app.json`,
  the dynamic config is the active one; the static `app.json` is read only to build
  the argument. Both files coexisting is explicitly supported (`getConfigFilePaths`,
  `hasUnusedStaticConfig` flag).
- `Config.js:280-284` + `evalConfig.js:66-71` — our `export default` is invoked with
  `{ config: <app.json expo object, defaults filled> }`, i.e. `({ config })`.
- `evalConfig.js:62-83` — Expo tags the incoming static config with a
  `hasBaseStaticConfig` symbol and warns ("unused static config") if the returned
  object doesn't carry it through. **`...config` is therefore required**: object
  spread copies that symbol, preserving every `app.json` field _and_ silencing the
  warning. Do not drop the spread.

The config-resolution test below is still worth running at implement time as a cheap
end-to-end confirmation.

### Step 2 (commit 2): Export `APP_VARIANT` in local-run scripts

**Files**: `apps/native-rd/scripts/run-android.sh`, `apps/native-rd/scripts/run-ios.sh`
**Commit**: `feat(native-rd): export APP_VARIANT=development in local run scripts`

In each script, immediately after the `.env.local` sourcing block (so a value in
`.env.local` or the caller's environment still wins), add:

```sh
# Local dev installs the .dev package so it coexists with EAS builds instead of
# triggering INSTALL_FAILED_VERSION_DOWNGRADE. Caller can override APP_VARIANT.
export APP_VARIANT="${APP_VARIANT:-development}"
```

## Testing Strategy

- No unit tests — pure configuration.
- `bun run type-check` → 0; `bun run lint` → 0.
- **Config resolution check** (runnable here — no native build, no EAS):
  - `cd apps/native-rd && APP_VARIANT=development npx expo config --json | jq '{a:.android.package, i:.ios.bundleIdentifier}'` → both `…​.dev`.
  - no `APP_VARIANT` → both `dev.rollercoaster.app`.
  - confirm `plugins`, `locales`, `extra.eas.projectId`, `ios.infoPlist` still present in the resolved JSON.
- `git diff --stat` shows only `app.config.js` (new) + the two run scripts.

## Human / EAS Steps (NOT automatable here — do after merge)

Per repo rule, this agent never runs EAS builds/submits or local prebuild:

1. `npx expo prebuild --clean` — from `apps/native-rd/`. Regenerates the gitignored
   `android/`/`ios/`; confirms `applicationId` / `PRODUCT_BUNDLE_IDENTIFIER` resolve
   to `.dev` locally. (Local `expo run` does this for you, but a clean prebuild is
   the explicit confirmation.)
2. Android device test: with an EAS internal-test build already installed, run
   `bun run native:android` → expect no downgrade error;
   `adb shell pm list packages | grep rollercoaster` shows both the base package and
   `dev.rollercoaster.app.dev`.
3. `eas build:version:sync` — only if you want to realign local `versionCode` state
   with the remote counter. Optional now that local uses a separate package; the
   counter no longer matters for local installs. Documented for completeness.

## Risks / Notes (for the PR description)

- **Orphan local install.** A device with the current `dev.rollercoaster.app` _local
  debug_ build won't auto-remove it; the new `.dev` install lands beside it as a
  second icon. One-time cleanup: `adb uninstall dev.rollercoaster.app` (only removes
  a _local_ debug install — does not touch an EAS internal-test build of the same
  package, which lives under the same id; if you have an EAS build installed, leave
  it). Note this in the PR body.
- **EAS internal-test builds are unaffected.** They keep the base package and their
  TestFlight / Play-internal submit paths (`build-internal.yml`,
  `build-play-internal.yml`) work exactly as today.

## Not in Scope

| Item                                            | Reason                                                                                                     | Follow-up                                                                                                |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `.preview` package for the preview profile      | Breaks the live internal-testing submit pipeline (TestFlight + Play internal); buys nothing pre-production | Revisit only if a separate preview store presence is ever wanted, with its own ASC record + Play listing |
| Per-variant icons / display names               | Issue defers icons; names not mentioned                                                                    | Follow-up issue if desired                                                                               |
| Resetting the inflated production `versionCode` | Cosmetic; irrelevant now that local uses its own package                                                   | None                                                                                                     |

## Discovery Log

<!-- Entries added by implement skill:
- [YYYY-MM-DD HH:MM] <discovery description>
-->

- [2026-06-12] **Evaluation: issue still needed.** Friction mechanism intact —
  `eas.json` still `appVersionSource: "remote"` + production `autoIncrement: true`;
  `android/` is gitignored (versionCode resets on prebuild); `grep APP_VARIANT`
  across the app returned nothing (no prior partial impl); no commit had addressed
  the local-vs-EAS downgrade collision. Proceeded with implementation.
- [2026-06-12] **CommonJS, not ESM.** The plan's `export default` snippet failed
  the pre-commit eslint hook (`'import' and 'export' may appear only with
'sourceType: module'`). Repo has no `"type":"module"` and `eslint.config.js`
  pins `**/*.config.js` to `sourceType: "commonjs"` (matching `babel.config.js` /
  `metro.config.js`). Switched to `module.exports`; `npx expo config --json`
  confirms resolution is identical. Snippet above corrected.
