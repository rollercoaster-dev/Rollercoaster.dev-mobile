import type { TFunction } from "i18next";
import type { EditGoalViewProps } from "../../components/EditGoalView";

/**
 * The copy half of EditGoalView's prop surface. The view is deliberately
 * i18n-free with English defaults (#445/D9), so wiring it up means handing it
 * ~30 translated strings — kept here rather than in EditModeScreen so the
 * container stays about Evolu mutations.
 *
 * Most keys already existed for the old StepList-based screen and are reused
 * as-is; only what the redesign genuinely added (the editor section, the
 * per-row confirm-delete copy, the title-bearing reorder announcements) is new.
 */
export type EditGoalCopyProps = Pick<
  EditGoalViewProps,
  | "headerLabel"
  | "goalSectionLabel"
  | "descriptionPlaceholder"
  | "stepsSectionLabel"
  | "stepCountLabel"
  | "addStepPlaceholder"
  | "addStepButtonLabel"
  | "doneLabel"
  | "overflowAccessibilityLabel"
  | "evidencePickerTitle"
  | "evidenceTypesLabel"
  | "closeLabel"
  | "addSubStepLabel"
  | "addSubStepA11yLabel"
  | "breakIntoSubStepsLabel"
  | "breakIntoSubStepsA11yLabel"
  | "newSubStepTitle"
  | "announceReorder"
  | "announcePromote"
  | "announceNestedUnder"
  | "deleteStepConfirmTitle"
  | "deleteStepConfirmMessage"
  | "deleteSubStepConfirmTitle"
  | "deleteSubStepConfirmMessage"
  | "nestUnderTriggerA11yLabel"
  | "nestUnderPickerTitle"
  | "nestUnderRowLabel"
  | "nestUnderRowA11yLabel"
  | "nestUnderCancelLabel"
  | "unNestA11yLabel"
>;

export function buildEditGoalCopy(
  t: TFunction<["editGoal", "common"]>,
): EditGoalCopyProps {
  return {
    headerLabel: t("editGoal:title"),
    goalSectionLabel: t("editGoal:editor.goalSectionLabel"),
    descriptionPlaceholder: t("editGoal:fields.description.placeholder"),
    stepsSectionLabel: t("editGoal:stepList.header"),
    stepCountLabel: (count) => t("editGoal:stepList.count", { count }),
    addStepPlaceholder: t("editGoal:stepList.addPlaceholder"),
    addStepButtonLabel: t("editGoal:stepList.addButtonA11y"),
    doneLabel: t("editGoal:actions.done"),
    overflowAccessibilityLabel: t("editGoal:editor.overflowA11yLabel"),
    evidencePickerTitle: t("editGoal:editor.evidencePickerTitle"),
    evidenceTypesLabel: t("editGoal:stepList.evidenceTypesLabel"),
    closeLabel: t("common:actions.close"),
    addSubStepLabel: t("editGoal:stepList.addSubStepLabel"),
    addSubStepA11yLabel: (title) =>
      t("editGoal:stepList.addSubStepA11yLabel", { title }),
    breakIntoSubStepsLabel: t("editGoal:editor.breakIntoSubStepsLabel"),
    breakIntoSubStepsA11yLabel: (title) =>
      t("editGoal:editor.breakIntoSubStepsA11yLabel", { title }),
    newSubStepTitle: t("editGoal:editor.newSubStepTitle"),
    announceReorder: (title, position) =>
      t("editGoal:stepList.a11y.movedToPosition", { title, position }),
    announcePromote: (title) =>
      t("editGoal:stepList.a11y.stepPromotedToTopLevel", { title }),
    announceNestedUnder: (title, parent) =>
      t("editGoal:stepList.a11y.stepNestedUnder", { title, parent }),
    deleteStepConfirmTitle: t("editGoal:confirmDeleteStep.title"),
    deleteStepConfirmMessage: (title) =>
      t("editGoal:confirmDeleteStep.message", { title }),
    deleteSubStepConfirmTitle: t("editGoal:confirmDeleteSubStep.title"),
    deleteSubStepConfirmMessage: (title) =>
      t("editGoal:confirmDeleteSubStep.message", { title }),
    nestUnderTriggerA11yLabel: t("editGoal:stepList.a11y.nestUnderTriggerA11y"),
    nestUnderPickerTitle: t("editGoal:stepList.a11y.nestUnderPickerTitle"),
    nestUnderRowLabel: (title) =>
      t("editGoal:stepList.a11y.nestUnder", { title }),
    nestUnderRowA11yLabel: (title) =>
      t("editGoal:stepList.a11y.nestUnderA11y", { title }),
    nestUnderCancelLabel: t("common:actions.cancel"),
    unNestA11yLabel: t("editGoal:stepList.a11y.unNestA11y"),
  };
}
