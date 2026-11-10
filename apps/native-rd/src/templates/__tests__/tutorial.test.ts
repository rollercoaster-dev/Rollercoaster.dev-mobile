import { i18n } from "../../i18n";
import { EvidenceType } from "../../db/schema";
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
