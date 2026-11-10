import type { GoalTemplate, TemplateSubStep } from "./types";

/**
 * Structural problems that would make a template insert wrongly. Returns one
 * message per problem; an empty array means the template is safe to insert.
 *
 * `after` must name a sibling (the schema documents `afterStepId` as a sibling
 * reference) and must not form a loop, which would leave every step in the
 * loop waiting on another.
 */
export function validateTemplate(template: GoalTemplate): string[] {
  const problems: string[] = [];
  const seen = new Set<string>();

  const checkSiblings = (siblings: readonly TemplateSubStep[]) => {
    const byKey = new Map(siblings.map((s) => [s.key, s]));
    for (const step of siblings) {
      if (seen.has(step.key)) problems.push(`duplicate key "${step.key}"`);
      seen.add(step.key);

      if (step.after === undefined) continue;
      if (!byKey.has(step.after)) {
        problems.push(
          `"${step.key}" comes after "${step.after}", which is not a sibling`,
        );
        continue;
      }
      // Walk the chain; revisiting a key means it loops.
      const visited = new Set([step.key]);
      let next = byKey.get(step.after);
      while (next) {
        if (visited.has(next.key)) {
          problems.push(`"${step.key}" is in a dependency loop`);
          break;
        }
        visited.add(next.key);
        next = next.after === undefined ? undefined : byKey.get(next.after);
      }
    }
  };

  checkSiblings(template.steps);
  for (const step of template.steps) checkSiblings(step.subSteps ?? []);
  return problems;
}
