/**
 * Goal-template format (#593).
 *
 * A template is static, code-defined data describing a goal skeleton: a title,
 * top-level steps and one level of sub-steps. It holds resolved display
 * strings — localise before building one. `insertTemplate` turns it into rows.
 *
 * Two things cannot be written literally in static data, so the format has its
 * own forms for them:
 *  - Step references use a template-local `key`; real ids exist only after the
 *    rows are inserted.
 *  - Dates are day offsets from the day of insertion, never absolute.
 *
 * A template only declares `plannedEvidenceTypes`. It never carries evidence:
 * the pile has to be the user's.
 */
import type { EvidenceTypeValue } from "../types/evidence";

/** Timing a step may carry. All optional; an untimed step sets none. */
export interface TemplateStepTiming {
  /** `key` of the sibling this step comes after (→ `step.afterStepId`). */
  after?: string;
  /** Due this many days after insertion (→ `step.dueAt`). */
  dueInDays?: number;
  /** External wait (→ `step.waitingOnLabel` / `waitingOnExpectedAt`). */
  waitingOn?: { label: string; expectedInDays?: number };
}

export interface TemplateSubStep extends TemplateStepTiming {
  /** Unique across the whole template. */
  key: string;
  title: string;
  /** Longer text under the title: how to do the step (→ `step.description`). */
  description?: string;
  plannedEvidenceTypes?: readonly EvidenceTypeValue[];
}

export interface TemplateStep extends TemplateSubStep {
  subSteps?: readonly TemplateSubStep[];
}

export interface GoalTemplate {
  /** Stable id, written to `goal.templateId` as provenance. */
  id: string;
  title: string;
  description?: string;
  steps: readonly TemplateStep[];
}
