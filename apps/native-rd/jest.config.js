/**
 * Jest configuration for native-rd
 *
 * Runs React Native tests under Node via babel-jest. Key constraints:
 *
 * 1. Bun symlink layout: monorepo `bun install` stores packages under
 *    `node_modules/.bun/<pkg@ver>/node_modules/<pkg>`, so regex patterns
 *    must account for the optional `.bun/` prefix.
 *
 * 2. ESM transform: RN and several Expo packages ship ESM or Flow source
 *    that must be transpiled by Babel before Jest can load them.
 *
 * 3. Native modules: packages that require a native runtime (camera, audio,
 *    SQLite, etc.) are redirected to manual mocks via moduleNameMapper.
 *
 * See also: jest.resolver.js (RN 0.81 ESM spec file workaround)
 */
module.exports = {
  // Transpile all JS/TS through Babel so Flow and ESM source is consumable
  transform: {
    "^.+\\.[jt]sx?$": "babel-jest",
  },

  // RN's custom test environment patches global (ErrorUtils, __DEV__, etc.)
  testEnvironment: "react-native/jest/react-native-env.js",

  // Custom resolver that stubs RN 0.81 specs_DEPRECATED ESM files
  resolver: "./jest.resolver.js",

  // Haste module system — RN uses this for platform-specific file resolution
  // defaultPlatform: "ios" means *.ios.ts is preferred over *.android.ts
  haste: {
    defaultPlatform: "ios",
    platforms: ["android", "ios", "native"],
  },

  // Redirect native/binary modules to manual mocks that work in Node
  moduleNameMapper: {
    // Binary assets → simple string stub
    "\\.(png|jpg|jpeg|gif|webp|svg)$":
      "<rootDir>/src/__tests__/mocks/fileMock.js",

    // Evolu (local-first SQLite) — requires native SQLite driver
    "^@evolu/common$": "<rootDir>/src/db/__tests__/mocks/evolu-common.ts",
    "^@evolu/react$": "<rootDir>/src/__tests__/mocks/evolu-react.ts",
    "^@evolu/react-native/expo-sqlite$":
      "<rootDir>/src/__tests__/mocks/evolu-react-native.ts",
    "../shims/rd-logger": "<rootDir>/src/db/__tests__/mocks/rd-logger.ts",

    // Animation/styling — native thread integration
    "^react-native-reanimated$": "<rootDir>/src/__tests__/mocks/reanimated.ts",
    "^react-native-unistyles$": "<rootDir>/src/__tests__/mocks/unistyles.ts",

    // Layout — native safe area insets
    "^react-native-safe-area-context$":
      "<rootDir>/src/__tests__/mocks/safe-area-context.ts",

    // Expo native modules — require device APIs unavailable in Node
    "^expo-audio$": "<rootDir>/src/__tests__/mocks/expo-audio.ts",
    "^expo-sharing$": "<rootDir>/src/__tests__/mocks/expo-sharing.ts",
    "^expo-file-system$": "<rootDir>/src/__tests__/mocks/expo-file-system.ts",
    "^expo-file-system/legacy$":
      "<rootDir>/src/__tests__/mocks/expo-file-system.ts",
    "^expo-video$": "<rootDir>/src/__tests__/mocks/expo-video.ts",
    "^expo-secure-store$": "<rootDir>/src/__tests__/mocks/expo-secure-store.ts",

    // Navigation — native stack navigator
    "^@react-navigation/native$": "<rootDir>/src/__tests__/mocks/navigation.ts",

    // Other native modules
    "^react-native-view-shot$":
      "<rootDir>/src/__tests__/mocks/react-native-view-shot.ts",
    "^react-native-keyboard-controller$":
      "<rootDir>/src/__tests__/mocks/keyboard-controller.ts",
  },

  // Allow Babel to transform these packages (they ship ESM or Flow source).
  // The optional `.bun/.*?/node_modules/` prefix handles Bun's symlink layout
  // where packages live at node_modules/.bun/<pkg@ver>/node_modules/<pkg>.
  transformIgnorePatterns: [
    "node_modules/(?!(\\.bun/.*?/node_modules/)?(@rollercoaster-dev/design-tokens|@testing-library/react-native|expo|react-native|@react-native|phosphor-react-native|react-native-keyboard-controller)/)",
  ],

  // require.resolve follows Bun symlinks correctly; raw string paths break
  // under the .bun/ layout. The db setup file is inside rootDir so Jest
  // resolves it without needing require.resolve.
  setupFiles: [
    require.resolve("react-native/jest/setup"),
    "./src/db/__tests__/setup.ts",
  ],

  // Tests colocated under src/__tests__/ mirroring the src/ directory structure
  testMatch: ["**/src/**/__tests__/**/*.test.{ts,tsx}"],
};
