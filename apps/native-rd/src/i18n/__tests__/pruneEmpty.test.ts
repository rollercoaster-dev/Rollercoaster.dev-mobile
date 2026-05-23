import { pruneEmpty } from "../pruneEmpty";

describe("pruneEmpty", () => {
  test("returns undefined for an empty string", () => {
    expect(pruneEmpty("")).toBeUndefined();
  });

  test("preserves a non-empty string", () => {
    expect(pruneEmpty("Speichern")).toBe("Speichern");
  });

  test("preserves non-string primitives — including a literal null", () => {
    // Plurals or explicit empty-state markers may surface as null/0/false in
    // pulled JSON. Pruning those would silently delete intentional values.
    expect(pruneEmpty(null)).toBe(null);
    expect(pruneEmpty(0)).toBe(0);
    expect(pruneEmpty(false)).toBe(false);
  });

  test("drops empty-string leaves from a flat object", () => {
    expect(pruneEmpty({ a: "x", b: "", c: "y" })).toEqual({ a: "x", c: "y" });
  });

  test("drops nested empty-string leaves and cascades through empty branches", () => {
    expect(
      pruneEmpty({
        actions: { save: "Speichern", cancel: "" },
        empty: { all: "", gone: "" },
        evidence: { photo: { label: "Foto", shortLabel: "" } },
      }),
    ).toEqual({
      actions: { save: "Speichern" },
      evidence: { photo: { label: "Foto" } },
    });
  });

  test("returns undefined when the entire input prunes to nothing", () => {
    expect(pruneEmpty({ a: "", b: { c: "", d: { e: "" } } })).toBeUndefined();
    expect(pruneEmpty({})).toBeUndefined();
  });

  test("prunes empty strings inside arrays and drops fully-empty arrays", () => {
    expect(pruneEmpty(["a", "", "b"])).toEqual(["a", "b"]);
    expect(pruneEmpty(["", ""])).toBeUndefined();
  });

  test("preserves Tolgee interpolation tokens verbatim", () => {
    // Translators are allowed to ship strings that are *only* a placeholder
    // (e.g. an ICU select fallback). Pruning would corrupt the bundle.
    expect(pruneEmpty({ name: "{{value}}" })).toEqual({ name: "{{value}}" });
  });
});
