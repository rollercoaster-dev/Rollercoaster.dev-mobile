/**
 * Pins the TS placeholderGuard.extractPlaceholders() and the JS twin
 * (promptfoo/asserts/placeholders.js) to identical outputs. If either
 * regex drifts (e.g. someone reverts the JS mirror to `\w+`), this fails
 * before a bake-off run pays the API cost to find out.
 */

import { extractPlaceholders as extractTs } from "../placeholderGuard";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const jsMirror = require("../promptfoo/asserts/placeholders.js") as {
  extractPlaceholders: (s: string) => string[];
};
const extractJs = jsMirror.extractPlaceholders;

describe("placeholder extraction parity (TS vs promptfoo JS)", () => {
  const cases: { name: string; input: string }[] = [
    { name: "empty string", input: "" },
    { name: "no placeholders", input: "Plain UI string" },
    { name: "single placeholder", input: "Hello {{name}}" },
    {
      name: "multiple placeholders",
      input: "{{count}} items in {{listName}}",
    },
    { name: "dotted-name placeholder", input: "Welcome {{user.name}}" },
    {
      name: "duplicate placeholders preserved in order",
      input: "{{a}} then {{b}} then {{a}}",
    },
    { name: "whitespace inside braces", input: "Hi {{ name }}" },
  ];

  test.each(cases)("$name", ({ input }) => {
    expect(extractJs(input)).toEqual(extractTs(input));
  });
});
