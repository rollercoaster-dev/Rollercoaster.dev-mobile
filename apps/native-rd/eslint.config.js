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
        "no-raw-jsx-strings": require("./src/eslint-rules/no-raw-jsx-strings"),
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
    "local/no-raw-jsx-strings": "error",
  },
};

module.exports = defineConfig([
  expoConfig,
  {
    // Prototype bundles are design-exploration references — HTML snapshots plus
    // copied-in stale screen code (deprecated APIs, unresolved imports). They are
    // not maintained source, so exclude the whole tree from lint. (Standalone
    // `ignores`-only object = global ignore.)
    ignores: ["**/prototypes/**"],
  },
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
    // Type-scaling policy (#741): useTypeScale() is the only OS font-scale
    // reader, so caps and thresholds can't be bypassed. See
    // docs/accessibility-guidelines.md#text-scaling. Flat config replaces rule
    // options instead of merging them: add any future no-restricted-syntax
    // selectors for src/ to this block, or they will drop these.
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/hooks/useTypeScale.ts"],
    rules: {
      "no-restricted-syntax": [
        "error",
        ...[
          "MemberExpression[object.name='PixelRatio'][property.name='getFontScale']",
          "VariableDeclarator[init.callee.name='useWindowDimensions'] > ObjectPattern > Property[key.name='fontScale']",
          "MemberExpression[object.callee.name='useWindowDimensions'][property.name='fontScale']",
          "MemberExpression[object.callee.object.name='Dimensions'][property.name='fontScale']",
          "VariableDeclarator[init.callee.object.name='Dimensions'] > ObjectPattern > Property[key.name='fontScale']",
        ].map((selector) => ({
          selector,
          message:
            "Read the OS font scale through useTypeScale() (src/hooks/useTypeScale.ts).",
        })),
      ],
    },
  },
  {
    // SDK 56 bumped eslint-config-expo to v56, which enables eslint-plugin-react-hooks
    // v6 (the React Compiler ruleset) at "error". That surfaced 40 pre-existing findings
    // across ~15 files. To keep the SDK-56 bump focused, these are downgraded to "warn"
    // (visible, non-blocking) pending a dedicated cleanup. See follow-up issue #319.
    rules: {
      "react-hooks/refs": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/static-components": "warn",
      "react-hooks/exhaustive-deps": "warn",
      "react-hooks/immutability": "warn",
    },
  },
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
