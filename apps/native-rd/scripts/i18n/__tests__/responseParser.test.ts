import { parseAndValidate, type ParseErrorReason } from "../responseParser";

describe("parseAndValidate — ok cases", () => {
  test("valid response object matching expectedKeys → ok with typed dict", () => {
    const result = parseAndValidate({ k0: "Hallo", k1: "Welt" }, ["k0", "k1"]);
    expect(result).toEqual({ ok: true, data: { k0: "Hallo", k1: "Welt" } });
  });

  test("valid JSON string input is parsed and validated", () => {
    const result = parseAndValidate('{"k0":"Hallo","k1":"Welt"}', ["k0", "k1"]);
    expect(result).toEqual({ ok: true, data: { k0: "Hallo", k1: "Welt" } });
  });

  test("empty expectedKeys with empty response → ok (empty-batch edge)", () => {
    expect(parseAndValidate({}, [])).toEqual({ ok: true, data: {} });
  });
});

describe("parseAndValidate — error cases", () => {
  type ErrorCase = {
    label: string;
    raw: unknown;
    expectedKeys: string[];
    reason: ParseErrorReason;
  };

  const cases: ErrorCase[] = [
    {
      label: "response with an extra key not in expectedKeys",
      raw: { k0: "Hallo", k1: "Welt", k2: "Mehr" },
      expectedKeys: ["k0", "k1"],
      reason: "extra-keys",
    },
    {
      label: "response missing a key from expectedKeys",
      raw: { k0: "Hallo" },
      expectedKeys: ["k0", "k1"],
      reason: "missing-keys",
    },
    {
      label: "response with a non-string value",
      raw: { k0: 42 },
      expectedKeys: ["k0"],
      reason: "schema-mismatch",
    },
    {
      label: "response with an empty string value",
      raw: { k0: "" },
      expectedKeys: ["k0"],
      reason: "schema-mismatch",
    },
    {
      label: "malformed JSON string",
      raw: "{not json",
      expectedKeys: ["k0"],
      reason: "malformed-json",
    },
    {
      label: "raw is null",
      raw: null,
      expectedKeys: ["k0"],
      reason: "schema-mismatch",
    },
    {
      label: "raw is an array",
      raw: ["Hallo", "Welt"],
      expectedKeys: ["k0", "k1"],
      reason: "schema-mismatch",
    },
  ];

  test.each(cases)(
    "$label → reason $reason",
    ({ raw, expectedKeys, reason }) => {
      const result = parseAndValidate(raw, expectedKeys);
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.reason).toBe(reason);
      expect(typeof result.error.detail).toBe("string");
      expect(result.error.detail.length).toBeGreaterThan(0);
    },
  );

  test("missing-keys error detail names the missing key", () => {
    const result = parseAndValidate({ k0: "Hallo" }, ["k0", "k1"]);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.detail).toContain("k1");
  });

  test("extra-keys error detail names the extra key", () => {
    const result = parseAndValidate({ k0: "Hallo", surprise: "x" }, ["k0"]);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.detail).toContain("surprise");
  });
});
