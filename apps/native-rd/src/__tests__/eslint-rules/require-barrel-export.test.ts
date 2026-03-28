const { RuleTester } = require('eslint');
const rule = require('../../eslint-rules/require-barrel-export');
const fs = require('fs');
const path = require('path');

const BUTTON_DIR = path.resolve(__dirname, '../../components/Button');
const BUTTON_FILE = path.resolve(__dirname, '../../components/Button/Button.tsx');

// Sanity check: Button dir has a barrel export
test('sanity: Button component has index.ts', () => {
  expect(
    fs.existsSync(path.join(BUTTON_DIR, 'index.ts')) ||
      fs.existsSync(path.join(BUTTON_DIR, 'index.tsx'))
  ).toBe(true);
});

// RuleTester.run creates its own describe/test blocks — must be at top level,
// not nested inside test() blocks (Jest circus forbids nesting).
const ruleTester = new RuleTester({
  languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

ruleTester.run('require-barrel-export', rule, {
  valid: [
    // File in component dir that has index.ts (real filesystem)
    {
      code: 'export const x = 1;',
      filename: BUTTON_FILE,
    },
    // File not in src/components/ — rule does not apply
    {
      code: 'export const x = 1;',
      filename: '/src/screens/Home.tsx',
    },
    // __tests__ directory is skipped
    {
      code: 'export const x = 1;',
      filename: '/src/components/__tests__/foo.test.ts',
    },
    // shared directory is skipped
    {
      code: 'export const x = 1;',
      filename: '/src/components/shared/utils.ts',
    },
  ],
  invalid: [
    // Component dir without barrel export (fake path — won't have index.ts)
    {
      code: 'export const x = 1;',
      filename: '/src/components/FakeComponentNoBarrel/FakeComponentNoBarrel.tsx',
      errors: [{ messageId: 'missingBarrel' }],
    },
  ],
});
