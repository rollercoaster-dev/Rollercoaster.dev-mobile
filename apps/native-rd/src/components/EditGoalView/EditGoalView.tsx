/**
 * EditGoalView — the redesigned Edit Goal screen host (issue #445, Track of
 * Epic #384). Implements the App Shell prototype's `edit` route: an editable
 * goal-title card, a "Steps" section with drag-reorderable rows (title +
 * planned-evidence chip + optional date/dependency chips), an inline "Add
 * step..." row, and a "Done" footer — with "Delete goal" demoted into a ⋯
 * overflow menu (see EditGoalOverflowMenu).
 *
 * Per-row deletion (#460): each step and sub-step carries a × that opens the
 * shared ConfirmDeleteModal; onDeleteStep / onDeleteSubStep fire only on Confirm
 * (D1). One modal instance, driven by local pendingDelete state (D2).
 *
 * Pure, prop-driven, i18n-free (D9): all copy arrives as props with English
 * defaults; the future [Integrate] issue threads real t() output through them
 * and wires the callbacks (including goal-level delete confirm) to Evolu.
 * Storybook-first, so every theme + the reorder/evidence/delete interactions can
 * be verified before the screen is wired.
 * `grep -rn "EditGoalView" src/screens` stays empty until then.
 *
 * This component is the screen host: a flex:1 column (header, an internal
 * ScrollView wrapping the goal-title card / optional description /
 * EditGoalStepList, then a pinned Done footer) with the
 * shared evidence-picker AnimatedSheet as a root-level sibling of that
 * ScrollView. The sheet's in-tree absolute overlay therefore fills the
 * viewport, not the scroll content (#493/D8) — so it rises from the bottom of
 * the screen with a full-frame scrim, matching the New Goal wizard's capture
 * sheet, instead of the bottom of the list. The evidence-picker open state
 * (editingEvidenceId) + its toggle handler live here for the same reason.
 *
 * The step-row list layer — rows, sub-step blocks, add-step affordance,
 * inline-rename / delete-confirm state, and the ConfirmDeleteModal it drives —
 * lives in EditGoalStepList (issue #489), which the New Goal wizard reuses
 * (#490); it signals evidence-chip taps outward via onEvidenceChipPress. The
 * shared step/sub-step types stay defined here (D2).
 *
 * Drag orchestration lives in useEditGoalDrag; the row anatomy in
 * EditGoalStepRow; the ⋯ menu content in EditGoalOverflowMenu.
 */
import React, { useRef, useState } from "react";
import {
  View,
  Text as RNText,
  TextInput,
  ScrollView,
  type GestureResponderEvent,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { DotsThree, Pencil } from "phosphor-react-native";
import { useUnistyles } from "react-native-unistyles";
import { IconButton } from "../IconButton";
import { Button } from "../Button";
import { ScreenSubHeader } from "../ScreenHeader/ScreenSubHeader";
import { EvidenceTypePicker } from "../EvidenceTypePicker";
import { AnimatedSheet } from "../EvidenceTypePicker/AnimatedSheet";
import type { EvidenceTypeValue } from "../../types/evidence";
import type { StepDayMark } from "../StepDayGrid";
import type {
  StepTimingCandidate,
  StepTimingEditorProps,
  StepTimingValue,
} from "../StepTimingEditor";
import type { DragScrollController } from "../StepList/dragAutoScroll";
import { EditGoalStepList } from "./EditGoalStepList";
import { styles } from "./EditGoalView.styles";

/** Tone of one date/dependency truth-line on a step row's timing line (D5). */
export type EditGoalChipTone = "after" | "waiting" | "due";

/**
 * One date/dependency truth-line on a row's timing line.
 *
 * Read-only as data — #575 made the *line* pressable, but a tap only signals
 * `onEditTiming`; nothing here is edited in place. The ND "show what's there,
 * not what's absent" rule still holds wherever the row is inert: with no
 * `onEditTiming`, absent chips render nothing. It is only the interactive path
 * that deliberately offers a `＋ when?` prompt instead, and even then never on a
 * completed row (D3/D7).
 */
export interface EditGoalDateDepChip {
  tone: EditGoalChipTone;
  /** Chip text, e.g. "after Draft outline", "Alex", "Fri". */
  text: string;
}

/**
 * Copy for the in-row timing editor (#576), forwarded verbatim to
 * `StepTimingEditor` and, through it, to the embedded `StepDayGrid`.
 *
 * Grouped rather than flattened for the same reason `StepTimingEditor` groups
 * its own `gridCopy`: the editor's copy surface stays the editor's, so adding a
 * string there does not mean editing three list layers here. `whenPromptLabel`
 * is deliberately **not** in the group — the unset prompt is shared with the
 * read-only {@link EditGoalTimingLine}, and one prompt means one prop.
 *
 * `afterLineLabel` / `dueLineLabel` / `doneLabel` belong here too: the screen
 * fills them from the same `t()` keys the row's chips use, which is what keeps
 * the editor's read-out identical to Timeline's and Focus's.
 */
export type EditGoalTimingCopy = Pick<
  StepTimingEditorProps,
  | "questionLabel"
  | "intentSubLabel"
  | "dependsOnLabel"
  | "nothingLabel"
  | "noCandidatesLabel"
  | "clearLabel"
  | "doneLabel"
  | "afterLineLabel"
  | "dueLineLabel"
  | "doneSuffixLabel"
  | "orderingNote"
  | "timingLineA11yLabel"
  | "gridCopy"
>;

/**
 * The host's half of the in-row timing editor (#576) — which row is open, the
 * three write/close callbacks, and the two values neither the editor nor its
 * grid will read for itself.
 *
 * One object rather than seven props, because all seven travel together through
 * three component layers to reach one call site. {@link bindRowTiming} turns it
 * into a single row's id-bound props.
 */
export interface EditGoalTimingHost {
  /**
   * Which step or sub-step has its editor open. One id at a time: the editor
   * unfolds inside the row with the list still on screen, so a second one open
   * would push the first's context off it.
   */
  expandedId: string | null;
  /** `Done` inside the expanded editor. */
  onCommit: (id: string, next: StepTimingValue) => void;
  /** `Clear` inside the expanded editor — drops the date and the dependency. */
  onClear: (id: string) => void;
  /**
   * The editor asked to close (`Done` and `Clear` route here too, right after
   * their own callback). Separate from `onEditTiming` so a host whose write just
   * failed can keep the row open — the editor cannot veto its own collapse.
   */
  onCollapse: (id: string) => void;
  /**
   * The instant the editor and its grid judge "today" against. Neither reads
   * the clock itself, which is what lets tests and stories pin one.
   */
  now: Date;
  /** BCP-47 tag for the grid's month and weekday names. */
  locale?: string;
  /** Translated copy for the expanded editor (English defaults inside it). */
  copy?: EditGoalTimingCopy;
}

/**
 * Everything the in-row `StepTimingEditor` needs for one row, pre-resolved by
 * the host (#576) — the candidate population, the current draft seed, and the
 * two display strings the editor cannot derive itself.
 *
 * Grouped into one field rather than six loose props because it rides the step
 * object through three component layers, and because the whole bundle is
 * computed in one pass per goal (`editGoalSteps.ts`): either a row has an
 * editable timing surface or it has none. Absent → the row keeps rendering the
 * read-only {@link EditGoalTimingLine} and nothing expands, which is what every
 * Storybook story and the New Goal wizard get.
 *
 * `value.afterStepId` is seeded **from `candidates`**, never straight from the
 * DB column: the draft the editor commits has to match what its picker shows,
 * so a dependency that resolves to no offered candidate (deleted target, or the
 * far side of a mutual two-step cycle) seeds as `null` rather than as an id the
 * user was never shown.
 */
export interface EditGoalTiming {
  /** The committed timing this row opens with. */
  value: StepTimingValue;
  /** Every other step and sub-step in the goal this one may depend on. */
  candidates: readonly StepTimingCandidate[];
  /** The selected candidate's title, or null when nothing is selected. */
  afterStepTitle: string | null;
  /** Whether that candidate is completed — drives the opt-in `done` suffix. */
  afterStepIsCompleted: boolean;
  /** `value.dueDate` formatted for the active locale. */
  dueDateLabel: string | null;
  /** Days the other steps sit on, for the embedded grid's badges. */
  marks: readonly StepDayMark[];
}

/**
 * A sub-step nested under a parent step (D12) — the app's one-level
 * `parentStepId` model (`schema.ts`). It carries its own title, planned
 * evidence (every step, including a sub-step, requires evidence) and — since
 * #575 — its own timing, but no further nesting (depth is capped at one level).
 */
export interface EditGoalSubStep {
  id: string;
  title: string;
  /** Planned evidence types (multi, D4). Non-empty — same invariant as a step. */
  plannedEvidenceTypes: EvidenceTypeValue[];
  /**
   * Optional date/dependency chips, same shape as a step's (#575/D4). Reverses
   * "#407 OQ-2" ("sub-steps carry no C/B band"): StepTimingEditor (#573)
   * already treats sub-steps as full timing participants, so the two
   * step-shapes stay symmetric. Absent/empty → no timing to display.
   */
  dateDepChips?: EditGoalDateDepChip[];
  /**
   * Whether this sub-step is done (#575/D4). Only gates the *unset* timing
   * placeholder: nothing is left to plan on a finished sub-step, so it carries
   * no `＋ when?` prompt — timing it already has still shows.
   */
  isCompleted?: boolean;
  /** Pre-resolved in-row timing editor data (#576). Absent → read-only line. */
  timing?: EditGoalTiming;
}

export interface EditGoalStep {
  id: string;
  title: string;
  /**
   * Planned evidence types (multi, D4 — matches the app's `string[]` data
   * model). At least one entry: "every step requires evidence" is a product
   * invariant, so the evidence picker refuses to leave this empty.
   */
  plannedEvidenceTypes: EvidenceTypeValue[];
  /** Optional date/dependency truth-lines (D5). Absent/empty → the unset state. */
  dateDepChips?: EditGoalDateDepChip[];
  /**
   * Whether this step is done (#575/D3), reversing #446's D3 ("no status field"
   * — `docs/plans/dev-plans/issue-446-integrate-edit-goal.md`). Only gates the
   * *unset* timing placeholder: a completed step with nothing set renders no
   * timing line at all, while timing it already has still shows. Mirrors
   * StepTimingEditor's own `isCompleted` prop (#573).
   */
  isCompleted?: boolean;
  /** Pre-resolved in-row timing editor data (#576). Absent → read-only line. */
  timing?: EditGoalTiming;
  /**
   * Optional one-level sub-steps (D12). Absent/empty → the row shows a
   * "break into sub-steps" prompt; non-empty → an indented block of
   * sub-rows plus an "add a sub-step" affordance. Matches the Edit Goal C
   * prototype's edit view and the app's `parentStepId` data model.
   */
  subSteps?: EditGoalSubStep[];
}

export interface EditGoalViewProps {
  goalTitle: string;
  onGoalTitleChange: (title: string) => void;
  /**
   * Optional goal description (D3). When `undefined` (the shipped default,
   * matching the canonical prototype) no description UI renders — absence is
   * silent. Supplying it opts the field back in for the [Integrate] issue.
   */
  description?: string;
  onDescriptionChange?: (description: string) => void;
  steps: EditGoalStep[];
  /** Fired on drop with the full new step order. Not wired to persistence. */
  onReorderSteps: (orderedStepIds: string[]) => void;
  /**
   * Fired on drop / ↑↓ with a parent's new sub-step order (#459). Scoped to one
   * parent — siblings under other parents never move. Not wired to persistence.
   */
  onReorderSubSteps: (
    parentStepId: string,
    orderedSubStepIds: string[],
  ) => void;
  /**
   * Fired on a drag-reparent / nest-under / un-nest (#496). When omitted the
   * editor collapses to sibling reorder only and the nest/un-nest accessible
   * controls do not render (R5).
   */
  onReparentStep?: (stepId: string, newParentStepId: string | null) => void;
  onAddStep: (title: string) => void;
  onStepTitleChange: (stepId: string, title: string) => void;
  /**
   * Fired when the host's evidence sheet toggles a step's planned types
   * (#493/D8) — the last remaining type can't be deselected.
   */
  onStepEvidenceChange: (stepId: string, types: EvidenceTypeValue[]) => void;
  /**
   * Adds a sub-step under `parentStepId` (D12). Called with `newSubStepTitle`
   * — the new sub-row is then renameable inline (mirrors how the C prototype's
   * create flow seeds a default-titled step). Not wired to persistence.
   */
  onAddSubStep: (parentStepId: string, title: string) => void;
  onSubStepTitleChange: (subStepId: string, title: string) => void;
  /**
   * Fired when the host's evidence sheet toggles a sub-step's planned types
   * (#493/D8, D12) — the last remaining type can't be deselected.
   */
  onSubStepEvidenceChange: (
    subStepId: string,
    types: EvidenceTypeValue[],
  ) => void;
  onDeleteSubStep: (subStepId: string) => void;
  /** Deletes a top-level step (#460). Fired only after the user confirms (D1). */
  onDeleteStep: (stepId: string) => void;
  onOverflowPress: () => void;
  onBack: () => void;
  onDone: () => void;
  /**
   * Optional auto-scroll controller for drags near the viewport edge, supplied
   * by the screen that owns the ScrollView ([Integrate]). Omitted in Storybook
   * (short lists don't scroll); reorder still works without it.
   */
  dragScrollController?: DragScrollController;
  /**
   * Instrumentation for the internal ScrollView, supplied by the same screen
   * that supplies `dragScrollController` (#446). The ScrollView lives in here
   * (#493/D8), so the screen cannot attach these itself — and without them the
   * controller's metrics stay at zero, which makes `getAutoScrollVelocity`
   * return 0 for every pointer position and silently kills edge auto-scroll.
   * Omitted in Storybook (short lists don't scroll).
   */
  scrollInstrumentation?: {
    ref?: React.Ref<ScrollView>;
    onLayout?: (event: LayoutChangeEvent) => void;
    onScroll?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
    onContentSizeChange?: (width: number, height: number) => void;
  };

  // --- Copy (i18n-free per D9; English defaults; [Integrate] passes t()). ---
  headerLabel?: string;
  goalSectionLabel?: string;
  stepsSectionLabel?: string;
  addStepPlaceholder?: string;
  descriptionPlaceholder?: string;
  /**
   * a11y label for the description input when no `descriptionPlaceholder` is
   * supplied. Kept distinct from `goalSectionLabel` so the description and
   * title inputs don't announce identically to screen readers (D3 defer path).
   */
  descriptionSectionLabel?: string;
  doneLabel?: string;
  overflowAccessibilityLabel?: string;
  evidencePickerTitle?: string;
  evidenceTypesLabel?: string;
  /** Pluralized step-count label. Default: "N step" / "N steps". */
  stepCountLabel?: (count: number) => string;
  /** "add a sub-step" affordance under a step that already has some (D12). */
  addSubStepLabel?: string;
  /** "break into sub-steps" prompt on a step with none (D12). */
  breakIntoSubStepsLabel?: string;
  /** Default title for a freshly-added sub-step, renamed inline after (D12). */
  newSubStepTitle?: string;
  /** a11y label for the "add step" + button. */
  addStepButtonLabel?: string;
  /** a11y label for the evidence-picker close affordances (backdrop + ✕). */
  closeLabel?: string;
  /** a11y label for the "break into sub-steps" prompt on a step (D12). */
  breakIntoSubStepsA11yLabel?: (stepTitle: string) => string;
  /** a11y label for the "add a sub-step" affordance under a step (D12). */
  addSubStepA11yLabel?: (stepTitle: string) => string;
  /**
   * Builds the screen-reader announcement after a reorder (drag drop or ↑/↓
   * fallback). `position` is 1-based. Defaults to `Moved "<title>" to position
   * N` inside {@link useEditGoalDrag}.
   */
  announceReorder?: (stepTitle: string, position: number) => string;

  // --- Confirm-delete copy (D5; English defaults; [Integrate] passes t()).
  // The modal's own Delete/Cancel button labels come from ConfirmDeleteModal's
  // internal i18n — only the title + message are threaded here. ---
  /** Confirm-modal title when deleting a step. */
  deleteStepConfirmTitle?: string;
  /** Confirm-modal message when deleting a step (receives the step title). */
  deleteStepConfirmMessage?: (title: string) => string;
  /** Confirm-modal title when deleting a sub-step. */
  deleteSubStepConfirmTitle?: string;
  /** Confirm-modal message when deleting a sub-step (receives the sub-step title). */
  deleteSubStepConfirmMessage?: (title: string) => string;
  // --- Nest-under / un-nest copy (#496, R10) ---
  nestUnderTriggerA11yLabel?: string;
  nestUnderPickerTitle?: string;
  nestUnderRowLabel?: (targetTitle: string) => string;
  nestUnderRowA11yLabel?: (targetTitle: string) => string;
  nestUnderCancelLabel?: string;
  unNestA11yLabel?: string;
  announcePromote?: (stepTitle: string) => string;
  announceNestedUnder?: (stepTitle: string, parentTitle: string) => string;
  // --- Timing line (#575) ---
  /**
   * Fired when a step's or sub-step's timing line is tapped (#575). Ids are
   * unique across both. Omitted → every timing line renders inert (D7). This
   * view opens no editor — #576 wires the callback to StepTimingEditor.
   */
  onEditTiming?: (id: string) => void;
  /** Unset-state timing prompt (#575). */
  whenPromptLabel?: string;
  /** a11y label for a timing line when nothing is set (#575). */
  editTimingUnsetA11yLabel?: (title: string) => string;
  /** a11y label for a timing line when timing is set (#575). */
  editTimingSetA11yLabel?: (title: string, lines: string[]) => string;
  /**
   * Everything the in-row timing editor needs from its host (#576). Omitted →
   * no row can expand and every timing line stays read-only.
   */
  timingHost?: EditGoalTimingHost;
}

export function EditGoalView({
  goalTitle,
  onGoalTitleChange,
  description,
  onDescriptionChange,
  steps,
  onReorderSteps,
  onReorderSubSteps,
  onReparentStep,
  onAddStep,
  onStepTitleChange,
  onStepEvidenceChange,
  onAddSubStep,
  onSubStepTitleChange,
  onSubStepEvidenceChange,
  onDeleteSubStep,
  onDeleteStep,
  onOverflowPress,
  onBack,
  onDone,
  dragScrollController,
  scrollInstrumentation,
  headerLabel = "Edit goal",
  goalSectionLabel = "Goal",
  descriptionPlaceholder,
  descriptionSectionLabel = "Goal description",
  doneLabel = "Done",
  overflowAccessibilityLabel = "More options",
  // Evidence-picker copy is consumed here now — the sheet + its state were
  // lifted up from EditGoalStepList (#493/D8), so their English defaults live
  // here rather than being forwarded to the list.
  evidencePickerTitle = "Planned evidence",
  evidenceTypesLabel = "Evidence types",
  closeLabel = "Close",
  // Copy consumed only by the step-row list layer — forwarded straight to
  // EditGoalStepList, which owns their English defaults. Not defaulted
  // here so there's a single source of truth per prop.
  stepsSectionLabel,
  addStepPlaceholder,
  stepCountLabel,
  addSubStepLabel,
  breakIntoSubStepsLabel,
  newSubStepTitle,
  addStepButtonLabel,
  breakIntoSubStepsA11yLabel,
  addSubStepA11yLabel,
  announceReorder,
  deleteStepConfirmTitle,
  deleteStepConfirmMessage,
  deleteSubStepConfirmTitle,
  deleteSubStepConfirmMessage,
  nestUnderTriggerA11yLabel,
  nestUnderPickerTitle,
  nestUnderRowLabel,
  nestUnderRowA11yLabel,
  nestUnderCancelLabel,
  unNestA11yLabel,
  announcePromote,
  announceNestedUnder,
  onEditTiming,
  whenPromptLabel,
  editTimingUnsetA11yLabel,
  editTimingSetA11yLabel,
  timingHost,
}: EditGoalViewProps) {
  const { theme } = useUnistyles();

  // Evidence-picker open state, lifted here from EditGoalStepList (#493/D8) so
  // the shared AnimatedSheet can render as a root-level sibling of the
  // ScrollView (i.e. anchored to the viewport, not the scroll content). A chip
  // tap in the list calls onEvidenceChipPress → setEditingEvidenceId; the sheet
  // gates on the derived editingEvidenceTypes below.
  const [editingEvidenceId, setEditingEvidenceId] = useState<string | null>(
    null,
  );

  // Scrolling is off while a row is dragged: a native ScrollView isn't in
  // RNGH's gesture tree, so otherwise it wins the pan and the row never moves.
  const [rowDragging, setRowDragging] = useState(false);

  // Native tag of the evidence chip that opened the sheet, captured from the
  // Pressable's press event (#501). Threaded straight into AnimatedSheet's
  // restoreFocusRef so focus returns to that chip on any dismissal — avoids
  // threading a View ref down through the list/row layers (D2). A RefObject
  // whose current is a number; focusAccessibilityRef uses it as the tag.
  const restoreFocusTagRef = useRef<number | null>(null);
  function handleEvidenceChipPress(id: string, event: GestureResponderEvent) {
    // RN types nativeEvent.target as string, but it's the numeric react tag at
    // runtime — the exact input setAccessibilityFocus expects.
    restoreFocusTagRef.current =
      (event?.nativeEvent?.target as unknown as number | undefined) ?? null;
    setEditingEvidenceId(id);
  }

  // Find the sub-step with `id` across every parent (one-level, D12).
  function findSubStep(id: string) {
    for (const s of steps) {
      const sub = s.subSteps?.find((ss) => ss.id === id);
      if (sub) return sub;
    }
    return undefined;
  }

  const editingEvidenceStep =
    editingEvidenceId !== null
      ? steps.find((s) => s.id === editingEvidenceId)
      : undefined;
  const editingEvidenceSub =
    editingEvidenceId !== null && !editingEvidenceStep
      ? findSubStep(editingEvidenceId)
      : undefined;
  const editingEvidenceTypes =
    editingEvidenceStep?.plannedEvidenceTypes ??
    editingEvidenceSub?.plannedEvidenceTypes;

  // Keep the last non-undefined selection so the picker grid renders through
  // the sheet's slide-out. On close, editingEvidenceId → null flips both
  // `visible` and `editingEvidenceTypes` to undefined on the same render; the
  // sheet keeps its chrome mounted for the exit animation, so gating the grid
  // directly on editingEvidenceTypes would animate out an empty sheet (#493).
  // Adjusting state during render (React's sanctioned "store info from a
  // previous render" pattern) rather than a ref keeps the React Compiler happy.
  const [retainedEvidenceTypes, setRetainedEvidenceTypes] = useState<
    EvidenceTypeValue[] | undefined
  >(undefined);
  if (
    editingEvidenceTypes !== undefined &&
    editingEvidenceTypes !== retainedEvidenceTypes
  ) {
    setRetainedEvidenceTypes(editingEvidenceTypes);
  }
  const sheetEvidenceTypes = editingEvidenceTypes ?? retainedEvidenceTypes;

  // Evidence-picker toggle (D8/D12). Guards the "every step requires evidence"
  // invariant: the last remaining type can't be deselected (no-op), so a step
  // or sub-step never lands in a 0-selected state. Routes to the step or
  // sub-step callback depending on which id opened the picker.
  function handleToggleEvidence(type: EvidenceTypeValue) {
    if (editingEvidenceId === null) return;
    const step = steps.find((s) => s.id === editingEvidenceId);
    const sub = step ? undefined : findSubStep(editingEvidenceId);
    const current = step?.plannedEvidenceTypes ?? sub?.plannedEvidenceTypes;
    if (!current) return;
    const isSelected = current.includes(type);
    if (isSelected && current.length === 1) return;
    const next = isSelected
      ? current.filter((t) => t !== type)
      : [...current, type];
    if (step) {
      onStepEvidenceChange(editingEvidenceId, next);
    } else {
      onSubStepEvidenceChange(editingEvidenceId, next);
    }
  }

  const sheetOpen = editingEvidenceTypes !== undefined;

  return (
    <View style={styles.container}>
      {/* Everything except the sheet. iOS gets modal isolation from
          AnimatedSheet's accessibilityViewIsModal; Android has no equivalent
          (accessibilityViewIsModal is iOS-only in RN 0.85), so hide this
          subtree from TalkBack while the sheet is open so swiping past the last
          sheet control can't reach content behind it (#501). Accessibility-tree
          only — no layout/visual change. */}
      <View
        testID="edit-goal-content"
        style={styles.content}
        importantForAccessibility={sheetOpen ? "no-hide-descendants" : "auto"}
      >
        <ScreenSubHeader
          label={headerLabel}
          onBack={onBack}
          right={
            <IconButton
              icon={<DotsThree size={24} weight="bold" />}
              tone="chrome"
              onPress={onOverflowPress}
              accessibilityLabel={overflowAccessibilityLabel}
              testID="edit-goal-overflow-trigger"
            />
          }
        />

        {/* Scrollable content. Internal ScrollView (not the body View it replaced)
          so the flex:1 container splits into [header][scroll][footer] and the
          sheet's absolute overlay — a sibling below — fills the viewport rather
          than the scroll content (#493/D8). */}
        <ScrollView
          ref={scrollInstrumentation?.ref}
          onLayout={scrollInstrumentation?.onLayout}
          onScroll={scrollInstrumentation?.onScroll}
          scrollEventThrottle={16}
          onContentSizeChange={scrollInstrumentation?.onContentSizeChange}
          scrollEnabled={!rowDragging}
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          // Rename rows commit on blur, and the default ("never") swallows the
          // first tap to dismiss the keyboard — which blurs the field and
          // closes the editor. "handled" delivers taps to the row's own
          // controls (the clear button, evidence chip) while an edit is in flight.
          keyboardShouldPersistTaps="handled"
        >
          {/* Optional description (D3) — rendered only when the prop is supplied;
            no "add a description" affordance when absent. */}
          {description !== undefined ? (
            <View style={styles.descriptionBlock}>
              <TextInput
                style={styles.descriptionInput}
                value={description}
                onChangeText={onDescriptionChange}
                placeholder={descriptionPlaceholder}
                placeholderTextColor={theme.colors.textMuted}
                multiline
                testID="edit-goal-description-input"
                accessibilityLabel={
                  descriptionPlaceholder ?? descriptionSectionLabel
                }
              />
            </View>
          ) : null}

          <RNText style={styles.sectionLabel}>{goalSectionLabel}</RNText>
          <View style={styles.titleCard}>
            <TextInput
              style={styles.titleInput}
              value={goalTitle}
              onChangeText={onGoalTitleChange}
              // Single-line rename; "done" blurs on submit so the keyboard
              // never strands the Done button below it (#502).
              returnKeyType="done"
              testID="edit-goal-title-input"
              accessibilityLabel={goalSectionLabel}
            />
            <Pencil
              size={16}
              weight="bold"
              color={theme.colors.textSecondary}
            />
          </View>

          {/* Step-row list layer (#489): "Steps" header + count, drag-reorderable
            rows, sub-step blocks, add-step affordance, and the confirm-delete
            modal. It reports evidence-chip taps outward via onEvidenceChipPress;
            the picker sheet itself is owned here (#493/D8). */}
          <EditGoalStepList
            steps={steps}
            onReorderSteps={onReorderSteps}
            onReorderSubSteps={onReorderSubSteps}
            onReparentStep={onReparentStep}
            onAddStep={onAddStep}
            onStepTitleChange={onStepTitleChange}
            onEvidenceChipPress={handleEvidenceChipPress}
            onAddSubStep={onAddSubStep}
            onSubStepTitleChange={onSubStepTitleChange}
            onDeleteSubStep={onDeleteSubStep}
            onDeleteStep={onDeleteStep}
            dragScrollController={dragScrollController}
            onDragStateChange={setRowDragging}
            stepsSectionLabel={stepsSectionLabel}
            addStepPlaceholder={addStepPlaceholder}
            stepCountLabel={stepCountLabel}
            addSubStepLabel={addSubStepLabel}
            breakIntoSubStepsLabel={breakIntoSubStepsLabel}
            newSubStepTitle={newSubStepTitle}
            addStepButtonLabel={addStepButtonLabel}
            breakIntoSubStepsA11yLabel={breakIntoSubStepsA11yLabel}
            addSubStepA11yLabel={addSubStepA11yLabel}
            announceReorder={announceReorder}
            deleteStepConfirmTitle={deleteStepConfirmTitle}
            deleteStepConfirmMessage={deleteStepConfirmMessage}
            deleteSubStepConfirmTitle={deleteSubStepConfirmTitle}
            deleteSubStepConfirmMessage={deleteSubStepConfirmMessage}
            nestUnderTriggerA11yLabel={nestUnderTriggerA11yLabel}
            nestUnderPickerTitle={nestUnderPickerTitle}
            nestUnderRowLabel={nestUnderRowLabel}
            nestUnderRowA11yLabel={nestUnderRowA11yLabel}
            nestUnderCancelLabel={nestUnderCancelLabel}
            unNestA11yLabel={unNestA11yLabel}
            announcePromote={announcePromote}
            announceNestedUnder={announceNestedUnder}
            onEditTiming={onEditTiming}
            whenPromptLabel={whenPromptLabel}
            editTimingUnsetA11yLabel={editTimingUnsetA11yLabel}
            editTimingSetA11yLabel={editTimingSetA11yLabel}
            timingHost={timingHost}
          />
        </ScrollView>

        <View style={styles.footer}>
          <Button
            label={doneLabel}
            variant="secondary"
            onPress={onDone}
            testID="edit-goal-done-button"
          />
        </View>
      </View>

      {/* Evidence-type picker (D8/D12): the reused multi-select authoring grid
          in the shared AnimatedSheet chrome (#493). A root-level sibling of the
          ScrollView + footer, so its in-tree absolute overlay fills the flex:1
          container (= the viewport) and rises from the screen bottom with a
          full-frame scrim — same reanimated slide/scrim, Android-back dismiss
          and animation-pref timing as the New Goal wizard's capture sheet.
          Opened by a step OR a sub-step's chip; toggling updates that row's
          pills via onStepEvidenceChange / onSubStepEvidenceChange; the last
          remaining type can't be deselected (handleToggleEvidence guard). */}
      <AnimatedSheet
        visible={sheetOpen}
        onClose={() => setEditingEvidenceId(null)}
        title={evidencePickerTitle}
        closeLabel={closeLabel}
        closeTestID="edit-goal-evidence-close"
        backdropTestID="edit-goal-evidence-backdrop"
        restoreFocusRef={restoreFocusTagRef}
      >
        {sheetEvidenceTypes ? (
          <EvidenceTypePicker
            selectedTypes={sheetEvidenceTypes}
            onToggleType={handleToggleEvidence}
            label={evidenceTypesLabel}
          />
        ) : null}
      </AnimatedSheet>
    </View>
  );
}
