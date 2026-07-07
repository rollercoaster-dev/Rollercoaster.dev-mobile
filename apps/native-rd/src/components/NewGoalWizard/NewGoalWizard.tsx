/**
 * NewGoalWizard — the New Goal modal wizard frame (umbrella #443, Epic #384).
 * Implements the App Shell prototype's `newgoal` route: a header band
 * (conditional back · "New goal" · × close), a 4-segment progress bar, and a
 * body/footer switch over the wizard's four steps, all shipped across three
 * slices:
 *   - Step 1 · name and Step 4 · ready — slice 1/3 (#462)
 *   - Step 2 · first step (goal recap, first-step input, planned-evidence chip
 *     composing EvidenceTypePicker's capture sheet) — slice 2/3 (#463)
 *   - Step 3 · build (flat "Your steps" list, per-row evidence chip reusing the
 *     same picker, add-step affordance, "I'm ready →" CTA) — slice 3/3 (#464)
 *   - Step 3 · build-row inline rename + confirmed delete (tap-to-edit title,
 *     × routing through the shared ConfirmDeleteModal) — follow-up (#482)
 *
 * Pure, prop-driven, i18n-free (D5): all copy arrives as props with English
 * defaults; the future [Integrate] issue (#444) threads real t() output
 * through them and wires the callbacks to navigation + Evolu. Storybook-first,
 * so `grep -rn "NewGoalWizard" src/screens` stays empty until then.
 */
import React from "react";
import {
  View,
  Text as RNText,
  TextInput,
  Pressable,
  ScrollView,
} from "react-native";
import { X } from "phosphor-react-native";
import { useUnistyles } from "react-native-unistyles";
import { IconButton } from "../IconButton";
import { Button } from "../Button";
import { ScreenSubHeader } from "../ScreenHeader/ScreenSubHeader";
import { EvidenceTypePicker } from "../EvidenceTypePicker";
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

/**
 * A row on the build list (Step 3). `id` is a stable per-row key the caller
 * owns — it must be unique within `buildSteps`, since it's both the React `key`
 * and the handle `openBuildStepEvidenceId` targets the shared picker at (a
 * duplicate would collide the key and make `find` match the wrong row).
 * `evidenceType` is never unset — every step is born with a planned evidence
 * type (D3), so the chip always renders a real type, never a missing/empty
 * state. Fields are `readonly`: the component only ever reads a row (maps over
 * it, never mutates), and the caller owns the state.
 */
export interface BuildStep {
  readonly id: string;
  readonly title: string;
  readonly evidenceType: EvidenceTypeValue;
}

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

  // --- Step 3 · build list (#464) ---
  /**
   * The full step list rendered on the build screen. Optional with an empty
   * default (like step 2's props), so a caller can mount "build" before seeding
   * rows; an empty list renders a count of 0 and no rows. Independent of
   * firstStepTitle/plannedEvidenceType this slice (D2); [Integrate] (#444)
   * unifies them.
   */
  buildSteps?: readonly BuildStep[];
  /** Appends a new row. No args (D3) — the caller owns the new row's defaults. */
  onAddStep?: () => void;
  /**
   * Which build row's evidence picker is open (D1). null/undefined = closed.
   * The single EvidenceTypePicker instance is reused for both step 2's chip and
   * step 3's rows, keyed here by row id when on the build step.
   */
  openBuildStepEvidenceId?: string | null;
  onOpenBuildStepEvidence?: (id: string) => void;
  onCloseBuildStepEvidence?: () => void;
  /** Updates one build row's planned evidence type (from the shared picker). */
  onBuildStepEvidenceTypeChange?: (id: string, type: EvidenceTypeValue) => void;

  // --- Step 3 · build-row inline rename (#482) ---
  /**
   * Which build row is mid-rename (D3). null/undefined = none editing. The row
   * whose id matches renders a focused TextInput seeded with buildStepEditText
   * in place of its tap-to-edit title; its evidence chip and × are suppressed
   * while editing (D4), mirroring EditGoalStepRow's isEditing branch.
   */
  editingBuildStepId?: string | null;
  /** In-flight edit text for the row named by editingBuildStepId. */
  buildStepEditText?: string;
  /** Enter edit mode for a row — caller seeds buildStepEditText with the title. */
  onStartEditingBuildStep?: (id: string, currentTitle: string) => void;
  onBuildStepEditTextChange?: (text: string) => void;
  /** Commit the in-flight edit (return key / blur); caller applies + clears. */
  onCommitBuildStepEditing?: () => void;

  // --- Step 3 · build-row delete (#482) ---
  /**
   * Which build row has a pending delete confirmation (D1/D3). null/undefined =
   * none pending. When set, the shared ConfirmDeleteModal is visible; the row is
   * removed only on Confirm, never on the raw × press.
   */
  pendingDeleteBuildStepId?: string | null;
  /** × pressed on a row — opens the confirm modal (does not remove the row). */
  onRequestDeleteBuildStep?: (id: string) => void;
  onCancelDeleteBuildStep?: () => void;
  onConfirmDeleteBuildStep?: () => void;

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
  // Step 3 · build list copy (English defaults; [Integrate] passes t()).
  /** Build-list header. Default: "Your steps". */
  yourStepsLabel?: string;
  /** Visible add-step link text. Default: "add another step". */
  addStepLabel?: string;
  /** a11y label for the add-step press target. Default: "Add another step". */
  addStepAccessibilityLabel?: string;
  /**
   * a11y label for a build row's evidence chip — names the action + which row +
   * its current type (parallels changeEvidenceAccessibilityLabel's shape).
   */
  buildStepEvidenceAccessibilityLabel?: (
    title: string,
    label: string,
  ) => string;
  /** a11y label for a build row's inline title-edit field (#482). */
  buildStepEditA11yLabel?: (stepTitle: string) => string;
  /** a11y hint on a build row's tap-to-edit title (#482). */
  tapToEditBuildStepHint?: string;
  /** a11y label for a build row's × delete affordance (#482). */
  deleteBuildStepLabel?: (stepTitle: string) => string;
  /** Confirm-modal title for a build-row delete (#482). */
  deleteBuildStepConfirmTitle?: string;
  /**
   * Confirm-modal message for a build-row delete (#482). No evidence/sub-step
   * clause — a wizard-stage build row has neither yet (D8), unlike EditGoalView.
   */
  deleteBuildStepConfirmMessage?: (stepTitle: string) => string;
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

const defaultBuildStepEvidenceAccessibilityLabel = (
  title: string,
  label: string,
) => `Change evidence type for ${title}, currently ${label}`;

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
  buildSteps = [],
  onAddStep = noop,
  openBuildStepEvidenceId = null,
  onOpenBuildStepEvidence = noop,
  onCloseBuildStepEvidence = noop,
  onBuildStepEvidenceTypeChange = noop,
  editingBuildStepId = null,
  buildStepEditText = "",
  onStartEditingBuildStep = noop,
  onBuildStepEditTextChange = noop,
  onCommitBuildStepEditing = noop,
  pendingDeleteBuildStepId = null,
  onRequestDeleteBuildStep = noop,
  onCancelDeleteBuildStep = noop,
  onConfirmDeleteBuildStep = noop,
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
  yourStepsLabel = "Your steps",
  addStepLabel = "add another step",
  addStepAccessibilityLabel = "Add another step",
  buildStepEvidenceAccessibilityLabel = defaultBuildStepEvidenceAccessibilityLabel,
  buildStepEditA11yLabel = (stepTitle) => `Edit step: ${stepTitle}`,
  tapToEditBuildStepHint = "Tap to edit step title",
  deleteBuildStepLabel = (stepTitle) => `Delete step: ${stepTitle}`,
  deleteBuildStepConfirmTitle = "Delete step?",
  deleteBuildStepConfirmMessage = (stepTitle) =>
    `Remove "${stepTitle}" from your step list?`,
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

  // The single EvidenceTypePicker instance is shared across steps 2 and 3 (D1):
  // its visible/selectedType/onSelect/onClose are derived from currentStep.
  // On "build", it targets the row named by openBuildStepEvidenceId.
  const isBuild = currentStep === "build";
  const openBuildStep =
    openBuildStepEvidenceId != null
      ? buildSteps.find((step) => step.id === openBuildStepEvidenceId)
      : undefined;
  const pickerVisible = isBuild ? openBuildStep != null : evidencePickerOpen;
  const pickerSelectedType =
    isBuild && openBuildStep ? openBuildStep.evidenceType : plannedEvidenceType;
  const handlePickerSelect = (type: EvidenceTypeValue) => {
    if (isBuild) {
      if (openBuildStep) onBuildStepEvidenceTypeChange(openBuildStep.id, type);
      onCloseBuildStepEvidence();
    } else {
      onPlannedEvidenceTypeChange(type);
      onCloseEvidencePicker();
    }
  };
  const handlePickerClose = isBuild
    ? onCloseBuildStepEvidence
    : onCloseEvidencePicker;

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
              <View style={styles.buildHeaderRow}>
                <RNText
                  style={styles.buildHeaderTitle}
                  accessibilityRole="header"
                >
                  {yourStepsLabel}
                </RNText>
                {/* Count derived internally as buildSteps.length (D8). */}
                <RNText
                  style={styles.buildHeaderCount}
                  testID="new-goal-build-count"
                >
                  {buildSteps.length}
                </RNText>
              </View>
              {buildSteps.map((step, index) => {
                const label = plannedEvidenceLabel(step.evidenceType);
                // Mid-rename rows render only [number][TextInput] — chip and ×
                // are suppressed while the field owns focus (D4), mirroring
                // EditGoalStepRow's isEditing branch.
                const isEditing = editingBuildStepId === step.id;
                return (
                  <View
                    key={step.id}
                    style={styles.buildRowCard}
                    testID={`new-goal-build-row-${step.id}`}
                  >
                    {/* Wrap layout (D7): buildRowLead grows to fill the line and
                        holds [number][title/input]; buildRowControls (chip + ×)
                        wraps to its own right-aligned line on narrow/largeText
                        renders instead of crushing the title. */}
                    <View style={styles.buildRowInner}>
                      <View style={styles.buildRowLead}>
                        <RNText
                          style={styles.buildRowNumber}
                          importantForAccessibility="no"
                        >
                          {index + 1}
                        </RNText>
                        {isEditing ? (
                          <TextInput
                            style={styles.buildRowEditInput}
                            value={buildStepEditText}
                            onChangeText={onBuildStepEditTextChange}
                            onSubmitEditing={onCommitBuildStepEditing}
                            onBlur={onCommitBuildStepEditing}
                            autoFocus
                            selectTextOnFocus
                            returnKeyType="done"
                            placeholderTextColor={theme.colors.textMuted}
                            testID={`new-goal-build-step-edit-${step.id}`}
                            accessibilityLabel={buildStepEditA11yLabel(
                              step.title,
                            )}
                          />
                        ) : (
                          <Pressable
                            style={styles.buildRowTitlePress}
                            onPress={() =>
                              onStartEditingBuildStep(step.id, step.title)
                            }
                            accessibilityRole="button"
                            accessibilityLabel={step.title}
                            accessibilityHint={tapToEditBuildStepHint}
                            testID={`new-goal-build-step-title-${step.id}`}
                          >
                            <RNText style={styles.buildRowTitle}>
                              {step.title}
                            </RNText>
                          </Pressable>
                        )}
                      </View>
                      {!isEditing && (
                        <View style={styles.buildRowControls}>
                          {/* Whole chip opens the shared picker targeted at this
                              row (D1); one collapsed a11y node names row + type
                              (D7). */}
                          <Pressable
                            style={styles.buildRowEvidencePress}
                            onPress={() => onOpenBuildStepEvidence(step.id)}
                            accessible
                            accessibilityRole="button"
                            accessibilityLabel={buildStepEvidenceAccessibilityLabel(
                              step.title,
                              label,
                            )}
                            hitSlop={6}
                            testID={`new-goal-build-evidence-chip-${step.id}`}
                          >
                            <View style={styles.evidenceChip}>
                              <RNText
                                style={styles.evidenceChipIcon}
                                importantForAccessibility="no"
                              >
                                {evidenceIcon(step.evidenceType)}
                              </RNText>
                              <RNText style={styles.evidenceChipLabel}>
                                {label}
                              </RNText>
                            </View>
                          </Pressable>
                        </View>
                      )}
                    </View>
                  </View>
                );
              })}
              <Pressable
                style={styles.addStepPress}
                onPress={onAddStep}
                accessible
                accessibilityRole="button"
                accessibilityLabel={addStepAccessibilityLabel}
                hitSlop={6}
                testID="new-goal-add-step-button"
              >
                <RNText
                  style={styles.addStepPlus}
                  importantForAccessibility="no"
                >
                  +
                </RNText>
                <RNText style={styles.addStepLabel}>{addStepLabel}</RNText>
              </Pressable>
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

      {/* Planned-evidence picker — reuse #409's capture sheet whole (D2), no
          fork. Shared across step 2 (the planned-evidence chip) and step 3
          (each build row); visible/selectedType/onSelect/onClose are derived
          from currentStep above (D1). No activeStepTitle: there is no active
          step during goal creation (D3), so the "Saving to your active step"
          sub-line is omitted. It renders in-tree as an absolute overlay
          anchored to this wizard frame (scrim + sheet rising from the bottom)
          and gates on `visible`, so rendering it unconditionally is inert until
          a chip opens it. Selecting a type updates the chip and closes the
          sheet in one gesture. */}
      <EvidenceTypePicker
        mode="capture"
        visible={pickerVisible}
        headerTitle={evidenceSheetTitle}
        selectedType={pickerSelectedType}
        onSelectType={handlePickerSelect}
        onClose={handlePickerClose}
      />
    </View>
  );
}
