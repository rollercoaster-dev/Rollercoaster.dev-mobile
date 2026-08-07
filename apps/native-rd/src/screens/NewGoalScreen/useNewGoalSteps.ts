/**
 * useNewGoalSteps — the New Goal wizard's step list, held entirely in local
 * React state until "Start Working" persists it ([Integrate] #444, D2).
 *
 * `steps` is the single source of truth for **both** the build screen (step 3)
 * and the first-step screen (step 2): `steps[0]` *is* step 2's row. That's the
 * "unify step 2/3 state at the container" the wizard's own deferred-items note
 * anticipates, done without touching the component.
 *
 * The reducers mirror NewGoalWizard.stories.tsx's `useInteractiveSteps` — same
 * shapes, same `[EvidenceType.text]` default on add — so the storied
 * interactions behave identically in the app. Reparenting reuses `applyReparent`
 * verbatim; it was written for exactly this local-state shape.
 */
import { useRef, useState } from "react";
import type { NewGoalWizardProps } from "../../components/NewGoalWizard";
import type { EditGoalStep } from "../../components/EditGoalView";
import { applyReparent } from "../../components/EditGoalView/applyReparent";
import { EvidenceType } from "../../db";
import type { EvidenceTypeValue } from "../../types/evidence";

/** The wizard props this hook owns — step 2's fields plus the build list. */
type NewGoalStepProps = Pick<
  NewGoalWizardProps,
  | "firstStepTitle"
  | "onFirstStepTitleChange"
  | "plannedEvidenceType"
  | "onPlannedEvidenceTypeChange"
  | "steps"
  | "onReorderSteps"
  | "onReorderSubSteps"
  | "onReparentStep"
  | "onAddStep"
  | "onStepTitleChange"
  | "onStepEvidenceChange"
  | "onAddSubStep"
  | "onSubStepTitleChange"
  | "onSubStepEvidenceChange"
  | "onDeleteSubStep"
  | "onDeleteStep"
>;

export function useNewGoalSteps(): {
  steps: EditGoalStep[];
  stepProps: NewGoalStepProps;
} {
  const [steps, setSteps] = useState<EditGoalStep[]>([]);
  /**
   * The step-2 chip's value while no row exists yet. Picking an evidence type
   * before typing a title must not mint a row — that row would surface as an
   * empty phantom in the build list if the user then backed out to the name
   * step and quick-added. Once `steps[0]` exists it is authoritative, and this
   * is only the seed for the next mint.
   */
  const [pendingEvidenceType, setPendingEvidenceType] =
    useState<EvidenceTypeValue>(EvidenceType.text);

  // Monotonic ids for rows that exist only in this wizard's state. Real Evolu
  // ids are minted by the insert batch on Start Working; these only have to be
  // unique within the session, so a ref counter beats Math.random.
  const nextLocalId = useRef(1);
  const mintId = (prefix: "step" | "sub") =>
    `${prefix}-${nextLocalId.current++}`;

  function handleFirstStepTitleChange(title: string) {
    setSteps((prev) => {
      if (prev.length === 0) {
        // Mint on the first real character only (see pendingEvidenceType).
        return title.trim()
          ? [
              {
                id: mintId("step"),
                title,
                plannedEvidenceTypes: [pendingEvidenceType],
              },
            ]
          : prev;
      }
      // Symmetric with that mint: clearing the field back to blank drops the
      // row again, as long as it's still the lone row step 2 created and
      // carries no sub-steps of its own.
      if (
        !title.trim() &&
        prev.length === 1 &&
        (prev[0].subSteps?.length ?? 0) === 0
      ) {
        return [];
      }
      return prev.map((step, index) =>
        index === 0 ? { ...step, title } : step,
      );
    });
  }

  function handlePlannedEvidenceTypeChange(type: EvidenceTypeValue) {
    setPendingEvidenceType(type);
    setSteps((prev) =>
      prev.map((step, index) =>
        index === 0 ? { ...step, plannedEvidenceTypes: [type] } : step,
      ),
    );
  }

  return {
    steps,
    stepProps: {
      // Step 2 · derived from steps[0], so the first-step screen and row 1 of
      // the build list are the same row seen two ways.
      firstStepTitle: steps[0]?.title ?? "",
      onFirstStepTitleChange: handleFirstStepTitleChange,
      plannedEvidenceType:
        steps[0]?.plannedEvidenceTypes[0] ?? pendingEvidenceType,
      onPlannedEvidenceTypeChange: handlePlannedEvidenceTypeChange,

      // Step 3 · build list.
      steps,
      onReorderSteps: (orderedStepIds) =>
        setSteps((prev) =>
          orderedStepIds
            .map((id) => prev.find((step) => step.id === id))
            .filter((step): step is EditGoalStep => step !== undefined),
        ),
      onReorderSubSteps: (parentStepId, orderedSubStepIds) =>
        setSteps((prev) =>
          prev.map((step) =>
            step.id === parentStepId
              ? {
                  ...step,
                  subSteps: orderedSubStepIds
                    .map((id) => step.subSteps?.find((sub) => sub.id === id))
                    .filter((sub) => sub !== undefined),
                }
              : step,
          ),
        ),
      onReparentStep: (stepId, newParentStepId) =>
        setSteps((prev) => applyReparent(prev, stepId, newParentStepId)),
      onAddStep: (title) =>
        setSteps((prev) => [
          ...prev,
          {
            id: mintId("step"),
            title,
            plannedEvidenceTypes: [EvidenceType.text],
          },
        ]),
      onStepTitleChange: (stepId, title) =>
        setSteps((prev) =>
          prev.map((step) => (step.id === stepId ? { ...step, title } : step)),
        ),
      onStepEvidenceChange: (stepId, types) =>
        setSteps((prev) =>
          prev.map((step) =>
            step.id === stepId
              ? { ...step, plannedEvidenceTypes: types }
              : step,
          ),
        ),
      onAddSubStep: (parentStepId, title) =>
        setSteps((prev) =>
          prev.map((step) =>
            step.id === parentStepId
              ? {
                  ...step,
                  subSteps: [
                    ...(step.subSteps ?? []),
                    {
                      id: mintId("sub"),
                      title,
                      plannedEvidenceTypes: [EvidenceType.text],
                    },
                  ],
                }
              : step,
          ),
        ),
      onSubStepTitleChange: (subStepId, title) =>
        setSteps((prev) =>
          prev.map((step) => ({
            ...step,
            subSteps: step.subSteps?.map((sub) =>
              sub.id === subStepId ? { ...sub, title } : sub,
            ),
          })),
        ),
      onSubStepEvidenceChange: (subStepId, types) =>
        setSteps((prev) =>
          prev.map((step) => ({
            ...step,
            subSteps: step.subSteps?.map((sub) =>
              sub.id === subStepId
                ? { ...sub, plannedEvidenceTypes: types }
                : sub,
            ),
          })),
        ),
      onDeleteSubStep: (subStepId) =>
        setSteps((prev) =>
          prev.map((step) => ({
            ...step,
            subSteps: step.subSteps?.filter((sub) => sub.id !== subStepId),
          })),
        ),
      onDeleteStep: (stepId) =>
        setSteps((prev) => prev.filter((step) => step.id !== stepId)),
    },
  };
}
