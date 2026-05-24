import { checkBareStrings } from "../lintSource";

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
