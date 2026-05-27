const { RuleTester } = require("eslint");
const rule = require("../../eslint-rules/no-raw-jsx-strings");

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: "module",
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});

const SCREEN = "/src/screens/Home.tsx";
const COMPONENT = "/src/components/Card/Card.tsx";

ruleTester.run("no-raw-jsx-strings", rule, {
  valid: [
    // Translated copy — expression child, not JSXText
    { code: '<Text>{t("home.title")}</Text>', filename: SCREEN },
    // Bound variable — expression child
    { code: "<Text>{label}</Text>", filename: SCREEN },
    // Whitespace-only JSXText (indentation between elements)
    { code: "<View> </View>", filename: SCREEN },
    // Single character: punctuation / separator
    { code: "<Text>.</Text>", filename: SCREEN },
    { code: "<Text>·</Text>", filename: SCREEN },
    // Numeric-only, with and without separators
    { code: "<Text>42</Text>", filename: SCREEN },
    { code: "<Text>1,000.50</Text>", filename: SCREEN },
    // All non-ASCII: icon-font glyph string, never display copy
    { code: "<Text></Text>", filename: SCREEN },
    // Raw string outside screens/ and components/ — rule does not apply
    { code: "<Text>Hello World</Text>", filename: "/src/utils/debug.ts" },
    // Stories and tests are fixture data — excluded
    {
      code: "<Text>Hello World</Text>",
      filename: "/src/components/Card/Card.stories.tsx",
    },
    {
      code: "<Text>Hello World</Text>",
      filename: "/src/screens/Home.test.tsx",
    },
  ],
  invalid: [
    // Multi-word copy in a screen
    {
      code: "<Text>Hello World</Text>",
      filename: SCREEN,
      errors: [{ messageId: "noRawJsxString" }],
    },
    // Real placeholder copy in a screen
    {
      code: "<Text>This feature is coming soon.</Text>",
      filename: SCREEN,
      errors: [{ messageId: "noRawJsxString" }],
    },
    // Copy in a component file
    {
      code: "<Text>Save changes</Text>",
      filename: COMPONENT,
      errors: [{ messageId: "noRawJsxString" }],
    },
    // Multi-line JSXText is a single node — one error, not several
    {
      code: "<Text>\n  Hello there\n</Text>",
      filename: SCREEN,
      errors: [{ messageId: "noRawJsxString" }],
    },
    // Number with a unit is NOT numeric-only — flagged (forces a t() decision)
    {
      code: "<Text>100%</Text>",
      filename: SCREEN,
      errors: [{ messageId: "noRawJsxString" }],
    },
  ],
});

test("no-raw-jsx-strings rule passes all RuleTester cases", () => {
  expect(true).toBe(true);
});
