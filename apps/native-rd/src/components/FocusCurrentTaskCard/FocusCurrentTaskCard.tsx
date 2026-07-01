import React from "react";
import { View, Text, Pressable } from "react-native";
import { useTranslation } from "react-i18next";
import { EVIDENCE_OPTIONS, validateEvidenceType } from "../../types/evidence";
import { evidenceShortLabel } from "../../i18n/labels";
import { styles } from "./FocusCurrentTaskCard.styles";
import {
  StateWordPill,
  MetadataBand,
  CapturedEvidenceRail,
  type FocusCapturedEvidenceItem,
} from "./FocusCurrentTaskCard.parts";
import type {
  FocusCardStatus,
  FocusCurrentTaskCardProps,
} from "./FocusCurrentTaskCard.types";

export type {
  FocusCapturedEvidenceItem,
  FocusCardStatus,
  FocusCurrentTaskCardProps,
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
      // `props.status` is `never` here, so adding a new status without its own
      // case fails to compile — it can never silently render the wrong UI. An
      // out-of-union runtime value still degrades to the silent in-progress view.
      return exhaustiveFallback(props.status, <InProgressView {...props} />);
  }
}

/**
 * Compile-time exhaustiveness check for the status switch. Reached only with a
 * `status` that no `case` handled — which TypeScript types as `never` once every
 * `FocusCardStatus` is covered, so an unhandled status is a build error rather
 * than a silent mis-render. `fallback` keeps the runtime graceful.
 */
function exhaustiveFallback(_status: never, fallback: React.ReactElement) {
  return fallback;
}

/**
 * In-progress: no pill (position says it — the brief's "silent" state). The
 * planned-evidence box opens the type picker; evidence is always required. The
 * bottom action keeps one filled-blue primary at a time — Add (no evidence) or
 * Mark complete (evidence present), with Add demoted to an outline so a second
 * piece can still be captured. "✓ Mark complete" is *revealed* by captured
 * evidence, never shown disabled. Nothing frames evidence as missing/needed.
 */
function InProgressView({
  title,
  plannedEvidenceType,
  capturedEvidence,
  onPause,
  onMarkComplete,
  onChangeEvidenceType,
  onAddEvidence,
  afterStep,
  waitingOn,
  dueDate,
}: FocusCurrentTaskCardProps) {
  const { t } = useTranslation(["common", "focusMode"]);
  const captured = capturedEvidence ?? [];
  const hasEvidence = captured.length > 0;
  // Prop carries a type key; derive icon + label the same way the rail does.
  const plannedType = plannedEvidenceType
    ? validateEvidenceType(plannedEvidenceType)
    : null;
  const plannedLabel = plannedType
    ? evidenceShortLabel(t, plannedType)
    : t("focusMode:evidenceFallback");
  const plannedIcon = plannedType
    ? (EVIDENCE_OPTIONS.find((o) => o.type === plannedType)?.icon ?? null)
    : null;
  const addLabel = t("focusMode:currentTask.inProgress.addTypeCta", {
    type: plannedLabel,
  });

  const addButton = (primary: boolean) => (
    <Pressable
      onPress={onAddEvidence}
      style={primary ? styles.primaryCta : styles.secondaryCta}
      accessible
      accessibilityRole="button"
      accessibilityLabel={addLabel}
    >
      {plannedIcon ? (
        <Text
          style={primary ? styles.primaryCtaText : styles.secondaryCtaText}
          importantForAccessibility="no"
        >
          {plannedIcon}
        </Text>
      ) : null}
      <Text style={primary ? styles.primaryCtaText : styles.secondaryCtaText}>
        {addLabel}
      </Text>
    </Pressable>
  );

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
        <Pressable
          onPress={onChangeEvidenceType}
          style={styles.plannedBox}
          accessible
          accessibilityRole="button"
          // `accessible` collapses the box's children, so the visible "change"
          // text alone would announce as just "change" — ambiguous out of
          // context. The a11y label names the action and the current planned
          // type (which sighted users read from the box) so the control is
          // self-describing.
          accessibilityLabel={t(
            "focusMode:currentTask.inProgress.changeEvidenceTypeA11y",
            { type: plannedLabel },
          )}
        >
          {plannedIcon ? (
            <Text style={styles.plannedIcon} importantForAccessibility="no">
              {plannedIcon}
            </Text>
          ) : null}
          <Text style={styles.plannedLabel}>{plannedLabel}</Text>
          <Text style={styles.changeText}>
            {t("focusMode:currentTask.inProgress.changeEvidenceType")}
          </Text>
        </Pressable>
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
        {hasEvidence ? (
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
            {addButton(false)}
          </>
        ) : (
          <>
            {addButton(true)}
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
function PausedView({ title, onPickUp }: FocusCurrentTaskCardProps) {
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
}: FocusCurrentTaskCardProps) {
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
function AllCompleteView({ onDesignBadge }: FocusCurrentTaskCardProps) {
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
