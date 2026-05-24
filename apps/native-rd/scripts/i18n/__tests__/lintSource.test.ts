import {
  checkBannedPhrasings,
  checkBareStrings,
  checkPlaceholderConsistency,
} from "../lintSource";

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

describe("checkBannedPhrasings", () => {
  test("flags an exit-aside phrase", () => {
    const tree = { cta: { label: "Or don't — we'll be here" } };
    const findings = checkBannedPhrasings("en/welcome.json", tree);
    expect(findings.length).toBeGreaterThanOrEqual(1);
    expect(findings[0].category).toBe("banned-phrasing");
    expect(findings[0].keyPath).toBe("cta.label");
  });

  test("matching is case-insensitive", () => {
    const tree = { error: { body: "Special Needs users should..." } };
    const findings = checkBannedPhrasings("en/common.json", tree);
    expect(findings).toHaveLength(1);
    expect(findings[0].detail).toMatch(/special needs/);
  });

  test("returns no findings on clean copy", () => {
    const tree = {
      hero: { title: "Capture what worked today" },
      cta: { label: "Save evidence" },
    };
    expect(checkBannedPhrasings("en/welcome.json", tree)).toHaveLength(0);
  });

  test.each([
    ["you got this", "toxic positivity"],
    ["it's so easy", "condescension"],
    ["disrupting", "overpromise"],
    ["high functioning", "reductive"],
    ["suffers from", "deficit framing"],
  ])("flags %p", (phrase) => {
    const tree = { body: `The product is ${phrase} amazing` };
    const findings = checkBannedPhrasings("en/test.json", tree);
    expect(findings.length).toBeGreaterThanOrEqual(1);
    expect(findings[0].detail).toContain(phrase);
  });

  test("one leaf matching two phrases yields one finding per phrase", () => {
    const tree = { body: "Or don't — even you can do this" };
    const findings = checkBannedPhrasings("en/welcome.json", tree);
    expect(findings).toHaveLength(2);
    const phrases = findings.map((f) => f.detail);
    expect(phrases.some((d) => d.includes("or don't"))).toBe(true);
    expect(phrases.some((d) => d.includes("even you can"))).toBe(true);
  });
});
