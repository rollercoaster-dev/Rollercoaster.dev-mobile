/**
 * NewGoalWizard — the New Goal modal wizard frame (umbrella #443, Epic #384).
 * Implements the App Shell prototype's `newgoal` route: a header band
 * (conditional back · "New goal" · × close), a 4-segment progress bar, and a
 * body/footer switch over the wizard's four steps, all shipped across three
 * slices:
 *   - Step 1 · name and Step 4 · ready — slice 1/3 (#462)
 *   - Step 2 · first step (goal recap, first-step input, planned-evidence chip
 *     composing EvidenceTypePicker's capture sheet) — slice 2/3 (#463)
 *   - Step 3 · build — reuses EditGoalStepList (#489/#490): the same "Your
 *     steps" header + count, drag-reorderable rows, evidence chips, inline
 *     rename, confirmed delete, and one-level sub-steps that the Edit Goal
 *     screen uses. Following #493/#494, the list reports evidence-chip taps
 *     outward via onEvidenceChipPress and the wizard owns the shared
 *     EvidenceTypePicker sheet (AnimatedSheet chrome) as a root-level sibling,
 *     mirroring EditGoalView. The wizard keeps only its frame chrome (header
 *     band, progress bar, "I'm ready →" footer); it no longer carries a second,
 *     weaker step editor. This also deletes the BuildStep/EditGoalStep data-model
 *     fork [Integrate] (#444) would otherwise reconcile.
 *
 * Pure, prop-driven, i18n-free (D5): all copy arrives as props with English
 * defaults; the future [Integrate] issue (#444) threads real t() output
 * through them and wires the callbacks to navigation + Evolu. Storybook-first,
 * so `grep -rn "NewGoalWizard" src/screens` stays empty until then.
 */
import React, { useRef, useState } from "react";
import {
  View,
  Text as RNText,
  TextInput,
  Pressable,
  ScrollView,
  type GestureResponderEvent,
} from "react-native";
import { X } from "phosphor-react-native";
import { useUnistyles } from "react-native-unistyles";
import { IconButton } from "../IconButton";
import { Button } from "../Button";
import { ScreenSubHeader } from "../ScreenHeader/ScreenSubHeader";
import { EvidenceTypePicker } from "../EvidenceTypePicker";
import { AnimatedSheet } from "../EvidenceTypePicker/AnimatedSheet";
import { EditGoalStepList, type EditGoalStep } from "../EditGoalView";
import type { DragScrollController } from "../StepList/dragAutoScroll";
import { EvidenceType } from "../../db";
import { EVIDENCE_OPTIONS, type EvidenceTypeValue } from "../../types/evidence";
import { styles } from "./NewGoalWizard.styles";

/**
 * Ordered wizard positions — the single source of truth. Drives the progress
 * bar's filled-segment count, and NewGoalWizardStep is derived from it so the
 * two can't drift: a step added here can't be missed by the type, and
 * `indexOf(currentStep)` can never return -1. All four bodies now render real
 * content (name/ready #462, step #463, build #464).
 */
const STEP_ORDER = ["name", "step", "build", "ready"] as const;

/** Wizard position — derived from STEP_ORDER (see above). */
export type NewGoalWizardStep = (typeof STEP_ORDER)[number];

export interface NewGoalWizardProps {
  currentStep: NewGoalWizardStep;
  /** Goal title — the Step 1 input value, echoed on the ready summary card. */
  goalTitle: string;
  onGoalTitleChange: (title: string) => void;
  /** Step count shown on the ready summary card. */
  stepCount: number;
  /** Back arrow. Not rendered at all on "name" — nowhere to go back to. */
  onBack: () => void;
  /** × close, available from every step. */
  onClose: () => void;
  /** Primary advance from the name and first-step steps (linear next). */
  onNext: () => void;
  /** Quiet fast path on the name step — distinct from onNext, never conflated. */
  onQuickAdd: () => void;
  /** Primary CTA on the ready step. */
  onStartWorking: () => void;

  // --- Step 2 · first step (#463) ---
  /** First-step title input value. */
  firstStepTitle?: string;
  onFirstStepTitleChange?: (title: string) => void;
  /**
   * Planned evidence type for the first step. Born as "Note" (D4) and never
   * unset — the chip always renders a real type, never a missing/empty state.
   */
  plannedEvidenceType?: EvidenceTypeValue;
  onPlannedEvidenceTypeChange?: (type: EvidenceTypeValue) => void;
  /**
   * Controlled visibility of the evidence-type capture sheet (D1) — external so
   * the Step2PickerOpen story is a trivial `useState(true)`, matching the
   * component's zero-internal-state contract.
   */
  evidencePickerOpen?: boolean;
  onOpenEvidencePicker?: () => void;
  onCloseEvidencePicker?: () => void;

  // --- Step 3 · build — reuses EditGoalStepList (#489/#490, D2). ---
  /**
   * The full step list rendered on the build screen. Optional with an empty
   * default (like step 2's props), so a caller can mount "build" before seeding
   * rows; an empty list renders a count of 0 and no rows. The rich multi-select
   * shape (`plannedEvidenceTypes`, min 1) + one-level sub-steps is the identical
   * data model the Edit Goal screen edits — no BuildStep fork. Independent of
   * firstStepTitle/plannedEvidenceType this slice (D2); [Integrate] (#444)
   * unifies them.
   */
  steps?: EditGoalStep[];
  /** Fired on drop / ↑↓ with the full new step order. */
  onReorderSteps?: (orderedStepIds: string[]) => void;
  /** Fired on drop / ↑↓ with a parent's new sub-step order (scoped to it). */
  onReorderSubSteps?: (
    parentStepId: string,
    orderedSubStepIds: string[],
  ) => void;
  /** Fired on a drag-reparent / nest-under / un-nest (#496). Optional; when
   * omitted the build step collapses to sibling reorder only. */
  onReparentStep?: (stepId: string, newParentStepId: string | null) => void;
  /** Appends a step titled from EditGoalStepList's inline "Add step..." input (D3). */
  onAddStep?: (title: string) => void;
  onStepTitleChange?: (stepId: string, title: string) => void;
  /** Toggles a step's planned evidence types (multi-select, min 1). */
  onStepEvidenceChange?: (stepId: string, types: EvidenceTypeValue[]) => void;
  /** Adds a sub-step under `parentStepId` (renameable inline after). */
  onAddSubStep?: (parentStepId: string, title: string) => void;
  onSubStepTitleChange?: (subStepId: string, title: string) => void;
  onSubStepEvidenceChange?: (
    subStepId: string,
    types: EvidenceTypeValue[],
  ) => void;
  onDeleteSubStep?: (subStepId: string) => void;
  /** Deletes a top-level step. Fired only after the user confirms (D1). */
  onDeleteStep?: (stepId: string) => void;
  /**
   * Optional auto-scroll controller for drags near the viewport edge, supplied
   * by the screen that owns the ScrollView ([Integrate]). Omitted in Storybook
   * (short lists don't scroll); reorder still works without it (D6).
   */
  dragScrollController?: DragScrollController;

  // --- Copy (i18n-free per D5; English defaults; [Integrate] passes t()). ---
  headerLabel?: string;
  /**
   * Close (×) a11y label. The back arrow's label is header chrome, owned by the
   * shared ScreenSubHeader (common:screenHeader.a11y.goBack), not a wizard prop.
   */
  closeAccessibilityLabel?: string;
  nameEyebrow?: string;
  nameTitle?: string;
  goalTitlePlaceholder?: string;
  nameHint?: string;
  nextLabel?: string;
  // Step 2 · first step copy (English defaults; [Integrate] passes t()).
  stepGoalEyebrow?: string;
  stepHeadline?: string;
  firstStepPlaceholder?: string;
  evidenceEyebrow?: string;
  /** Visible "change" link text beside the planned-evidence chip. */
  changeEvidenceLabel?: string;
  /** a11y label for the whole chip press target — names the action + current type (D7). */
  changeEvidenceAccessibilityLabel?: (label: string) => string;
  /** Maps a planned evidence type to its display label. */
  plannedEvidenceLabel?: (type: EvidenceTypeValue) => string;
  /** Capture-sheet header copy — "Evidence type" during goal creation (D3). */
  evidenceSheetTitle?: string;
  /** Plain lead-in before the quick-add link ("or "). */
  quickAddPrefix?: string;
  quickAddLabel?: string;
  /** Combined a11y label for the whole quick-add fast path press target. */
  quickAddAccessibilityLabel?: string;
  // Step 3 · build list copy — wired straight through to EditGoalStepList (D4).
  // All optional; left undefined so EditGoalStepList's own English defaults
  // render, exactly as EditGoalView forwards them.
  /** Build-list header, fed to EditGoalStepList as stepsSectionLabel. Default: "Your steps". */
  yourStepsLabel?: string;
  addStepPlaceholder?: string;
  /** Header title of the build step's evidence sheet (wizard-owned since #494). Default: "Planned evidence". */
  evidencePickerTitle?: string;
  /** Label above the multi-select grid in the build step's evidence sheet. Default: "Evidence types". */
  evidenceTypesLabel?: string;
  /** Pluralized step-count label. Default: "N step" / "N steps". */
  stepCountLabel?: (count: number) => string;
  /** "add a sub-step" affordance under a step that already has some. */
  addSubStepLabel?: string;
  /** "break into sub-steps" prompt on a step with none. */
  breakIntoSubStepsLabel?: string;
  /** Default title for a freshly-added sub-step, renamed inline after. */
  newSubStepTitle?: string;
  /** a11y label for the "add step" + button. */
  addStepButtonLabel?: string;
  /** a11y label for the build evidence sheet's close affordances (backdrop + ✕). Default: "Close". */
  closeLabel?: string;
  /** a11y label for the "break into sub-steps" prompt on a step. */
  breakIntoSubStepsA11yLabel?: (stepTitle: string) => string;
  /** a11y label for the "add a sub-step" affordance under a step. */
  addSubStepA11yLabel?: (stepTitle: string) => string;
  /** Screen-reader announcement after a reorder (drag drop or ↑/↓). */
  announceReorder?: (stepTitle: string, position: number) => string;
  /** Confirm-modal title when deleting a step. */
  deleteStepConfirmTitle?: string;
  /** Confirm-modal message when deleting a step (receives the step title). */
  deleteStepConfirmMessage?: (title: string) => string;
  /** Confirm-modal title when deleting a sub-step. */
  deleteSubStepConfirmTitle?: string;
  /** Confirm-modal message when deleting a sub-step (receives the sub-step title). */
  deleteSubStepConfirmMessage?: (title: string) => string;
  // --- Nest-under / un-nest copy (#496, forwarded to EditGoalStepList) ---
  nestUnderTriggerA11yLabel?: string;
  nestUnderPickerTitle?: string;
  nestUnderRowLabel?: (targetTitle: string) => string;
  nestUnderRowA11yLabel?: (targetTitle: string) => string;
  nestUnderCancelLabel?: string;
  unNestA11yLabel?: string;
  announcePromote?: (stepTitle: string) => string;
  announceNestedUnder?: (stepTitle: string, parentTitle: string) => string;
  /** Footer CTA on the build step — distinct copy from nextLabel (D7). */
  buildReadyLabel?: string;
  readyHeadline?: string;
  /** Pluralized summary-card meta line. Default: "N steps · evidence on each". */
  stepCountSummary?: (count: number) => string;
  badgeNote?: string;
  startWorkingLabel?: string;
}

const defaultStepCountSummary = (count: number) => {
  const safeCount = Math.max(0, Math.floor(count));
  return `${safeCount} step${safeCount === 1 ? "" : "s"} · evidence on each`;
};

/**
 * Planned-evidence labels — a plain map mirroring common:evidenceTypes.*.label
 * verbatim (Photo/Video/Audio/Note/Link/File). Kept i18n-free here per D5; the
 * [Integrate] issue (#444) swaps in evidenceLabel(t, …) with no copy drift.
 */
const DEFAULT_PLANNED_EVIDENCE_LABEL: Record<EvidenceTypeValue, string> = {
  [EvidenceType.photo]: "Photo",
  [EvidenceType.video]: "Video",
  [EvidenceType.voice_memo]: "Audio",
  [EvidenceType.text]: "Note",
  [EvidenceType.link]: "Link",
  [EvidenceType.file]: "File",
};

const defaultPlannedEvidenceLabel = (type: EvidenceTypeValue) =>
  DEFAULT_PLANNED_EVIDENCE_LABEL[type];

/** Emoji glyph for an evidence type, sourced from the shared EVIDENCE_OPTIONS. */
const evidenceIcon = (type: EvidenceTypeValue) =>
  EVIDENCE_OPTIONS.find((opt) => opt.type === type)?.icon ?? "";

const defaultChangeEvidenceAccessibilityLabel = (label: string) =>
  `Change evidence type, currently ${label}`;

const noop = () => undefined;

export function NewGoalWizard({
  currentStep,
  goalTitle,
  onGoalTitleChange,
  stepCount,
  onBack,
  onClose,
  onNext,
  onQuickAdd,
  onStartWorking,
  firstStepTitle = "",
  onFirstStepTitleChange = noop,
  plannedEvidenceType = EvidenceType.text,
  onPlannedEvidenceTypeChange = noop,
  evidencePickerOpen = false,
  onOpenEvidencePicker = noop,
  onCloseEvidencePicker = noop,
  steps = [],
  onReorderSteps = noop,
  onReorderSubSteps = noop,
  onReparentStep,
  onAddStep = noop,
  onStepTitleChange = noop,
  onStepEvidenceChange = noop,
  onAddSubStep = noop,
  onSubStepTitleChange = noop,
  onSubStepEvidenceChange = noop,
  onDeleteSubStep = noop,
  onDeleteStep = noop,
  dragScrollController,
  headerLabel = "New goal",
  closeAccessibilityLabel = "Close",
  nameEyebrow = "Step 1 of 4",
  nameTitle = "What do you want to work toward?",
  goalTitlePlaceholder = "Name your goal",
  nameHint = "Something you'll show progress on.",
  nextLabel = "Next →",
  stepGoalEyebrow = "Goal",
  stepHeadline = "What's the first step?",
  firstStepPlaceholder = "One small thing to start",
  evidenceEyebrow = "Evidence",
  changeEvidenceLabel = "change",
  changeEvidenceAccessibilityLabel = defaultChangeEvidenceAccessibilityLabel,
  plannedEvidenceLabel = defaultPlannedEvidenceLabel,
  evidenceSheetTitle = "Evidence type",
  quickAddPrefix = "or ",
  quickAddLabel = "Quick add — skip to the list ›",
  quickAddAccessibilityLabel = "Quick add, skip to the list",
  // Build-list copy — mostly forwarded straight to EditGoalStepList, which owns
  // their English defaults (D4). yourStepsLabel carries a wizard-side default
  // (maps to stepsSectionLabel with "Your steps" vs the editor's "Steps"). The
  // evidence-sheet copy (evidencePickerTitle/evidenceTypesLabel/closeLabel) is
  // wizard-owned since #494 — the sheet moved out of the list — so those carry
  // wizard-side defaults mirroring EditGoalView.
  yourStepsLabel = "Your steps",
  addStepPlaceholder,
  evidencePickerTitle = "Planned evidence",
  evidenceTypesLabel = "Evidence types",
  stepCountLabel,
  addSubStepLabel,
  breakIntoSubStepsLabel,
  newSubStepTitle,
  addStepButtonLabel,
  closeLabel = "Close",
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
  buildReadyLabel = "I'm ready →",
  readyHeadline = "You're set.",
  stepCountSummary = defaultStepCountSummary,
  badgeNote = "You'll design your badge when you finish.",
  startWorkingLabel = "Start Working",
}: NewGoalWizardProps) {
  const { theme } = useUnistyles();
  const currentStepIndex = STEP_ORDER.indexOf(currentStep);
  const plannedIcon = evidenceIcon(plannedEvidenceType);
  const plannedLabel = plannedEvidenceLabel(plannedEvidenceType);

  // Step 2's planned-evidence chip is a direct sibling of the capture sheet, so
  // a plain local ref restores focus to it on close — no press-target trick
  // needed (unlike the build step's deeply-nested list rows below).
  const evidenceChipRef = useRef<View>(null);

  // Step 2's capture sheet: a single-select planned-evidence chip. Distinct from
  // the build step's multi-select sheet below.
  const handlePickerSelect = (type: EvidenceTypeValue) => {
    onPlannedEvidenceTypeChange(type);
    onCloseEvidencePicker();
  };

  // Build step's evidence-picker open state, lifted here from EditGoalStepList
  // (#493/#494/D8) so the shared AnimatedSheet renders as a root-level sibling
  // of the build ScrollView (anchored to the viewport, not the scroll content).
  // A chip tap in the list calls onEvidenceChipPress → setEditingEvidenceId; the
  // sheet gates on the derived editingEvidenceTypes below. Mirrors EditGoalView.
  const [editingEvidenceId, setEditingEvidenceId] = useState<string | null>(
    null,
  );

  // Native tag of the build-step evidence chip that opened the sheet, captured
  // from the list row's press event (#501) — threaded into AnimatedSheet's
  // restoreFocusRef so focus returns to that chip on any dismissal. Mirrors
  // EditGoalView; avoids threading a View ref through the list/row layers (D2).
  const buildRestoreFocusTagRef = useRef<number | null>(null);
  function handleBuildEvidenceChipPress(
    id: string,
    event: GestureResponderEvent,
  ) {
    // RN types nativeEvent.target as string, but it's the numeric react tag at
    // runtime — the exact input setAccessibilityFocus expects.
    buildRestoreFocusTagRef.current =
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

  // Keep the last non-undefined selection so the picker grid renders through the
  // sheet's slide-out. On close, editingEvidenceId → null flips both `visible`
  // and `editingEvidenceTypes` to undefined on the same render; the sheet keeps
  // its chrome mounted for the exit animation, so gating the grid directly on
  // editingEvidenceTypes would animate out an empty sheet (#493). Adjusting
  // state during render (React's sanctioned "store info from a previous render"
  // pattern) rather than a ref keeps the React Compiler happy.
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
  // invariant: the last remaining type can't be deselected (no-op), so a step or
  // sub-step never lands in a 0-selected state. Routes to the step or sub-step
  // callback depending on which id opened the picker.
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

  return (
    <View style={styles.container}>
      {/* Shared header chrome (D8). Back arrow is omitted on the first step —
          nowhere to go back to; ScreenSubHeader renders a leading spacer so the
          label stays centered. The × close lives in the right slot. */}
      <ScreenSubHeader
        label={headerLabel}
        onBack={currentStep !== "name" ? onBack : undefined}
        right={
          <IconButton
            icon={<X size={24} weight="bold" />}
            onPress={onClose}
            tone="chrome"
            accessibilityLabel={closeAccessibilityLabel}
            testID="new-goal-close-button"
          />
        }
      />

      <View
        style={styles.progressRow}
        accessible
        accessibilityRole="progressbar"
        accessibilityValue={{
          min: 1,
          max: STEP_ORDER.length,
          now: currentStepIndex + 1,
        }}
      >
        {STEP_ORDER.map((step, index) => (
          <View
            key={step}
            style={[
              styles.progressSegment,
              index <= currentStepIndex
                ? styles.progressSegmentFilled
                : styles.progressSegmentUnfilled,
            ]}
            testID={
              index <= currentStepIndex
                ? "new-goal-progress-filled"
                : "new-goal-progress-unfilled"
            }
          />
        ))}
      </View>

      {/* Step bodies: name + ready (#462), first step (#463), build (#464).
          The trailing `null` is unreachable — currentStep is one of the four
          STEP_ORDER values — and is kept so every step stays an explicit
          `currentStep === …` test rather than a catch-all `else`. */}
      {currentStep === "name" ? (
        <>
          <View style={styles.stepBody}>
            <RNText style={styles.eyebrow}>{nameEyebrow}</RNText>
            <RNText style={styles.nameHeadline} accessibilityRole="header">
              {nameTitle}
            </RNText>
            <TextInput
              style={styles.titleInput}
              value={goalTitle}
              onChangeText={onGoalTitleChange}
              placeholder={goalTitlePlaceholder}
              placeholderTextColor={theme.colors.textMuted}
              accessibilityLabel={goalTitlePlaceholder}
              testID="new-goal-title-input"
            />
            <RNText style={styles.hint}>{nameHint}</RNText>
          </View>
          <View style={styles.footer}>
            <Button
              label={nextLabel}
              onPress={onNext}
              disabled={!goalTitle.trim()}
              testID="new-goal-next-button"
            />
            <Pressable
              style={styles.quickAddPress}
              onPress={onQuickAdd}
              // `accessible` collapses the "or …" + link Text into one node so
              // screen readers announce the single quickAddAccessibilityLabel,
              // not each fragment separately (matches ProofSpine/FABMenu).
              accessible
              accessibilityRole="button"
              accessibilityLabel={quickAddAccessibilityLabel}
              hitSlop={6}
              testID="new-goal-quick-add"
            >
              <RNText style={styles.quickAddText}>
                {quickAddPrefix}
                <RNText style={styles.quickAddLink}>{quickAddLabel}</RNText>
              </RNText>
            </Pressable>
          </View>
        </>
      ) : currentStep === "step" ? (
        <>
          <View style={styles.stepBody}>
            {/* Goal recap: the title from step 1, echoed so the first-step
                input has context (prototype's "Goal" eyebrow + title line). */}
            <RNText style={styles.eyebrow}>{stepGoalEyebrow}</RNText>
            <RNText style={styles.stepGoalRecap}>{goalTitle}</RNText>
            <RNText style={styles.nameHeadline} accessibilityRole="header">
              {stepHeadline}
            </RNText>
            <TextInput
              style={styles.titleInput}
              value={firstStepTitle}
              onChangeText={onFirstStepTitleChange}
              placeholder={firstStepPlaceholder}
              placeholderTextColor={theme.colors.textMuted}
              accessibilityLabel={firstStepPlaceholder}
              testID="new-goal-first-step-input"
            />
            <View style={styles.evidenceRow}>
              <RNText style={styles.eyebrow}>{evidenceEyebrow}</RNText>
              {/* One collapsed a11y node (icon + label + "change"); the whole
                  press target opens the picker (D7). The purple chip carries
                  the icon+label; "change" sits outside it as a plain link, both
                  inside the single Pressable. */}
              <Pressable
                ref={evidenceChipRef}
                style={styles.evidencePress}
                onPress={onOpenEvidencePicker}
                accessible
                accessibilityRole="button"
                accessibilityLabel={changeEvidenceAccessibilityLabel(
                  plannedLabel,
                )}
                hitSlop={6}
                testID="new-goal-evidence-chip"
              >
                <View style={styles.evidenceChip}>
                  <RNText
                    style={styles.evidenceChipIcon}
                    importantForAccessibility="no"
                  >
                    {plannedIcon}
                  </RNText>
                  <RNText style={styles.evidenceChipLabel}>
                    {plannedLabel}
                  </RNText>
                </View>
                <RNText style={styles.evidenceChipChange}>
                  {changeEvidenceLabel}
                </RNText>
              </Pressable>
            </View>
          </View>
          <View style={styles.footer}>
            <Button
              label={nextLabel}
              onPress={onNext}
              disabled={!firstStepTitle.trim()}
              testID="new-goal-next-button"
            />
          </View>
        </>
      ) : currentStep === "build" ? (
        <>
          <View style={styles.buildBody}>
            <ScrollView
              contentContainerStyle={styles.buildScrollContent}
              showsVerticalScrollIndicator={false}
            >
              {/* The build step reuses EditGoalStepList (#489/#490) — same "Your
                  steps" header + count, drag-reorderable rows, evidence chips,
                  inline rename, confirmed delete, and one-level sub-steps as the
                  Edit Goal screen. The list reports evidence-chip taps outward
                  via onEvidenceChipPress; the picker sheet itself is owned by the
                  wizard (#493/#494/D8), rendered as a root-level sibling below.
                  Otherwise the wizard only forwards data + callbacks + copy
                  (D2/D3/D4). yourStepsLabel maps to the built-in header's
                  stepsSectionLabel (D1). */}
              <EditGoalStepList
                steps={steps}
                onReorderSteps={onReorderSteps}
                onReorderSubSteps={onReorderSubSteps}
                onReparentStep={onReparentStep}
                onAddStep={onAddStep}
                onStepTitleChange={onStepTitleChange}
                onEvidenceChipPress={handleBuildEvidenceChipPress}
                onAddSubStep={onAddSubStep}
                onSubStepTitleChange={onSubStepTitleChange}
                onDeleteSubStep={onDeleteSubStep}
                onDeleteStep={onDeleteStep}
                dragScrollController={dragScrollController}
                stepsSectionLabel={yourStepsLabel}
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
              />
            </ScrollView>
          </View>
          <View style={styles.footer}>
            {/* Same linear-advance onNext as name/step; only the label differs
                (D7). Unconditionally enabled — the prototype gates nothing on
                this screen. */}
            <Button
              label={buildReadyLabel}
              onPress={onNext}
              testID="new-goal-build-ready-button"
            />
          </View>
        </>
      ) : currentStep === "ready" ? (
        <>
          <View style={styles.stepBody}>
            <RNText style={styles.readyHeadline} accessibilityRole="header">
              {readyHeadline}
            </RNText>
            <View style={styles.summaryCard}>
              <RNText style={styles.summaryTitle}>{goalTitle}</RNText>
              <RNText style={styles.summaryMeta}>
                {stepCountSummary(stepCount)}
              </RNText>
            </View>
            <View style={styles.badgeNoteBanner}>
              <RNText
                style={styles.badgeNoteIcon}
                accessibilityElementsHidden
                importantForAccessibility="no"
              >
                🏆
              </RNText>
              <RNText style={styles.badgeNoteText}>{badgeNote}</RNText>
            </View>
          </View>
          <View style={styles.footer}>
            <Button
              label={startWorkingLabel}
              onPress={onStartWorking}
              testID="new-goal-start-working-button"
            />
          </View>
        </>
      ) : null}

      {/* Step 2 · planned-evidence picker — reuse #409's capture sheet whole
          (D2), no fork. Single-select, serves only step 2's planned-evidence
          chip. No activeStepTitle: there is no active step during goal creation
          (D3), so the "Saving to your active step" sub-line is omitted. It
          renders in-tree as an absolute overlay anchored to this wizard frame
          (scrim + sheet rising from the bottom) and gates on `visible`, so
          rendering it unconditionally is inert until the chip opens it.
          Selecting a type updates the chip and closes the sheet in one gesture. */}
      <EvidenceTypePicker
        mode="capture"
        visible={evidencePickerOpen}
        headerTitle={evidenceSheetTitle}
        selectedType={plannedEvidenceType}
        onSelectType={handlePickerSelect}
        onClose={onCloseEvidencePicker}
        restoreFocusRef={evidenceChipRef}
      />

      {/* Step 3 · build evidence picker (D8/D12): the reused multi-select
          authoring grid in the shared AnimatedSheet chrome (#493/#494), lifted
          out of EditGoalStepList so it renders as a root-level sibling here —
          same reanimated slide/scrim, Android-back dismiss and animation-pref
          timing as the step-2 capture sheet. Opened by a step OR a sub-step's
          chip via onEvidenceChipPress; toggling updates that row's pills via
          onStepEvidenceChange / onSubStepEvidenceChange; the last remaining type
          can't be deselected (handleToggleEvidence guard). Mirrors EditGoalView. */}
      <AnimatedSheet
        visible={editingEvidenceTypes !== undefined}
        onClose={() => setEditingEvidenceId(null)}
        title={evidencePickerTitle}
        closeLabel={closeLabel}
        closeTestID="new-goal-evidence-close"
        backdropTestID="new-goal-evidence-backdrop"
        restoreFocusRef={buildRestoreFocusTagRef}
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
