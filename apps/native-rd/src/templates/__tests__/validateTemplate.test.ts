import type { GoalTemplate, TemplateStep } from "../types";
import { validateTemplate } from "../validateTemplate";

const withSteps = (steps: TemplateStep[]): GoalTemplate => ({
  id: "t",
  title: "T",
  steps,
});

describe("validateTemplate", () => {
  test("accepts sibling dependencies at both levels", () => {
    expect(
      validateTemplate(
        withSteps([
          { key: "a", title: "A" },
          {
            key: "b",
            title: "B",
            after: "a",
            subSteps: [
              { key: "b1", title: "B1" },
              { key: "b2", title: "B2", after: "b1" },
            ],
          },
        ]),
      ),
    ).toEqual([]);
  });

  test.each<[string, TemplateStep[], string]>([
    [
      "a key reused across levels",
      [{ key: "a", title: "A", subSteps: [{ key: "a", title: "Again" }] }],
      'duplicate key "a"',
    ],
    [
      "after naming an unknown key",
      [{ key: "a", title: "A", after: "nope" }],
      '"a" comes after "nope", which is not a sibling',
    ],
    [
      "a sub-step coming after a top-level step",
      [
        { key: "a", title: "A" },
        {
          key: "b",
          title: "B",
          subSteps: [{ key: "b1", title: "B1", after: "a" }],
        },
      ],
      '"b1" comes after "a", which is not a sibling',
    ],
    [
      "a step coming after itself",
      [{ key: "a", title: "A", after: "a" }],
      '"a" is in a dependency loop',
    ],
  ])("rejects %s", (_label, steps, problem) => {
    expect(validateTemplate(withSteps(steps))).toContain(problem);
  });

  test("reports every step in a two-step loop", () => {
    expect(
      validateTemplate(
        withSteps([
          { key: "a", title: "A", after: "b" },
          { key: "b", title: "B", after: "a" },
        ]),
      ),
    ).toEqual(['"a" is in a dependency loop', '"b" is in a dependency loop']);
  });
});
