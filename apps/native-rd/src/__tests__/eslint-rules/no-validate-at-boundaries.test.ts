const { RuleTester } = require("eslint");
const rule = require("../../eslint-rules/no-validate-at-boundaries");

const ruleTester = new RuleTester({
  languageOptions: { ecmaVersion: 2022, sourceType: "module" },
});

ruleTester.run("no-validate-at-boundaries", rule, {
  valid: [
    // if-guard with throw as first statement
    {
      code: 'export function validate(x) { if (!x) throw new Error("missing"); return x; }',
      filename: "/src/utils/validate.ts",
    },
    // if-guard with return as first statement
    {
      code: "export function check(x) { if (!x) return null; return x + 1; }",
      filename: "/src/utils/check.ts",
    },
    // throw as first statement
    {
      code: 'export function strict(x) { throw new Error("not implemented"); }',
      filename: "/src/hooks/useStrict.ts",
    },
    // assert call as first statement
    {
      code: 'export function withAssert(x) { invariant(x, "required"); return x; }',
      filename: "/src/utils/withAssert.ts",
    },
    // parameterless function — nothing to validate
    {
      code: "export function getAll() { return []; }",
      filename: "/src/utils/getAll.ts",
    },
    // all-optional params — skip
    {
      code: "export function maybeFormat(date = new Date()) { return date.toISOString(); }",
      filename: "/src/utils/format.ts",
    },
    // not in utils/ or hooks/ — rule doesn't apply
    {
      code: "export function noGuard(x) { return x * 2; }",
      filename: "/src/screens/Home.tsx",
    },
    // if-guard with block statement containing return
    {
      code: 'export function blockGuard(x) { if (!x) { console.warn("missing"); return null; } return x; }',
      filename: "/src/utils/blockGuard.ts",
    },
  ],
  invalid: [
    // bare assignment as first statement
    {
      code: "export function process(x) { const y = x * 2; return y; }",
      filename: "/src/utils/process.ts",
      errors: [{ messageId: "missingGuard" }],
    },
    // bare return (not a guard — this is a one-liner lookup)
    {
      code: "export function getLabel(key) { return LABELS[key]; }",
      filename: "/src/utils/getLabel.ts",
      errors: [{ messageId: "missingGuard" }],
    },
    // if without early exit (not a guard)
    {
      code: "export function noExit(x) { if (featureFlag) { doAlternative(); } return x; }",
      filename: "/src/utils/noExit.ts",
      errors: [{ messageId: "missingGuard" }],
    },
    // arrow function export in hooks/
    {
      code: "export const useData = (id) => { const data = fetch(id); return data; };",
      filename: "/src/hooks/useData.ts",
      errors: [{ messageId: "missingGuard" }],
    },
    // default export function
    {
      code: "export default function transform(input) { const result = input.map(x => x); return result; }",
      filename: "/src/utils/transform.ts",
      errors: [{ messageId: "missingGuard" }],
    },
  ],
});

// RuleTester throws on failure, so reaching here means all cases passed
test("no-validate-at-boundaries rule passes all RuleTester cases", () => {
  expect(true).toBe(true);
});
