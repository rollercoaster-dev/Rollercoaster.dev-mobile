import React from "react";
import { View, Text, Pressable } from "react-native";
import { useTranslation } from "react-i18next";
import { evidenceShortLabel } from "../../i18n/labels";
import { getMissingQuickEvidenceOptions } from "../StepCard/StepCardEvidenceCapture";
import { styles } from "./FocusCurrentTaskCard.styles";
import {
  StateWordPill,
  MetadataBand,
  PlannedEvidenceBox,
  CapturedEvidenceRail,
  type FocusCapturedEvidenceItem,
} from "./FocusCurrentTaskCard.parts";
import type {
  FocusCardStatus,
  FocusCurrentTaskCardProps,
  FocusInProgressCardProps,
  FocusPausedCardProps,
  FocusCompletedCardProps,
  FocusAllCompleteCardProps,
} from "./FocusCurrentTaskCard.types";

export type {
  FocusCapturedEvidenceItem,
  FocusCardStatus,
  FocusCurrentTaskCardProps,
  FocusInProgressCardProps,
  FocusPausedCardProps,
  FocusCompletedCardProps,
  FocusAllCompleteCardProps,
};

/**
 * Focus Mode hero card. Pure presentational, prop-driven; not wired to any
 * screen (that is #377). Four view states, each its own sub-view so the JSX for
 * one state never leaks conditional clutter into another. Tuned to the
 * `Focus Mode A` prototype (Joe, 2026-06-30) — see the plan's "Prototype Fidelity
 * Corrections" section for the per-element decisions.
 */
export function FocusCurrentTaskCard(props: FocusCurrentTaskCardProps) {
  switch (props.status) {
    case "paused":
      return <PausedView {...props} />;
    case "completed":
      return <CompletedView {...props} />;
    case "all-complete":
      return <AllCompleteView {...props} />;
    case "in-progress":
      return <InProgressView {...props} />;
    default:
      // Exhaustiveness guard: once every FocusCardStatus has a case above,
      // `props` is `never` here, so adding a new status without its own case
      // fails to compile — it can never silently render the wrong UI.
      return exhaustiveFallback(props);
  }
}

/**
 * Compile-time exhaustiveness check for the status switch. Reached only with a
 * `props` whose `status` no `case` handled — which TypeScript types as `never`
 * once every `FocusCardStatus` is covered, so an unhandled status is a build
 * error rather than a silent mis-render. Should such a value slip through at
 * runtime (an untyped or malformed caller), we render nothing: casting it into
 * a real view would read fields the shape may not carry (e.g.
 * `plannedEvidenceTypes`) and crash the screen, so a blank card is the safe
 * degradation.
 */
function exhaustiveFallback(_props: never): React.ReactElement | null {
  return null;
}

/**
 * In-progress: no pill (position says it — the brief's "silent" state). The
 * planned-evidence box opens the plan chooser; evidence is always required. The
 * card plans N evidence types and "✓ Mark complete" is *revealed* only once
 * every planned type has a captured piece — the app-wide multi-evidence gate
 * (D1, `getMissingQuickEvidenceOptions`), never shown disabled. While the plan
 * is unsatisfied the footer offers one filled-blue "Add {type}" invite per
 * still-needed type (first primary, rest outline, so one primary leads); once
 * satisfied it becomes "✓ Mark complete" + a generic outline "Add more evidence"
 * so a further piece can still be captured. Nothing frames evidence as
 * missing/needed — the invites simply thin out and vanish as evidence lands.
 */
function InProgressView({
  title,
  plannedEvidenceTypes,
  capturedEvidence,
  onPause,
  onMarkComplete,
  onChangeEvidencePlan,
  onAddEvidence,
  afterStep,
  waitingOn,
  dueDate,
}: FocusInProgressCardProps) {
  const { t } = useTranslation(["common", "focusMode"]);
  const captured = capturedEvidence ?? [];
  // The exact app-wide predicate StepCard uses (D1): planned types with no
  // captured piece yet, in capture-button order. Completion unlocks when it's
  // empty — "every planned type captured," never "at least one."
  const capturedTypes = captured.map((item) => item.type);
  const unsatisfiedTypes = getMissingQuickEvidenceOptions(
    plannedEvidenceTypes,
    capturedTypes,
  );
  const completionReady = unsatisfiedTypes.length === 0;

  return (
    <View style={styles.card}>
      <Text style={styles.title} accessible accessibilityRole="header">
        {title}
      </Text>
      <MetadataBand
        afterStep={afterStep}
        waitingOn={waitingOn}
        dueDate={dueDate}
      />
      <View style={styles.plannedGroup}>
        <Text style={styles.evidenceRequired}>
          {t("focusMode:currentTask.inProgress.evidenceRequired")}
        </Text>
        <PlannedEvidenceBox
          plannedTypes={plannedEvidenceTypes}
          onChangeEvidencePlan={onChangeEvidencePlan}
        />
      </View>
      <CapturedEvidenceRail
        items={captured}
        label={t("focusMode:currentTask.inProgress.evidenceRailLabel")}
      />
      <Pressable
        onPress={onPause}
        style={styles.setAside}
        accessible
        accessibilityRole="button"
        accessibilityLabel={t("focusMode:currentTask.inProgress.pauseA11y")}
      >
        <Text style={styles.setAsideText}>
          {t("focusMode:currentTask.inProgress.pauseCta")}
        </Text>
      </Pressable>
      <View style={styles.footRow}>
        {completionReady ? (
          <>
            <Pressable
              onPress={onMarkComplete}
              style={styles.primaryCta}
              accessible
              accessibilityRole="button"
              accessibilityLabel={t(
                "focusMode:currentTask.inProgress.markCompleteA11y",
              )}
            >
              <Text style={styles.primaryCtaText}>
                {t("focusMode:currentTask.inProgress.markCompleteCta")}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => onAddEvidence()}
              style={styles.secondaryCta}
              accessible
              accessibilityRole="button"
              accessibilityLabel={t(
                "focusMode:currentTask.inProgress.addMoreEvidenceA11y",
              )}
              testID="focus-current-task-add-more"
            >
              <Text style={styles.secondaryCtaText}>
                {t("focusMode:currentTask.inProgress.addMoreEvidenceCta")}
              </Text>
            </Pressable>
          </>
        ) : (
          <>
            {unsatisfiedTypes.map((option, index) => {
              const primary = index === 0;
              const label = t("focusMode:currentTask.inProgress.addTypeCta", {
                type: evidenceShortLabel(t, option.type),
              });
              return (
                <Pressable
                  key={option.type}
                  onPress={() => onAddEvidence(option.type)}
                  style={primary ? styles.primaryCta : styles.secondaryCta}
                  accessible
                  accessibilityRole="button"
                  accessibilityLabel={label}
                  testID={`focus-current-task-add-${option.type}`}
                >
                  <Text
                    style={
                      primary ? styles.primaryCtaText : styles.secondaryCtaText
                    }
                    importantForAccessibility="no"
                  >
                    {option.icon}
                  </Text>
                  <Text
                    style={
                      primary ? styles.primaryCtaText : styles.secondaryCtaText
                    }
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
            <Text style={styles.helperLine}>
              {t("focusMode:currentTask.inProgress.helperLine")}
            </Text>
          </>
        )}
      </View>
    </View>
  );
}

/** Paused: pill above the title, "set aside" body, single "pick back up" CTA. */
function PausedView({ title, onPickUp }: FocusPausedCardProps) {
  const { t } = useTranslation(["common", "focusMode"]);
  return (
    <View style={styles.card}>
      <StateWordPill status="paused" />
      <Text style={styles.title} accessible accessibilityRole="header">
        {title}
      </Text>
      <Text style={styles.bodyText}>
        {t("focusMode:currentTask.paused.body")}
      </Text>
      <Pressable
        onPress={onPickUp}
        style={styles.primaryCta}
        accessible
        accessibilityRole="button"
        accessibilityLabel={t("focusMode:currentTask.paused.pickUpA11y")}
      >
        <Text style={styles.primaryCtaText}>
          {t("focusMode:currentTask.paused.pickUpCta")}
        </Text>
      </Pressable>
    </View>
  );
}

/** Completed: pill above the title, the captured rail, single "reopen" CTA. */
function CompletedView({
  title,
  capturedEvidence,
  onReopen,
}: FocusCompletedCardProps) {
  const { t } = useTranslation(["common", "focusMode"]);
  const captured = capturedEvidence ?? [];
  return (
    <View style={styles.card}>
      <StateWordPill status="completed" />
      <Text style={styles.title} accessible accessibilityRole="header">
        {title}
      </Text>
      <CapturedEvidenceRail
        items={captured}
        label={t("focusMode:evidenceRail.zoneLabel")}
      />
      <Pressable
        onPress={onReopen}
        style={styles.secondaryCta}
        accessible
        accessibilityRole="button"
        accessibilityLabel={t("focusMode:currentTask.completed.reopenA11y")}
      >
        <Text style={styles.secondaryCtaText}>
          {t("focusMode:currentTask.completed.reopenCta")}
        </Text>
      </Pressable>
    </View>
  );
}

/** All steps done: no pill, trophy callout box, single "design your badge" CTA. */
function AllCompleteView({ onDesignBadge }: FocusAllCompleteCardProps) {
  const { t } = useTranslation(["common", "focusMode"]);
  return (
    <View style={styles.card}>
      <Text style={styles.heading} accessible accessibilityRole="header">
        {t("focusMode:currentTask.allComplete.heading")}
      </Text>
      <View style={styles.calloutBox}>
        <Text style={styles.calloutIcon} importantForAccessibility="no">
          {"🏆"}
        </Text>
        <Text style={styles.calloutText}>
          {t("focusMode:currentTask.allComplete.body")}
        </Text>
      </View>
      <Pressable
        onPress={onDesignBadge}
        style={styles.primaryCta}
        accessible
        accessibilityRole="button"
        accessibilityLabel={t(
          "focusMode:currentTask.allComplete.designBadgeA11y",
        )}
      >
        <Text style={styles.primaryCtaText}>
          {t("focusMode:currentTask.allComplete.designBadgeCta")}
        </Text>
      </Pressable>
    </View>
  );
}
