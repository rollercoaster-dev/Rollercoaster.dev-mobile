/**
 * Root ESLint configuration for lint-staged
 *
 * This config enables eslint to run from the monorepo root during pre-commit hooks.
 * Individual packages may have their own eslint.config.mjs for IDE integration,
 * but lint-staged uses this root config.
 */

import { vue } from './packages/shared-config/eslint.config.mjs';

export default [
  // Vue config (includes TypeScript rules for .ts, .tsx, .vue files)
  ...vue,

  // Additional node globals for backend files
  {
    files: ['apps/openbadges-modular-server/**/*.ts', 'apps/openbadges-system/src/server/**/*.ts'],
    languageOptions: {
      globals: {
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
      },
    },
  },

  // Node/Bun globals for core library (works with binary data)
  {
    files: ['packages/openbadges-core/**/*.ts'],
    languageOptions: {
      globals: {
        Buffer: 'readonly',
        CryptoKey: 'readonly',
        TextEncoder: 'readonly',
        TextDecoder: 'readonly',
      },
    },
  },

  // Bun globals for Bun-native packages
  {
    files: ['packages/claude-knowledge/**/*.ts'],
    languageOptions: {
      globals: {
        Bun: 'readonly',
        process: 'readonly',
      },
    },
  },

  // Test globals for test files across all packages
  {
    files: ['**/test/**/*.ts', '**/*.test.ts', '**/*.spec.ts', '**/__tests__/**/*.ts'],
    languageOptions: {
      globals: {
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        console: 'readonly',
      },
    },
  },

  // Ignore patterns for the entire monorepo
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/.bun-cache/**',
      '**/coverage/**',
      '**/*.d.ts',
      '.claude/**',
      'experiments/**',
    ],
  },
];
