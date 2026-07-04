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
import { ArrowLeft, X } from "phosphor-react-native";
import { useUnistyles } from "react-native-unistyles";
import { Text } from "../Text";
import { IconButton } from "../IconButton";
import { Button } from "../Button";
import { HeaderBand } from "../ScreenHeader/HeaderBand";
import { styles } from "./NewGoalWizard.styles";

/**
 * Wizard position. The full 4-value union ships with the shell (D2) so the
 * frame already accepts every step it will ever render; the "step" and
 * "build" bodies arrive with #463/#464.
 */
export type NewGoalWizardStep = "name" | "step" | "build" | "ready";

/** Ordered steps — drives the progress bar's filled-segment count. */
const STEP_ORDER: readonly NewGoalWizardStep[] = [
  "name",
  "step",
  "build",
  "ready",
];

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
  backAccessibilityLabel?: string;
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
}

export function NewGoalWizard({
  currentStep,
  goalTitle,
  onGoalTitleChange,
  onBack,
  onClose,
  onNext,
  onQuickAdd,
  headerLabel = "New goal",
  backAccessibilityLabel = "Go back",
  closeAccessibilityLabel = "Close",
  nameEyebrow = "Step 1 of 4",
  nameTitle = "What do you want to work toward?",
  goalTitlePlaceholder = "Name your goal",
  nameHint = "Something you'll show progress on.",
  nextLabel = "Next →",
  quickAddPrefix = "or ",
  quickAddLabel = "Quick add — skip to the list ›",
  quickAddAccessibilityLabel = "Quick add, skip to the list",
}: NewGoalWizardProps) {
  const { theme } = useUnistyles();
  const currentStepIndex = STEP_ORDER.indexOf(currentStep);

  return (
    <View style={styles.container}>
      <HeaderBand>
        {currentStep !== "name" ? (
          <IconButton
            icon={<ArrowLeft size={24} weight="bold" />}
            onPress={onBack}
            tone="chrome"
            accessibilityLabel={backAccessibilityLabel}
            testID="new-goal-back-button"
          />
        ) : (
          // Same footprint as the IconButton so the centered label doesn't
          // jump between steps (mirrors ScreenSubHeader's trailing spacer).
          <View style={styles.headerSpacer} />
        )}
        <Text
          variant="title"
          style={styles.headerLabel}
          accessibilityRole="header"
        >
          {headerLabel}
        </Text>
        <IconButton
          icon={<X size={24} weight="bold" />}
          onPress={onClose}
          tone="chrome"
          accessibilityLabel={closeAccessibilityLabel}
          testID="new-goal-close-button"
        />
      </HeaderBand>

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
      ) : (
        <View style={styles.placeholderBody} />
      )}
    </View>
  );
}
