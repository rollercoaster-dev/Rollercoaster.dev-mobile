// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");
const nodeCommonJsGlobals = {
  __dirname: "readonly",
  module: "readonly",
  process: "readonly",
  require: "readonly",
};

const localRules = {
  plugins: {
    local: {
      rules: {
        "no-raw-colors": require("./src/eslint-rules/no-raw-colors"),
        "no-component-imports-screens": require("./src/eslint-rules/no-component-imports-screens"),
        "file-size-limit": require("./src/eslint-rules/file-size-limit"),
        "no-validate-at-boundaries": require("./src/eslint-rules/no-validate-at-boundaries"),
        "no-shared-component-reimplementation": require("./src/eslint-rules/no-shared-component-reimplementation"),
        "require-barrel-export": require("./src/eslint-rules/require-barrel-export"),
      },
    },
  },
  rules: {
    "local/no-raw-colors": "error",
    "local/no-component-imports-screens": "error",
    "local/file-size-limit": "warn",
    "local/no-validate-at-boundaries": "warn",
    "local/no-shared-component-reimplementation": "warn",
    "local/require-barrel-export": "error",
  },
};

module.exports = defineConfig([
  expoConfig,
  {
    files: [
      "**/*.config.js",
      "**/jest.resolver.js",
      "**/src/eslint-rules/**/*.js",
    ],
    languageOptions: {
      globals: nodeCommonJsGlobals,
      sourceType: "commonjs",
    },
  },
  {
    files: ["**/src/__tests__/eslint-rules/**/*.ts"],
    languageOptions: {
      globals: nodeCommonJsGlobals,
    },
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  localRules,
  {
    settings: {
      "import/core-modules": [
        "@rollercoaster-dev/openbadges-core",
        "@rollercoaster-dev/design-tokens/unistyles",
      ],
    },
    ignores: ["dist/*"],
  },
]);
