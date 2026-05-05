const { getDefaultConfig } = require("expo/metro-config");
const { withSentryConfig } = require("@sentry/react-native/metro");
const {
  withStorybook,
} = require("@storybook/react-native/metro/withStorybook");
const path = require("path");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Expo SDK 54 auto-detects monorepo workspace layout (projectRoot,
// watchFolders, nodeModulesPaths) — no manual overrides needed.

// Bun uses symlinks for node_modules — tell Metro to follow them
config.resolver.unstable_enableSymlinks = true;

// Ensure Metro respects package.json "exports" for subpath imports like
// @rollercoaster-dev/design-tokens/unistyles
config.resolver.unstable_enablePackageExports = true;

// jose (a dependency of @rollercoaster-dev/openbadges-core) ships only ESM
// output with no CJS fallback. Metro can't bundle it statically.
// We stub it out because we only call serializeOB3 at runtime — the signing
// functions that use jose are never invoked in native code (keyProvider handles
// signing via Expo SecureStore).
const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "jose") {
    return { type: "empty" };
  }
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

// Evolu: allow .wasm assets to be bundled
config.resolver.assetExts = [...(config.resolver.assetExts ?? []), "wasm"];

// Evolu: COOP/COEP headers required for SharedArrayBuffer (web only)
config.server = {
  ...config.server,
  enhanceMiddleware: (middleware) => (req, res, next) => {
    res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
    res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
    return middleware(req, res, next);
  },
};

// Sentry: generate Debug IDs that correlate the JS bundle to its sourcemap.
// Required alongside the @sentry/react-native/expo config plugin — the latter
// uploads sourcemaps during native builds, this one tags the bundle so Sentry
// can match the upload to the right release. Must wrap the config before
// Storybook so Storybook can opt out cleanly when STORYBOOK_ENABLED.
const sentryConfig = withSentryConfig(config);

module.exports = withStorybook(sentryConfig, {
  configPath: path.resolve(__dirname, "./.storybook"),
  enabled: process.env.EXPO_PUBLIC_STORYBOOK_ENABLED === "true",
});
