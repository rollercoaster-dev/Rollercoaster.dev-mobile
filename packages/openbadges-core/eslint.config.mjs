/**
 * ESLint configuration for openbadges-core
 * Uses shared config from @rollercoaster-dev/shared-config
 */

import { node } from "@rollercoaster-dev/shared-config/eslint";

export default [
  {
    ignores: [
      "dist/**",
      "coverage/**",
      "node_modules/**",
      "*.tsbuildinfo",
    ],
  },
  ...node,
  {
    files: ["**/*.ts"],
    rules: {
      // Core package: must not import from apps or UI layer
      // See docs/architecture/overview.md#prohibited-import-directions
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "openbadges-ui",
              message: "packages/* must not import from apps or UI layer. See docs/architecture/overview.md",
            },
            {
              name: "@rollercoaster-dev/design-tokens",
              message: "openbadges-core must not import design-tokens (different layer). See docs/architecture/overview.md",
            },
          ],
        },
      ],
    },
  },
  {
    // Web API globals available in Node.js 18+ and Bun
    languageOptions: {
      globals: {
        CryptoKey: "readonly",
        TextEncoder: "readonly",
        TextDecoder: "readonly",
        Buffer: "readonly",
      },
    },
  },
  {
    files: ["**/*.test.ts", "**/*.spec.ts", "tests/**/*.ts"],
    languageOptions: {
      globals: {
        // Bun test environment
        describe: "readonly",
        it: "readonly",
        test: "readonly",
        expect: "readonly",
        beforeEach: "readonly",
        afterEach: "readonly",
        beforeAll: "readonly",
        afterAll: "readonly",
        // Node.js globals for tests
        console: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        URL: "readonly",
      },
    },
  },
];
