// app.config.js — dynamic Expo config layered over app.json.
//
// Expo passes the parsed app.json `expo` object in as `config`; we spread it and
// override only the package identifiers. Everything else (plugins, fonts, locales,
// infoPlist, permissions, splash, extra, owner, …) flows through `...config`
// untouched, so app.json stays the single source of truth for static config and
// for release-please's version bump.
//
// APP_VARIANT contract:
//   "development" → android.package dev.rollercoaster.app.dev + an extra URL scheme
//                   `rollercoasterdev-dev`   (LOCAL `expo run` only — set by the run scripts)
//   anything else → dev.rollercoaster.app, no extra scheme (ALL EAS builds: development,
//                   preview, production)
//
// Why the extra scheme: expo-dev-client registers `exp+<slug>` on EVERY build of
// this app, so a phone carrying both the store build and the local `.dev` build
// raises an Android app-chooser on `exp+rollercoasterdev://…`, and the Maestro
// suite hangs on it (docs/plans/dev-plans/2026-09-03-android-device-e2e.md,
// obstacle 6). `rollercoasterdev-dev://expo-development-client/?url=…` is
// registered by the local variant alone, so the dev launcher opens without a
// chooser. The flows default `DEV_CLIENT_SCHEME` to `exp+rollercoasterdev`;
// scripts/run-e2e.sh --android rewrites that default (e2e/README.md → Android).
//
// Why only local is split: the INSTALL_FAILED_VERSION_DOWNGRADE error only occurs
// between a local debug build (versionCode 1) and an EAS build (remote counter).
// EAS internal-test (preview) builds must keep the base package so they can still
// be submitted to TestFlight / Play internal — see docs/plans/dev-plans/issue-94-expo-app-variants.md.
//
// Why iOS keeps the base bundle id unconditionally: iOS has no downgrade-collision
// error class (the friction is Android-only), so a `.dev` suffix on iOS buys nothing
// functional — and it would break the local Maestro E2E suite, which hardcodes
// `dev.rollercoaster.app` in scripts/run-e2e.sh (UserDefaults seeding) and every
// e2e/flows/*.yaml `appId`, plus the ASC/TestFlight record. So only `android.package`
// is suffixed. See decision D3 in the dev plan.
//
// The `...config` spread is required: @expo/config tags the incoming static config
// with a `hasBaseStaticConfig` symbol and warns ("unused static config") if the
// returned object doesn't carry it through. Object spread copies that symbol and
// every app.json field. Do not drop it.
const BASE_PACKAGE = "dev.rollercoaster.app";
const LOCAL_DEV_SCHEME = "rollercoasterdev-dev";

// CommonJS export: the repo has no "type":"module" and eslint pins
// **/*.config.js to sourceType "commonjs" (see eslint.config.js). Expo's
// config loader accepts module.exports of a function just like a default export.
module.exports = ({ config }) => {
  const isLocalDevVariant = process.env.APP_VARIANT === "development";
  const packageName = isLocalDevVariant ? `${BASE_PACKAGE}.dev` : BASE_PACKAGE;
  return {
    ...config,
    // Top-level `scheme` is the only place Expo accepts one, so the local iOS
    // build picks it up too. Harmless there: the bundle id is unchanged and the
    // dev launcher still answers `exp+rollercoasterdev://`.
    ...(isLocalDevVariant ? { scheme: LOCAL_DEV_SCHEME } : {}),
    android: { ...config.android, package: packageName },
    // iOS unconditionally keeps the base bundle id — see header note.
    ios: config.ios,
  };
};
