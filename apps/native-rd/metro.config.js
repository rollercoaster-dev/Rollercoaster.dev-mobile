const { getSentryExpoConfig } = require("@sentry/react-native/metro");
const {
  withStorybook,
} = require("@storybook/react-native/metro/withStorybook");
const path = require("path");

// Sentry's Expo-aware helper: wraps `expo/metro-config`'s getDefaultConfig and
// injects Debug ID generation into Expo's asset-serialization pipeline (the
// supported integration point for SDK 50+). Replaces the `withSentryConfig`
// wrapper, which is for plain RN and is incompatible with Expo's static
// export serializer (returns assets array, not { code, map }).
/** @type {import('expo/metro-config').MetroConfig} */
const config = getSentryExpoConfig(__dirname);

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

module.exports = withStorybook(config, {
  configPath: path.resolve(__dirname, "./.storybook"),
  enabled: process.env.EXPO_PUBLIC_STORYBOOK_ENABLED === "true",
});
