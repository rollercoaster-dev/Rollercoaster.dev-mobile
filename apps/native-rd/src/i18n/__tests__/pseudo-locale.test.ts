import { pseudoize, pseudoizeTree } from "../pseudoTransform";

describe("pseudoize", () => {
  test("returns empty string unchanged", () => {
    expect(pseudoize("")).toBe("");
  });

  test("wraps and accents ASCII letters", () => {
    const result = pseudoize("Hello");
    expect(result.startsWith("[")).toBe(true);
    expect(result.endsWith("]")).toBe(true);
    expect(result).toContain("Ĥêĺĺø");
  });

  test("pads ~40% to surface layout overflow", () => {
    const result = pseudoize("Hello");
    // 5 chars * 0.4 = 2 padding dots.
    expect(result).toMatch(/··+/);
  });

  test("preserves {{interpolation}} tokens verbatim", () => {
    const result = pseudoize("Hello, {{name}}!");
    expect(result).toContain("{{name}}");
    expect(result).not.toContain("{{ñàɱê}}");
  });

  test("preserves multiple interpolation tokens", () => {
    const result = pseudoize("{{count}} of {{total}} done");
    expect(result).toContain("{{count}}");
    expect(result).toContain("{{total}}");
  });

  test("preserves adjacent tokens", () => {
    const result = pseudoize("{{a}}{{b}}");
    expect(result).toContain("{{a}}{{b}}");
  });

  test("leaves unmatched {{ verbatim instead of throwing", () => {
    // Documents current contract: malformed input doesn't throw. If a future
    // change wants strictness, this test should flip to expect a throw.
    expect(() => pseudoize("Hello {{name")).not.toThrow();
  });
});

describe("pseudoizeTree", () => {
  test("walks nested objects and pseudoizes string leaves only", () => {
    const input = {
      common: {
        save: "Save",
        cancel: "Cancel",
      },
      evidence: {
        item_one: "{{count}} item",
        item_other: "{{count}} items",
      },
    };
    const output = pseudoizeTree(input) as typeof input;

    expect(Object.keys(output)).toEqual(["common", "evidence"]);
    expect(Object.keys(output.common)).toEqual(["save", "cancel"]);
    expect(Object.keys(output.evidence)).toEqual(["item_one", "item_other"]);
    expect(output.common.save).toContain("Šàṽê");
    // Plural-suffix VALUES must be pseudoized, not just their keys preserved.
    expect(output.evidence.item_one).toMatch(/^\[.*\]$/);
    expect(output.evidence.item_one).toContain("{{count}}");
    expect(output.evidence.item_one).toContain("ïţêɱ");
  });

  test("does not mutate input tree", () => {
    const input = { common: { save: "Save" } };
    pseudoizeTree(input);
    expect(input.common.save).toBe("Save");
  });

  test("handles empty objects", () => {
    expect(pseudoizeTree({})).toEqual({});
  });

  test("walks arrays", () => {
    const out = pseudoizeTree(["one", "two"]) as string[];
    expect(out).toHaveLength(2);
    expect(out[0]).toContain("øñê");
    expect(out[1]).toContain("ţŵø");
  });
});
