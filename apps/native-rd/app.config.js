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
// be submitted to TestFlight / Play internal — see docs/plans/dev-plans/issue-94-expo-app-variants.md.
//
// The `...config` spread is required: @expo/config tags the incoming static config
// with a `hasBaseStaticConfig` symbol and warns ("unused static config") if the
// returned object doesn't carry it through. Object spread copies that symbol and
// every app.json field. Do not drop it.
const BASE_PACKAGE = "dev.rollercoaster.app";
const packageName =
  process.env.APP_VARIANT === "development"
    ? `${BASE_PACKAGE}.dev`
    : BASE_PACKAGE;

// CommonJS export: the repo has no "type":"module" and eslint pins
// **/*.config.js to sourceType "commonjs" (see eslint.config.js). Expo's
// config loader accepts module.exports of a function just like a default export.
module.exports = ({ config }) => ({
  ...config,
  android: { ...config.android, package: packageName },
  ios: { ...config.ios, bundleIdentifier: packageName },
});
