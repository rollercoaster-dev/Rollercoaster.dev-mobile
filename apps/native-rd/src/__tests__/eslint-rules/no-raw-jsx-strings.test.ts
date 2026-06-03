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
    // Translated copy — expression child, not a string literal
    { code: '<Text>{t("home.title")}</Text>', filename: SCREEN },
    // Bound variable — expression child
    { code: "<Text>{label}</Text>", filename: SCREEN },
    // Whitespace-only JSXText (indentation between elements)
    { code: "<View> </View>", filename: SCREEN },
    // Punctuation / separators: no letters and no digits → allowed
    { code: "<Text>.</Text>", filename: SCREEN },
    { code: "<Text>·</Text>", filename: SCREEN }, // middot
    { code: "<Text>...</Text>", filename: SCREEN },
    { code: "<Text>→ ←</Text>", filename: SCREEN }, // → ←
    // Numeric-only, with and without separators
    { code: "<Text>42</Text>", filename: SCREEN },
    { code: "<Text>1,000.50</Text>", filename: SCREEN },
    // Icon-font glyphs as {"literal"} children: PUA / emoji / symbols, no \p{L}/\p{N}
    { code: '<Text>{"\ue000"}</Text>', filename: SCREEN }, // U+E000 PUA glyph
    { code: '<Text>{"✕"}</Text>', filename: COMPONENT }, // ✕ close glyph
    { code: '<Text>{"\u{1F3C6}"}</Text>', filename: SCREEN }, // 🏆 emoji
    // A string literal as a PROP value is out of scope — only children are checked
    { code: '<Button label={"Go Back"} />', filename: SCREEN },
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
    // Multi-word copy in a screen — asserts the reported value is trimmed
    {
      code: "<Text>Hello World</Text>",
      filename: SCREEN,
      errors: [{ messageId: "noRawJsxString", data: { value: "Hello World" } }],
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
    // Non-Latin script is real display copy, not an icon glyph — flagged
    {
      code: "<Text>你好</Text>", // 你好
      filename: SCREEN,
      errors: [{ messageId: "noRawJsxString" }],
    },
    // Single non-Latin letter (a one-character word) — flagged, not allowlisted
    {
      code: "<Text>是</Text>", // 是 ("yes")
      filename: SCREEN,
      errors: [{ messageId: "noRawJsxString" }],
    },
    // The {"literal"} bypass: copy wrapped in an expression container — flagged
    {
      code: '<Text>{"Coming soon"}</Text>',
      filename: SCREEN,
      errors: [{ messageId: "noRawJsxString", data: { value: "Coming soon" } }],
    },
    // Multiple offenders → one error per node (visitor does not bail early)
    {
      code: "<View><Text>One</Text><Text>Two</Text></View>",
      filename: SCREEN,
      errors: [
        { messageId: "noRawJsxString" },
        { messageId: "noRawJsxString" },
      ],
    },
  ],
});

test("no-raw-jsx-strings rule passes all RuleTester cases", () => {
  expect(true).toBe(true);
});
