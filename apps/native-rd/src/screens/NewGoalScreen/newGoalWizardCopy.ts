/**
 * Real i18n for every one of NewGoalWizard's copy props ([Integrate] #444).
 *
 * The wizard is prop-driven and i18n-free by design (its D5) — English defaults
 * live in the component, and this is the one place that swaps in `t()` output.
 * Passing translated strings as props changes no component code, so the
 * "mounted as-is" acceptance criterion holds.
 *
 * Two families of keys are deliberately *not* minted under `newGoal` (D4):
 * `common:actions.close` / `common:actions.cancel` are exact matches already,
 * and evidence-type labels go through the shared `evidenceLabel` helper so the
 * wizard's chip can't drift from how every other screen names Note/Photo/…
 *
 * Split out of NewGoalScreen.tsx purely for size — it is one lookup table.
 */
import type { TFunction } from "i18next";
import type { NewGoalWizardProps } from "../../components/NewGoalWizard";
import { evidenceLabel } from "../../i18n/labels";

type NewGoalTFunction = TFunction<["newGoal", "common"]>;

/** Every copy-only prop of NewGoalWizard — no data, no callbacks. */
type NewGoalWizardCopy = Pick<
  NewGoalWizardProps,
  | "headerLabel"
  | "closeAccessibilityLabel"
  | "nameEyebrow"
  | "nameTitle"
  | "goalTitlePlaceholder"
  | "nameHint"
  | "nextLabel"
  | "stepGoalEyebrow"
  | "stepHeadline"
  | "firstStepPlaceholder"
  | "evidenceEyebrow"
  | "changeEvidenceLabel"
  | "changeEvidenceAccessibilityLabel"
  | "plannedEvidenceLabel"
  | "evidenceSheetTitle"
  | "quickAddPrefix"
  | "quickAddLabel"
  | "quickAddAccessibilityLabel"
  | "yourStepsLabel"
  | "addStepPlaceholder"
  | "evidencePickerTitle"
  | "evidenceTypesLabel"
  | "stepCountLabel"
  | "addSubStepLabel"
  | "breakIntoSubStepsLabel"
  | "newSubStepTitle"
  | "addStepButtonLabel"
  | "closeLabel"
  | "breakIntoSubStepsA11yLabel"
  | "addSubStepA11yLabel"
  | "announceReorder"
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
  | "announcePromote"
  | "announceNestedUnder"
  | "buildReadyLabel"
  | "readyHeadline"
  | "stepCountSummary"
  | "badgeNote"
  | "startWorkingLabel"
>;

export function newGoalWizardCopy(t: NewGoalTFunction): NewGoalWizardCopy {
  return {
    headerLabel: t("newGoal:header.label"),
    closeAccessibilityLabel: t("common:actions.close"),

    // Step 1 · name
    nameEyebrow: t("newGoal:name.eyebrow"),
    nameTitle: t("newGoal:name.title"),
    goalTitlePlaceholder: t("newGoal:name.placeholder"),
    nameHint: t("newGoal:name.hint"),
    nextLabel: t("newGoal:name.next"),
    quickAddPrefix: t("newGoal:quickAdd.prefix"),
    quickAddLabel: t("newGoal:quickAdd.label"),
    quickAddAccessibilityLabel: t("newGoal:quickAdd.a11yLabel"),

    // Step 2 · first step
    stepGoalEyebrow: t("newGoal:step.goalEyebrow"),
    stepHeadline: t("newGoal:step.headline"),
    firstStepPlaceholder: t("newGoal:step.placeholder"),
    evidenceEyebrow: t("newGoal:step.evidenceEyebrow"),
    changeEvidenceLabel: t("newGoal:step.changeEvidence"),
    changeEvidenceAccessibilityLabel: (label) =>
      t("newGoal:step.changeEvidenceA11yLabel", { label }),
    plannedEvidenceLabel: (type) => evidenceLabel(t, type),
    evidenceSheetTitle: t("newGoal:step.evidenceSheetTitle"),

    // Step 3 · build list (forwarded on to EditGoalStepList by the wizard)
    yourStepsLabel: t("newGoal:build.yourSteps"),
    addStepPlaceholder: t("newGoal:build.addStepPlaceholder"),
    addStepButtonLabel: t("newGoal:build.addStepButtonLabel"),
    stepCountLabel: (count) => t("newGoal:build.stepCount", { count }),
    evidencePickerTitle: t("newGoal:build.evidencePickerTitle"),
    evidenceTypesLabel: t("newGoal:build.evidenceTypesLabel"),
    closeLabel: t("common:actions.close"),
    addSubStepLabel: t("newGoal:build.addSubStepLabel"),
    breakIntoSubStepsLabel: t("newGoal:build.breakIntoSubStepsLabel"),
    newSubStepTitle: t("newGoal:build.newSubStepTitle"),
    breakIntoSubStepsA11yLabel: (title) =>
      t("newGoal:build.breakIntoSubStepsA11yLabel", { title }),
    addSubStepA11yLabel: (title) =>
      t("newGoal:build.addSubStepA11yLabel", { title }),
    announceReorder: (title, position) =>
      t("newGoal:build.announceReorder", { title, position }),
    deleteStepConfirmTitle: t("newGoal:build.deleteStepConfirmTitle"),
    deleteStepConfirmMessage: (title) =>
      t("newGoal:build.deleteStepConfirmMessage", { title }),
    deleteSubStepConfirmTitle: t("newGoal:build.deleteSubStepConfirmTitle"),
    deleteSubStepConfirmMessage: (title) =>
      t("newGoal:build.deleteSubStepConfirmMessage", { title }),
    nestUnderTriggerA11yLabel: t("newGoal:build.nestUnderTriggerA11yLabel"),
    nestUnderPickerTitle: t("newGoal:build.nestUnderPickerTitle"),
    nestUnderRowLabel: (title) =>
      t("newGoal:build.nestUnderRowLabel", { title }),
    nestUnderRowA11yLabel: (title) =>
      t("newGoal:build.nestUnderRowA11yLabel", { title }),
    nestUnderCancelLabel: t("common:actions.cancel"),
    unNestA11yLabel: t("newGoal:build.unNestA11yLabel"),
    announcePromote: (title) => t("newGoal:build.announcePromote", { title }),
    announceNestedUnder: (title, parentTitle) =>
      t("newGoal:build.announceNestedUnder", { title, parentTitle }),
    buildReadyLabel: t("newGoal:build.readyLabel"),

    // Step 4 · ready
    readyHeadline: t("newGoal:ready.headline"),
    stepCountSummary: (count) => t("newGoal:ready.stepCountSummary", { count }),
    badgeNote: t("newGoal:ready.badgeNote"),
    startWorkingLabel: t("newGoal:ready.startWorking"),
  };
}
