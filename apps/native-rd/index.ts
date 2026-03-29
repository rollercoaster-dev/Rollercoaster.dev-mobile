/**
 * Application entry point
 * Order matters: crypto → polyfills → unistyles → app
 *
 * Using require() instead of import to guarantee execution order —
 * Babel's commonjs transform hoists import-converted-requires above
 * interleaved statements.
 */

// 1. Install crypto globals (native only — no web support).
// v1.0.10+ adds OKP/Ed25519 JWK export support.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { Platform } = require("react-native");
if (Platform.OS !== "web") {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { install } = require("react-native-quick-crypto");
  install();
}

// 2. Hermes polyfills (Set methods, AbortSignal, Promise.withResolvers)
require("./polyfills");

// 3. Unistyles theme configuration
require("./unistyles");

// 4. Register the app (or Storybook when EXPO_PUBLIC_STORYBOOK_ENABLED is set)
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { registerRootComponent } = require("expo");

if (process.env.EXPO_PUBLIC_STORYBOOK_ENABLED === "true") {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const StorybookUI = require("./.storybook").default;
  registerRootComponent(StorybookUI);
} else {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { App } = require("./App");
  registerRootComponent(App);
}
