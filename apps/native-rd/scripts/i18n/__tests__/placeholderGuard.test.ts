import {
  checkPlaceholders,
  extractPlaceholders,
  type PlaceholderError,
} from "../placeholderGuard";

describe("extractPlaceholders", () => {
  test("returns empty array when string has no placeholders", () => {
    expect(extractPlaceholders("hello world")).toEqual([]);
  });

  test("extracts placeholders in source order, preserving duplicates", () => {
    expect(
      extractPlaceholders("Hello {{name}}, your code is {{code}}, {{name}}!"),
    ).toEqual(["name", "code", "name"]);
  });

  test("trims whitespace inside the braces (i18next normalises this)", () => {
    expect(extractPlaceholders("Hi {{ name }}")).toEqual(["name"]);
  });
});

describe("checkPlaceholders — ok cases", () => {
  test("matching placeholders → ok", () => {
    const result = checkPlaceholders(
      "Hello {{name}}, code {{code}}",
      "Hallo {{name}}, Code {{code}}",
      "k0",
    );
    expect(result).toEqual({ ok: true });
  });

  test("no placeholders in source or candidate → ok", () => {
    expect(checkPlaceholders("hello", "hallo", "k0")).toEqual({ ok: true });
  });

  test("empty source and empty candidate → ok", () => {
    expect(checkPlaceholders("", "", "k0")).toEqual({ ok: true });
  });

  test("multiple placeholders all present exactly once → ok", () => {
    const result = checkPlaceholders(
      "{{a}} {{b}} {{c}}",
      "{{c}} {{a}} {{b}}",
      "k0",
    );
    expect(result).toEqual({ ok: true });
  });
});

describe("checkPlaceholders — mismatch cases", () => {
  type MismatchCase = {
    label: string;
    source: string;
    candidate: string;
    expected: Omit<PlaceholderError, "key">;
  };

  const cases: MismatchCase[] = [
    {
      label: "candidate drops a placeholder",
      source: "Hello {{name}}",
      candidate: "Hallo",
      expected: { missing: ["name"], extra: [], duplicates: [] },
    },
    {
      label: "candidate adds a placeholder not in source",
      source: "Hallo",
      candidate: "Hallo {{extra}}",
      expected: { missing: [], extra: ["extra"], duplicates: [] },
    },
    {
      label: "candidate renames a placeholder",
      source: "Hello {{name}}",
      candidate: "Bonjour {{nom}}",
      expected: { missing: ["name"], extra: ["nom"], duplicates: [] },
    },
    {
      label: "candidate duplicates a placeholder",
      source: "Hello {{name}}",
      candidate: "Hallo {{name}}, {{name}}",
      expected: { missing: [], extra: [], duplicates: ["name"] },
    },
    {
      label: "source has no placeholders, candidate adds one",
      source: "hello",
      candidate: "hallo {{name}}",
      expected: { missing: [], extra: ["name"], duplicates: [] },
    },
  ];

  test.each(cases)("$label", ({ source, candidate, expected }) => {
    const result = checkPlaceholders(source, candidate, "k0");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.key).toBe("k0");
    expect(result.error.missing).toEqual(expected.missing);
    expect(result.error.extra).toEqual(expected.extra);
    expect(result.error.duplicates).toEqual(expected.duplicates);
  });

  test("returns the key so callers can identify the offending entry", () => {
    const result = checkPlaceholders("Hello {{name}}", "Hallo", "header.title");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.key).toBe("header.title");
  });
});
