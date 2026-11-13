import { i18n } from "../../i18n";
import { EvidenceType, StepStatus } from "../../db/schema";
import {
  areAllStepsComplete,
  resolveActionableIndex,
  resolveNextActionableStep,
} from "../../db/queries";
import { buildTutorialTemplate } from "../tutorial";
import { validateTemplate } from "../validateTemplate";

describe("buildTutorialTemplate", () => {
  const template = buildTutorialTemplate(i18n.t);

  test("is a valid template that starts with the journal and ends on finish", () => {
    expect(validateTemplate(template)).toEqual([]);
    expect(template.steps.map((s) => s.key)).toEqual([
      "journal",
      "want",
      "threeSteps",
      "why",
      "setAside",
      "fiveMinutes",
      "yours",
      "paperOnly",
      "finish",
    ]);
  });

  test("every step resolves its copy and plans exactly one evidence type", () => {
    for (const step of template.steps) {
      // An unresolved key comes back as the key itself.
      expect(step.title).not.toContain("tutorial.steps");
      expect(step.description).not.toContain("tutorial.steps");
      expect(step.plannedEvidenceTypes).toHaveLength(1);
    }
  });

  test("no step waits on a photo: the journal photo is only ever extra", () => {
    const planned = template.steps.flatMap((s) => s.plannedEvidenceTypes);
    expect(planned).not.toContain(EvidenceType.photo);
  });
});

// #829: "Do five minutes on your first step" is where the reader adds a step
// of their own, as a sub-step of that step in Edit Goal.
describe("the step that teaches adding a step", () => {
  const QUOTES = { en: ["“", "”"], de: ["„", "“"] } as const;

  // The copy quotes each control as its button reads. Renaming a button
  // without updating the copy sends the reader looking for a label that
  // isn't on screen.
  test.each(["en", "de"] as const)(
    "%s copy quotes the Edit Goal controls as their buttons read",
    (lng) => {
      const t = i18n.getFixedT(lng, ["templates", "editGoal"]);
      const step = buildTutorialTemplate(t).steps.find(
        (s) => s.key === "fiveMinutes",
      );
      const [open, close] = QUOTES[lng];
      for (const key of [
        "editGoal:editor.breakIntoSubStepsLabel",
        "editGoal:editor.newSubStepTitle",
        "editGoal:actions.done",
      ] as const) {
        expect(step?.description).toContain(`${open}${t(key)}${close}`);
      }
    },
  );

  /**
   * Walks the tutorial the way Focus Mode does: finish whichever step it
   * shows, until it shows none. A reader-added sub-step "mine" sits under
   * `hostKey` with `mineStatus`. Returns the order visited and the final rows.
   */
  function walkWithSubStep(hostKey: string, mineStatus: string) {
    const keys = buildTutorialTemplate(i18n.t).steps.map((s) => s.key);
    const rows: { id: string; parentStepId: string | null; status: string }[] =
      keys.flatMap((key) => {
        const row = { id: key, parentStepId: null, status: StepStatus.pending };
        return key === hostKey
          ? [row, { id: "mine", parentStepId: key, status: mineStatus }]
          : [row];
      });

    const visited: string[] = [];
    // Capped so a resolver that stops advancing fails instead of hanging.
    for (let i = 0; i < rows.length; i++) {
      const index = resolveActionableIndex(resolveNextActionableStep(rows));
      if (index === null) break;
      visited.push(rows[index].id);
      rows[index].status = StepStatus.completed;
    }
    return { visited, rows };
  }

  // The copy says the new sub-step opens next, and that this step comes back
  // after it.
  test("a sub-step added under it opens next, and the badge is still reachable", () => {
    const { visited, rows } = walkWithSubStep(
      "fiveMinutes",
      StepStatus.pending,
    );

    expect(visited).toEqual([
      "journal",
      "want",
      "threeSteps",
      "why",
      "setAside",
      "mine",
      "fiveMinutes",
      "yours",
      "paperOnly",
      "finish",
    ]);
    expect(areAllStepsComplete(rows)).toBe(true);
  });

  // Why not step 3, as first planned: sub-steps there open before steps 4-9.
  test("a sub-step under step 3 would open before the rest of the tutorial", () => {
    const { visited } = walkWithSubStep("threeSteps", StepStatus.pending);
    expect(visited.slice(0, 4)).toEqual([
      "journal",
      "want",
      "mine",
      "threeSteps",
    ]);
  });

  // Why step 5 still sets aside itself: a sub-step left set aside keeps the
  // goal from reading as done, so step 9's badge card never shows.
  test("a sub-step left set aside keeps the goal from reading as done", () => {
    const { visited, rows } = walkWithSubStep("setAside", StepStatus.paused);
    expect(visited).not.toContain("mine");
    expect(visited).toContain("finish");
    expect(areAllStepsComplete(rows)).toBe(false);
  });
});
