/**
 * Template seeder tests (#593): a template becomes goal + step rows, with
 * local keys resolved to inserted ids and day offsets resolved to dates.
 */
import { evolu } from "../../db/evolu";
import { localDayKeyToDateIso } from "../../utils/localDay";
import { insertTemplate } from "../insertTemplate";
import type { GoalTemplate } from "../types";

// Inserts hand back sequential ids so the test can follow a row's id into the
// foreign keys of later writes.
jest.mock("../../db/evolu", () => ({
  evolu: {
    insert: jest.fn(),
    update: jest.fn((_table: string, data: unknown) => ({
      ok: true,
      value: data,
    })),
    createQuery: jest.fn((fn: unknown) => ({ type: "QUERY", fn })),
  },
}));

const insertMock = evolu.insert as jest.Mock;
const updateMock = evolu.update as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  let n = 0;
  insertMock.mockImplementation((table: string) => ({
    ok: true,
    value: { id: `${table}_${++n}` },
  }));
});

const NOW = new Date(2026, 10, 10, 15, 30); // 10 Nov 2026, mid-afternoon

function dayIso(key: string) {
  const result = localDayKeyToDateIso(key);
  if (!result.ok) throw new Error(`bad test day: ${key}`);
  return result.value;
}

const template: GoalTemplate = {
  id: "test-template",
  title: "Build a desk",
  description: "From rough timber",
  steps: [
    {
      key: "buy",
      title: "Buy timber",
      description: "Oak or ash, kiln dried",
      plannedEvidenceTypes: ["photo"],
    },
    {
      key: "glue",
      title: "Glue the top",
      after: "buy",
      waitingOn: { label: "Glue to cure", expectedInDays: 2 },
      subSteps: [
        { key: "clamp", title: "Clamp it", description: "Overnight" },
        { key: "wipe", title: "Wipe the squeeze-out", after: "clamp" },
      ],
    },
    { key: "finish", title: "Oil it", dueInDays: 25 },
  ],
};

describe("insertTemplate", () => {
  test("writes the goal with its provenance and description", () => {
    const result = insertTemplate(template, NOW);

    expect(result).toEqual({ ok: true, goalId: "goal_1" });
    expect(insertMock).toHaveBeenNthCalledWith(
      1,
      "goal",
      expect.objectContaining({
        title: "Build a desk",
        templateId: "test-template",
      }),
    );
    expect(updateMock).toHaveBeenCalledWith("goal", {
      id: "goal_1",
      description: "From rough timber",
    });
  });

  test("writes steps in order and sub-steps under their parent", () => {
    insertTemplate(template, NOW);

    const steps = insertMock.mock.calls
      .filter(([table]) => table === "step")
      .map(([, row]) => row);
    expect(steps).toEqual([
      expect.objectContaining({
        goalId: "goal_1",
        title: "Buy timber",
        description: "Oak or ash, kiln dried",
        ordinal: 0,
        plannedEvidenceTypes: '["photo"]',
      }),
      expect.objectContaining({ title: "Glue the top", ordinal: 1 }),
      expect.objectContaining({
        title: "Clamp it",
        description: "Overnight",
        parentStepId: "step_3",
        ordinal: 0,
      }),
      expect.objectContaining({
        title: "Wipe the squeeze-out",
        parentStepId: "step_3",
        ordinal: 1,
      }),
      expect.objectContaining({ title: "Oil it", ordinal: 2 }),
    ]);
  });

  test("resolves local keys and day offsets in the timing pass", () => {
    insertTemplate(template, NOW);

    const stepUpdates = updateMock.mock.calls
      .filter(([table]) => table === "step")
      .map(([, row]) => row);
    expect(stepUpdates).toEqual([
      {
        id: "step_3",
        afterStepId: "step_2",
        waitingOnLabel: "Glue to cure",
        waitingOnExpectedAt: dayIso("2026-11-12"),
      },
      { id: "step_5", afterStepId: "step_4" },
      // 25 days on crosses the month end.
      { id: "step_6", dueAt: dayIso("2026-12-05") },
    ]);
  });

  test("an untimed template makes no step updates", () => {
    insertTemplate(
      { id: "plain", title: "Plain", steps: [{ key: "a", title: "A" }] },
      NOW,
    );

    expect(updateMock).not.toHaveBeenCalled();
  });

  test("stops at the first failed write and reports it", () => {
    const failure = { type: "SqliteError" };
    insertMock
      .mockImplementationOnce(() => ({ ok: true, value: { id: "goal_1" } }))
      .mockImplementationOnce(() => ({ ok: false, error: failure }));

    const result = insertTemplate(template, NOW);

    expect(result).toEqual({ ok: false, error: failure });
    expect(insertMock).toHaveBeenCalledTimes(2);
  });

  test("a validation throw comes back as a failed result", () => {
    const result = insertTemplate(
      { id: "blank", title: "Blank step", steps: [{ key: "a", title: " " }] },
      NOW,
    );

    expect(result.ok).toBe(false);
  });

  test("an invalid template writes nothing", () => {
    const result = insertTemplate(
      {
        id: "dangling",
        title: "Dangling",
        steps: [{ key: "a", title: "A", after: "missing" }],
      },
      NOW,
    );

    expect(result.ok).toBe(false);
    expect(insertMock).not.toHaveBeenCalled();
  });
});
