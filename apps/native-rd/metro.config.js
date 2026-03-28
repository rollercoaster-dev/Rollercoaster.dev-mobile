/* global require, __dirname, module */
const { getDefaultConfig } = require("expo/metro-config");
const {
  withStorybook,
} = require("@storybook/react-native/metro/withStorybook");
const path = require("path");

// Monorepo root — needed so Metro can resolve workspace-linked packages
const monorepoRoot = path.resolve(__dirname, "../..");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Watch the monorepo root for workspace packages (symlinked from packages/*)
config.watchFolders = [monorepoRoot];

// Resolve node_modules from both the app and the monorepo root
config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, "node_modules"),
  path.resolve(monorepoRoot, "node_modules"),
];

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
