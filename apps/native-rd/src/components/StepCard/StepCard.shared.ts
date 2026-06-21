import type { StatusBadgeVariant } from "../StatusBadge";

export type StepCardStatus = "completed" | "in-progress" | "pending";

/**
 * `leaf` is the default actionable step card. `overview` is the candidate-C
 * parent card (#360): it lists a parent's parts as a timeline spine, rolls up
 * their evidence, and offers the manual "mark parent complete" invite.
 */
export type StepCardKind = "leaf" | "overview";

/**
 * One child part shown in a parent's overview spine. The overview card is the
 * only consumer; leaf cards never receive parts.
 */
export interface StepCardPart {
  id: string;
  title: string;
  status: StepCardStatus;
  evidenceCount: number;
}

/**
 * Shared status → StatusBadge variant mapping. Lives here (not in StepCard.tsx)
 * so both the leaf and overview cards can import it without a module cycle.
 */
export const statusToVariant: Record<StepCardStatus, StatusBadgeVariant> = {
  completed: "completed",
  "in-progress": "active",
  pending: "locked",
};
