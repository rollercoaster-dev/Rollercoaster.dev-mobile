# Expo App Variants — End the `INSTALL_FAILED_VERSION_DOWNGRADE` Friction

**Date:** 2026-05-18
**Status:** Planned, deferred (separate PR from badge-export branch)
**Issue:** [#94](https://github.com/rollercoaster-dev/Rollercoaster.dev-mobile/issues/94)
**Triggered by:** Recurring local-dev install failures after EAS preview/production builds; user observation that manual `versionCode` bumps may have driven the production Android counter to 10 instead of an expected ~3.

---

## Problem

The dev workflow is currently asymmetric across distribution channels:

- **Local debug** (`bun run native:android` → `npx expo run:android`) installs `dev.rollercoaster.app` at `versionCode 1` from `android/app/build.gradle`. That value is set by `expo prebuild` and is gitignored downstream.
- **EAS preview / production** also installs `dev.rollercoaster.app`, but with `eas.json` configured `"appVersionSource": "remote"` and the production profile `"autoIncrement": true`. Each build advances a server-side counter (currently 10).

When the same physical device receives an EAS build first and a local debug build second, Android rejects the local install with `INSTALL_FAILED_VERSION_DOWNGRADE: Downgrade detected: Update version code 1 is older than current 10`. The user has been working around this by manually bumping the local `versionCode`, which (a) gets blown away on the next `expo prebuild` and (b) is suspected to have inflated the EAS counter through frequent rebuilds.

## Decision

Adopt Expo's documented "multiple app variants" pattern. Local dev, EAS preview, and EAS production each install as a **separate Android package** on the device and coexist. Version-downgrade conflicts become structurally impossible across profiles, and the EAS remote counter only advances when an EAS build actually runs.

This is the canonical Expo recommendation. Two relevant doc pages:

- [Install app variants on the same device](https://docs.expo.dev/build-reference/variants/)
- [Configure multiple app variants (tutorial)](https://docs.expo.dev/tutorial/eas/multiple-app-variants/)

Expo explicitly **rejects** `applicationIdSuffix` because EAS CLI does not detect suffix declarations in `productFlavors` or `buildTypes`. The Expo-blessed mechanism is environment-driven dynamic config.

## Out of scope

- The badge-export branch (`sentry-investigation-badges-not-baking`) ships first, separately.
- Per-variant **icons** — Expo recommends visually distinct icons per variant so the dev/preview/prod installs are distinguishable on the home screen. Out of scope for this plan; track as a follow-up if asset divergence is desired.
- iOS variant work — analogous via `ios.bundleIdentifier` per variant, but iOS doesn't surface the same downgrade error class. Include in this PR only if it's free; otherwise defer.

## Approach

Single PR. Touches three files, requires one `expo prebuild` regen, no code-side React changes.

### Step 1 — Convert `app.json` → `app.config.js`

`app.json` is static; `app.config.js` runs at build time and can read `process.env`. Move every existing field across verbatim, then override the package field based on `APP_VARIANT`.

**File:** `apps/native-rd/app.config.js` (new)

```js
// Variant key drives android.package and ios.bundleIdentifier so dev, preview,
// and production installs coexist on the same device. Set by eas.json env
// for EAS builds; set by scripts/run-android.sh (and run-ios.sh) for local
// dev. Unset = production.
const APP_VARIANT = process.env.APP_VARIANT;

const isDev = APP_VARIANT === "development";
const isPreview = APP_VARIANT === "preview";

const BASE_PACKAGE = "dev.rollercoaster.app";
const androidPackage = isDev
  ? `${BASE_PACKAGE}.dev`
  : isPreview
    ? `${BASE_PACKAGE}.preview`
    : BASE_PACKAGE;

const baseName = "Rollercoaster.dev";
const displayName = isDev
  ? `${baseName} (Dev)`
  : isPreview
    ? `${baseName} (Preview)`
    : baseName;

module.exports = ({ config }) => ({
  ...config,
  // …every field currently in app.json, copied across, except:
  name: displayName,
  android: {
    ...config.android,
    package: androidPackage,
  },
  ios: {
    ...config.ios,
    bundleIdentifier: androidPackage, // mirror the variant
  },
});
```

Delete `app.json` once the conversion is verified.

### Step 2 — Wire `APP_VARIANT` into EAS profiles

**File:** `apps/native-rd/eas.json` (modify)

Add `"env": { "APP_VARIANT": "development" }` to the `development` profile and `"env": { "APP_VARIANT": "preview" }` to `preview`. Production stays unset → falls through to the base package.

### Step 3 — Wire `APP_VARIANT` into local scripts

**File:** `apps/native-rd/scripts/run-android.sh` (modify)

Export `APP_VARIANT=development` before invoking `npx expo run:android`. Same for `scripts/run-ios.sh` if doing iOS in this PR.

### Step 4 — Sync the remote versionCode counter

After steps 1–3 land, run once locally:

```sh
eas build:version:sync
```

This pulls the authoritative remote `versionCode` into local state so subsequent EAS builds don't race the counter. Expo documents this as the canonical sync command when `appVersionSource: "remote"` is set.

### Step 5 — Regenerate native projects

```sh
cd apps/native-rd
npx expo prebuild --clean
```

Confirms the `android.package` field propagates into a freshly-generated `android/app/build.gradle` `applicationId`. The generated tree is gitignored, but the regen catches misconfiguration early.

## Verification

Local:

1. `bun run type-check` — green.
2. `bun run lint` — green.
3. `npx expo run:android` on a clean device — package installs as `dev.rollercoaster.app.dev`.
4. Trigger an EAS preview build (`eas build --profile preview --platform android`) → install on the same device → package installs as `dev.rollercoaster.app.preview`. Both apps appear side-by-side on the home screen.
5. EAS production build → installs as `dev.rollercoaster.app`. All three coexist.

CI / release pipeline:

6. Re-read `.github/workflows/build-production.yml` and `release-please-config.json` — confirm the new `app.config.js` doesn't break any release-please file-path matchers or CI step that expected `app.json`.
7. Verify `eas submit` to the Play Internal track still picks up the production package name (no `.preview` / `.dev` suffix leakage).

## Risks / explicit non-defaults

- **Play Console listing.** The production package `dev.rollercoaster.app` is the registered Play Store listing. `eas.json` already uses that base ID for the production profile, and the variant config falls through to it when `APP_VARIANT` is unset — but worth confirming Play Console settings haven't drifted before the first production release post-conversion.
- **Bundle identifier change on existing devices.** If anyone has the current dev build (`dev.rollercoaster.app`, locally-installed debug) and pulls this branch, their next `npx expo run:android` will install `dev.rollercoaster.app.dev` alongside — the old install does **not** auto-uninstall. Document this in the PR.
- **`app.config.js` is JS, not JSON.** Code-review needs to confirm no field is silently lost in the conversion. Defensive: keep `app.json` in the commit briefly, then delete in a follow-up after manual diff against the resolved `app.config.js` output (`npx expo config --type prebuild`).
- **iOS scope creep.** If iOS variants are added in the same PR, the iOS provisioning profiles need to be regenerated for the new bundle IDs. EAS handles this on first build but it's still a remote operation per profile.

## References

- [Expo: Install app variants on the same device](https://docs.expo.dev/build-reference/variants/)
- [Expo Tutorial: Configure multiple app variants](https://docs.expo.dev/tutorial/eas/multiple-app-variants/)
- [Expo: App version management](https://docs.expo.dev/build-reference/app-versions/)
- [eas.json reference](https://docs.expo.dev/eas/json/)
- Existing release pipeline: [docs/plans/2026-05-14-release-pipeline.md](./2026-05-14-release-pipeline.md)
