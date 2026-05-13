/**
 * Application entry point
 * Order matters: crypto → polyfills → unistyles → sentry → i18n → app
 *
 * Sentry comes before i18n so that any throw from i18next init reaches
 * telemetry. i18n still precedes the App require, so screen modules
 * never see an uninitialized t().
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

// 4. Initialise Sentry before any app code runs.
// No-ops in __DEV__; runs in EAS preview / TestFlight / production.
// See src/services/sentry.ts for the privacy posture.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { initSentry, wrap: sentryWrap } = require("./src/services/sentry");
initSentry();

// 5. Initialise i18next synchronously, after Sentry so any init throw is
// captured by telemetry. Must run before the App require below so screen
// module-level t() calls cannot race init.
require("./src/i18n");

// 6. Register the app (or Storybook when EXPO_PUBLIC_STORYBOOK_ENABLED is set)
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { registerRootComponent } = require("expo");

if (process.env.EXPO_PUBLIC_STORYBOOK_ENABLED === "true") {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const StorybookUI = require("./.storybook").default;
  registerRootComponent(StorybookUI);
} else {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { App } = require("./App");
  registerRootComponent(
    sentryWrap(App, {
      touchEventBoundaryProps: {
        enableRageTapDetection: false,
        maxComponentTreeSize: 0,
      },
    }),
  );
}
