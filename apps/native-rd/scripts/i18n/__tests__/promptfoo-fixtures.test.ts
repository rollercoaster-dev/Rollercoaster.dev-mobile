import fixtures from "../promptfoo/fixtures.json";

type PromptfooFixture = {
  description: string;
  vars: Record<string, unknown>;
  assert?: unknown[];
};

describe("promptfoo fixture shape", () => {
  const rows = fixtures as PromptfooFixture[];

  test("keeps one row per fixture", () => {
    expect(rows).toHaveLength(20);
  });

  test("does not put arrays under vars", () => {
    for (const row of rows) {
      for (const [key, value] of Object.entries(row.vars)) {
        expect(Array.isArray(value)).toBe(false);
        expect(key).not.toBe("categories");
        expect(key).not.toBe("placeholders");
      }
    }
  });

  test("scopes the LLM rubric to prose fixtures only", () => {
    const rubricRows = rows.filter((row) =>
      row.assert?.some(
        (assertion) =>
          typeof assertion === "object" &&
          assertion !== null &&
          "type" in assertion &&
          assertion.type === "llm-rubric",
      ),
    );

    expect(rubricRows).toHaveLength(9);
    expect(
      rubricRows.some((row) => row.description.includes("operational-label")),
    ).toBe(false);
    expect(rubricRows.map((row) => row.description)).not.toContain(
      "common::actions.save (operational-label)",
    );
    expect(rubricRows.map((row) => row.description)).not.toContain(
      "common::stepCard.blocker.label (operational-label)",
    );
    expect(rubricRows.map((row) => row.description)).not.toContain(
      "common::stepCard.progress (interpolation, 2 placeholders)",
    );
  });
});
