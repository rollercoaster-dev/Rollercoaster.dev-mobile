const { RuleTester } = require("eslint");
const rule = require("../../eslint-rules/no-raw-colors");

// RuleTester.run creates its own describe/test blocks — must be at top level,
// not nested inside test() blocks (Jest circus forbids nesting).
const ruleTester = new RuleTester({
  languageOptions: { ecmaVersion: 2022, sourceType: "module" },
});

const componentStyleFile = "/src/components/Foo/Foo.styles.ts";
// Screens were previously exempt — the rule now covers them too.
const screenStyleFile = "/src/screens/Bar/Bar.styles.ts";
// Non-style files (.tsx / .ts) are out of scope: they legitimately hold
// palette references and hex (badge design data, computed colors).
const nonStyleFile = "/src/components/Foo/Foo.tsx";

ruleTester.run("no-raw-colors", rule, {
  valid: [
    // Theme tokens are the sanctioned source.
    {
      code: "const s = { color: theme.colors.text };",
      filename: componentStyleFile,
    },
    // Semantic RN values pass.
    {
      code: "const s = { backgroundColor: 'transparent' };",
      filename: componentStyleFile,
    },
    // Out of scope: palette.* and raw hex in a non-style file are not flagged.
    { code: "const c = palette.gray800;", filename: nonStyleFile },
    { code: "const c = '#ffffff';", filename: nonStyleFile },
  ],
  invalid: [
    // Raw hex literal in a component style file (the original behaviour).
    {
      code: "const s = { color: '#ff0000' };",
      filename: componentStyleFile,
      errors: [{ messageId: "noRawColor" }],
    },
    // Raw hex in a SCREEN style file — scope now includes screens.
    {
      code: "const s = { backgroundColor: '#161616' };",
      filename: screenStyleFile,
      errors: [{ messageId: "noRawColor" }],
    },
    // `palette.*` member expression — the new blind-spot the hardening closes.
    // Assert the reported `value` too: it exercises the property-name extraction
    // (Identifier / computed-string / "…" fallback) that is the whole point of
    // the MemberExpression visitor. A messageId-only check would still pass if
    // the extraction silently emitted e.g. `palette.undefined`.
    {
      code: "const s = { color: palette.white };",
      filename: componentStyleFile,
      errors: [{ messageId: "noRawColor", data: { value: "palette.white" } }],
    },
    {
      code: "const bg = palette.gray800;",
      filename: screenStyleFile,
      errors: [{ messageId: "noRawColor", data: { value: "palette.gray800" } }],
    },
    // Computed string-literal property — the middle branch of the extraction
    // ternary (`palette["gray800"]` is valid JS a dev could write in a style file).
    {
      code: 'const bg = palette["gray800"];',
      filename: componentStyleFile,
      errors: [{ messageId: "noRawColor", data: { value: "palette.gray800" } }],
    },
    // Named CSS color.
    {
      code: "const s = { color: 'white' };",
      filename: componentStyleFile,
      errors: [{ messageId: "noRawColor" }],
    },
    // Color function.
    {
      code: "const s = { color: 'rgba(0,0,0,0.5)' };",
      filename: componentStyleFile,
      errors: [{ messageId: "noRawColor" }],
    },
    // Template-literal hex — exercises the TemplateLiteral visitor's own report
    // path (a template is not a `Literal`, so the string-literal check misses it).
    {
      code: "const s = { color: `#abcdef` };",
      filename: componentStyleFile,
      errors: [{ messageId: "noRawColor", data: { value: "#abcdef" } }],
    },
  ],
});
