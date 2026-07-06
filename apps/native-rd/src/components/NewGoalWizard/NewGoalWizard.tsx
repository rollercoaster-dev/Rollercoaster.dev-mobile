/**
 * NewGoalWizard — the New Goal modal wizard frame (issue #462, slice 1/3 of
 * umbrella #443, Epic #384). Implements the App Shell prototype's `newgoal`
 * route shell: a header band (conditional back · "New goal" · × close), a
 * 4-segment progress bar, and a body/footer switch over the wizard's four
 * steps. Slice 1/3 shipped the bookends — Step 1 · name and Step 4 · ready;
 * slice 2/3 (#463) fills Step 2 · first step (goal recap, first-step input, and
 * the planned-evidence chip that composes EvidenceTypePicker's capture sheet).
 * Step "build" stays an inert placeholder until slice 3/3 (#464).
 *
 * Pure, prop-driven, i18n-free (D5): all copy arrives as props with English
 * defaults; the future [Integrate] issue (#444) threads real t() output
 * through them and wires the callbacks to navigation + Evolu. Storybook-first,
 * so `grep -rn "NewGoalWizard" src/screens` stays empty until then.
 */
import React from "react";
import { View, Text as RNText, TextInput, Pressable } from "react-native";
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
 * `indexOf(currentStep)` can never return -1. The full 4-value set ships with
 * the shell (D2) so the frame already accepts every step it will ever render;
 * the "step" body arrives with #463 and "build" with #464.
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
  readyHeadline = "You're set.",
  stepCountSummary = defaultStepCountSummary,
  badgeNote = "You'll design your badge when you finish.",
  startWorkingLabel = "Start Working",
}: NewGoalWizardProps) {
  const { theme } = useUnistyles();
  const currentStepIndex = STEP_ORDER.indexOf(currentStep);
  const plannedIcon =
    EVIDENCE_OPTIONS.find((opt) => opt.type === plannedEvidenceType)?.icon ??
    "";
  const plannedLabel = plannedEvidenceLabel(plannedEvidenceType);

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

      {/* Step bodies land per slice: name + ready (#462), first step (#463);
          "build" stays an inert placeholder until #464 (D2). */}
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
      ) : (
        <View style={styles.placeholderBody} />
      )}

      {/* Planned-evidence picker — reuse #409's capture sheet whole (D2), no
          fork. No activeStepTitle: there is no active step during goal creation
          (D3), so the "Saving to your active step" sub-line is omitted. It
          renders in-tree as an absolute overlay anchored to this wizard frame
          (scrim + sheet rising from the bottom) and gates on `visible`, so
          rendering it unconditionally is inert until the chip opens it.
          Selecting a type updates the chip and closes the sheet in one
          gesture. */}
      <EvidenceTypePicker
        mode="capture"
        visible={evidencePickerOpen}
        headerTitle={evidenceSheetTitle}
        selectedType={plannedEvidenceType}
        onSelectType={(type) => {
          onPlannedEvidenceTypeChange(type);
          onCloseEvidencePicker();
        }}
        onClose={onCloseEvidencePicker}
      />
    </View>
  );
}
