import type { TFunction } from "i18next";
import type {
  EditGoalTimingCopy,
  EditGoalViewProps,
} from "../../components/EditGoalView";

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
  | "whenPromptLabel"
  | "editTimingUnsetA11yLabel"
  | "editTimingSetA11yLabel"
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
    whenPromptLabel: t("editGoal:editor.timing.whenPrompt"),
    editTimingUnsetA11yLabel: (title) =>
      t("editGoal:editor.timing.rowUnsetA11yLabel", { title }),
    editTimingSetA11yLabel: (title, lines) =>
      t("editGoal:editor.timing.rowSetA11yLabel", {
        title,
        lines: lines.join(", "),
      }),
  };
}

/**
 * The expanded in-row editor's copy (#576). Separate from the bundle above
 * because it rides `timingHost.copy`, not the view's own prop surface.
 *
 * `after`, `due` and `Done` deliberately reuse the row's own keys rather than
 * getting editor-local copies: the editor's read-out has to match Timeline's
 * and Focus's word for word, and sharing the literal `t()` key is the only way
 * that parity is structural instead of coincidental.
 */
export function buildTimingCopy(
  t: TFunction<["editGoal", "common"]>,
): EditGoalTimingCopy {
  return {
    questionLabel: t("editGoal:editor.timing.question"),
    intentSubLabel: t("editGoal:editor.timing.intentSub"),
    dependsOnLabel: t("editGoal:editor.timing.dependsOn"),
    nothingLabel: t("editGoal:editor.timing.nothing"),
    noCandidatesLabel: t("editGoal:editor.timing.noCandidates"),
    clearLabel: t("editGoal:editor.timing.clear"),
    doneLabel: t("editGoal:actions.done"),
    afterLineLabel: (title) =>
      t("editGoal:stepList.dateDepChips.after", { title }),
    dueLineLabel: (date) => t("editGoal:stepList.dateDepChips.due", { date }),
    doneSuffixLabel: t("editGoal:editor.timing.doneSuffix"),
    orderingNote: (title, date) =>
      t("editGoal:editor.timing.orderingNote", { title, date }),
    // Reads the rendered lines back rather than naming the control, so set and
    // unset announce differently. The `· done ✓` glyph becomes a word: a screen
    // reader given the mark reads punctuation, or nothing.
    timingLineA11yLabel: ({ afterLine, dueLine, afterStepIsCompleted }) => {
      const lines = [
        afterLine && afterStepIsCompleted
          ? `${afterLine}, ${t("editGoal:editor.timing.doneSuffixA11y")}`
          : afterLine,
        dueLine,
      ].filter(Boolean);
      return lines.length
        ? lines.join(", ")
        : t("editGoal:editor.timing.editorUnsetA11yLabel");
    },
    gridCopy: {
      previousMonthLabel: t("editGoal:editor.timing.previousMonth"),
      nextMonthLabel: t("editGoal:editor.timing.nextMonth"),
      legendLabel: t("editGoal:editor.timing.legend"),
      marksA11ySuffix: (count) =>
        t("editGoal:editor.timing.marksA11ySuffix", { count }),
    },
  };
}
