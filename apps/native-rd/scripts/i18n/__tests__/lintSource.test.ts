import { checkBareStrings, checkPlaceholderConsistency } from "../lintSource";

describe("checkBareStrings", () => {
  test("flags every leaf when sidecar is absent", () => {
    const tree = { hero: { title: "Hello" }, cta: { label: "Go" } };
    const findings = checkBareStrings("en/welcome.json", tree, null);
    expect(findings).toHaveLength(2);
    expect(findings[0].category).toBe("bare-string");
    expect(findings.map((f) => f.keyPath).sort()).toEqual([
      "cta.label",
      "hero.title",
    ]);
  });

  test("exempts leaves whose key path has an entry in the sidecar", () => {
    const tree = { hero: { title: "Hello" }, cta: { label: "Go" } };
    const sidecar = { hero: { title: { intent: "warm greeting" } } };
    const findings = checkBareStrings("en/welcome.json", tree, sidecar);
    expect(findings).toHaveLength(1);
    expect(findings[0].keyPath).toBe("cta.label");
  });

  test("returns no findings when sidecar covers every leaf", () => {
    const tree = { hero: { title: "Hello" }, cta: { label: "Go" } };
    const sidecar = {
      hero: { title: { intent: "warm greeting" } },
      cta: { label: { intent: "action verb" } },
    };
    expect(checkBareStrings("en/welcome.json", tree, sidecar)).toHaveLength(0);
  });

  test("empty namespace produces no findings", () => {
    expect(checkBareStrings("en/empty.json", {}, null)).toHaveLength(0);
  });

  test("nested object with no string leaves produces no findings", () => {
    const tree = { meta: { config: { flags: [] } } };
    expect(checkBareStrings("en/meta.json", tree, null)).toHaveLength(0);
  });

  test("a null in the sidecar at the leaf still counts as bare (treat null as absent)", () => {
    const tree = { hero: { title: "Hello" } };
    const sidecar = { hero: { title: null } };
    expect(checkBareStrings("en/welcome.json", tree, sidecar)).toHaveLength(1);
  });
});

describe("checkPlaceholderConsistency", () => {
  test("flags placeholder shared across different top-level keys", () => {
    const tree = {
      confirmDelete: { message: 'Delete "{{title}}" permanently?' },
      card: { a11y: { label: "{{title}}, {{stepsCompleted}} steps" } },
    };
    const findings = checkPlaceholderConsistency("en/goals.json", tree);
    expect(findings).toHaveLength(1);
    expect(findings[0].category).toBe("placeholder-conflict");
    expect(findings[0].detail).toMatch(/\{\{title\}\}/);
  });

  test("does not flag same placeholder under same top-level key", () => {
    const tree = {
      card: {
        label: "{{title}}, active",
        hint: "Double-tap {{title}}",
      },
    };
    expect(checkPlaceholderConsistency("en/goals.json", tree)).toHaveLength(0);
  });

  test("returns no findings when there are no placeholders", () => {
    const tree = { hero: { title: "Welcome" }, cta: { label: "Go" } };
    expect(checkPlaceholderConsistency("en/welcome.json", tree)).toHaveLength(
      0,
    );
  });

  test("placeholder in 3+ leaves across 2 top-level keys yields exactly one finding", () => {
    const tree = {
      a: { x: "{{n}}", y: "step {{n}}" },
      b: { z: "{{n}} more" },
    };
    expect(checkPlaceholderConsistency("en/count.json", tree)).toHaveLength(1);
  });

  test("ignores placeholder appearing only once", () => {
    const tree = { card: { label: "Hi {{name}}" } };
    expect(checkPlaceholderConsistency("en/x.json", tree)).toHaveLength(0);
  });

  test("multiple distinct placeholder conflicts in same namespace produce one finding each", () => {
    const tree = {
      header: { title: "{{a}}", subtitle: "{{b}}" },
      footer: { caption: "{{a}}", note: "{{b}}" },
    };
    const findings = checkPlaceholderConsistency("en/mixed.json", tree);
    expect(findings).toHaveLength(2);
    expect(findings.map((f) => f.category)).toEqual([
      "placeholder-conflict",
      "placeholder-conflict",
    ]);
  });
});
