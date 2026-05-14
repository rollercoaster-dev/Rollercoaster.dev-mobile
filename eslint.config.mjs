/**
 * Root ESLint configuration for lint-staged
 *
 * This config enables eslint to run from the repo root during pre-commit hooks.
 * Individual packages have their own eslint.config.mjs for direct linting:
 *   - apps/native-rd uses eslint-config-expo via `expo lint`
 *   - packages/openbadges-core uses a local flat config
 */

import js from "@eslint/js";

const nodeCommonJsGlobals = {
  __dirname: "readonly",
  module: "readonly",
  process: "readonly",
  require: "readonly",
};

export default [
  js.configs.recommended,

  // Node/Bun globals for core library (works with binary data)
  {
    files: ["packages/openbadges-core/**/*.ts"],
    languageOptions: {
      globals: {
        Buffer: "readonly",
        CryptoKey: "readonly",
        TextEncoder: "readonly",
        TextDecoder: "readonly",
      },
    },
  },

  // Core package must not import the UI/design-tokens layers
  {
    files: ["packages/openbadges-core/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@rollercoaster-dev/design-tokens",
              message:
                "Core package: must not import design-tokens (different layer).",
            },
          ],
        },
      ],
    },
  },

  // Scripts and examples are not application code
  {
    files: ["**/scripts/**/*.ts", "**/examples/**/*.js"],
    rules: {
      "no-console": "off",
    },
  },

  // Test globals for test files across all packages
  {
    files: [
      "**/test/**/*.ts",
      "**/*.test.ts",
      "**/*.spec.ts",
      "**/__tests__/**/*.ts",
      "**/*.test.setup.ts",
    ],
    languageOptions: {
      globals: {
        describe: "readonly",
        it: "readonly",
        test: "readonly",
        expect: "readonly",
        beforeEach: "readonly",
        afterEach: "readonly",
        beforeAll: "readonly",
        afterAll: "readonly",
        vi: "readonly",
        jest: "readonly",
        console: "readonly",
        global: "readonly",
      },
    },
    rules: {
      "no-console": "off",
    },
  },

  // native-rd uses CommonJS for local toolchain/config glue and ESLint RuleTester harnesses
  {
    files: [
      "apps/native-rd/*.config.js",
      "apps/native-rd/jest.resolver.js",
      "apps/native-rd/src/eslint-rules/**/*.js",
    ],
    languageOptions: {
      globals: nodeCommonJsGlobals,
      sourceType: "commonjs",
    },
  },
  {
    files: ["apps/native-rd/src/__tests__/eslint-rules/**/*.ts"],
    languageOptions: {
      globals: nodeCommonJsGlobals,
    },
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },

  // Ignore patterns
  {
    ignores: [
      "**/dist/**",
      "**/build/**",
      "**/node_modules/**",
      "**/.bun-cache/**",
      "**/coverage/**",
      "**/*.d.ts",
      ".claude/**",
      "apps/native-rd/**",
    ],
  },
];
