/**
 * NewGoalWizard — the New Goal modal wizard frame (issue #462, slice 1/3 of
 * umbrella #443, Epic #384). Implements the App Shell prototype's `newgoal`
 * route shell: a header band (conditional back · "New goal" · × close), a
 * 4-segment progress bar, and a body/footer switch over the wizard's four
 * steps. This slice ships the two bookend steps — Step 1 · name and Step 4 ·
 * ready; steps "step" and "build" render an inert placeholder body until
 * slices 2/3 (#463) and 3/3 (#464) fill them in.
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
import { styles } from "./NewGoalWizard.styles";

/**
 * Ordered wizard positions — the single source of truth. Drives the progress
 * bar's filled-segment count, and NewGoalWizardStep is derived from it so the
 * two can't drift: a step added here can't be missed by the type, and
 * `indexOf(currentStep)` can never return -1. The full 4-value set ships with
 * the shell (D2) so the frame already accepts every step it will ever render;
 * the "step" and "build" bodies arrive with #463/#464.
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
  /** Primary advance from the name step. */
  onNext: () => void;
  /** Quiet fast path on the name step — distinct from onNext, never conflated. */
  onQuickAdd: () => void;
  /** Primary CTA on the ready step. */
  onStartWorking: () => void;

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

const defaultStepCountSummary = (count: number) =>
  `${count} step${count === 1 ? "" : "s"} · evidence on each`;

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
  headerLabel = "New goal",
  closeAccessibilityLabel = "Close",
  nameEyebrow = "Step 1 of 4",
  nameTitle = "What do you want to work toward?",
  goalTitlePlaceholder = "Name your goal",
  nameHint = "Something you'll show progress on.",
  nextLabel = "Next →",
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

      <View style={styles.progressRow}>
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

      {/* Step bodies land per slice: name + ready in this one (#462); "step"
          and "build" stay an inert placeholder until #463/#464 (D2). */}
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
    </View>
  );
}
