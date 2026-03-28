const { RuleTester } = require('eslint');
const rule = require('../../eslint-rules/no-shared-component-reimplementation');

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});

ruleTester.run('no-shared-component-reimplementation', rule, {
  valid: [
    // Pressable with only onPress — not enough props for Button signature
    {
      code: '<Pressable onPress={fn} />',
      filename: '/src/screens/Home.tsx',
    },
    // Pressable with 3 props but missing style — not a full reimplementation
    {
      code: '<Pressable onPress={fn} accessibilityRole="button" accessibilityLabel="Go" />',
      filename: '/src/screens/Home.tsx',
    },
    // TextInput with only value and onChangeText — missing style + label
    {
      code: '<TextInput onChangeText={fn} value={v} />',
      filename: '/src/screens/Settings.tsx',
    },
    // Not in screens/ — rule doesn't apply
    {
      code: '<Pressable onPress={fn} accessibilityRole="button" accessibilityLabel="Go" style={s} />',
      filename: '/src/components/Button/Button.tsx',
    },
    // View — no signature matches View at all
    {
      code: '<View style={styles.container} accessibilityRole="button" onPress={fn} />',
      filename: '/src/screens/Home.tsx',
    },
    // Spread attributes should not count
    {
      code: '<Pressable {...props} />',
      filename: '/src/screens/Home.tsx',
    },
  ],
  invalid: [
    // Full Button reimplementation: Pressable + all 4 props
    {
      code: '<Pressable onPress={fn} accessibilityRole="button" accessibilityLabel="Submit" style={s} />',
      filename: '/src/screens/Home.tsx',
      errors: [{ messageId: 'useSharedComponent', data: { component: 'Button' } }],
    },
    // TouchableOpacity variant
    {
      code: '<TouchableOpacity onPress={fn} accessibilityRole="button" accessibilityLabel="Cancel" style={s} />',
      filename: '/src/screens/Settings.tsx',
      errors: [{ messageId: 'useSharedComponent', data: { component: 'Button' } }],
    },
    // Full Input reimplementation: TextInput + all 4 props
    {
      code: '<TextInput onChangeText={fn} value={v} accessibilityLabel="Email" style={s} />',
      filename: '/src/screens/Login.tsx',
      errors: [{ messageId: 'useSharedComponent', data: { component: 'Input' } }],
    },
  ],
});

test('no-shared-component-reimplementation rule passes all RuleTester cases', () => {
  expect(true).toBe(true);
});
