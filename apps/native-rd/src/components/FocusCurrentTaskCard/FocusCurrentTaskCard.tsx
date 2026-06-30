import React from "react";
import { View, Text, Pressable } from "react-native";
import { useTranslation } from "react-i18next";
import { styles } from "./FocusCurrentTaskCard.styles";
import {
  StateWordPill,
  MetadataBand,
  CapturedEvidenceRail,
  type FocusCapturedEvidenceItem,
} from "./FocusCurrentTaskCard.parts";

export type { FocusCapturedEvidenceItem };

/**
 * Card-level view state for Focus Mode's hero card. A superset of the per-step
 * DB status: `all-complete` is a goal-level state (every step done), so it lives
 * here rather than polluting `StepStatus` / `StepStateMapKey` (D2). The three
 * states that DO map to a step status (`paused`, `completed`, `in-progress`)
 * resolve their pill through `stepStateColorMap`, the one #406 color language.
 */
export type FocusCardStatus =
  | "in-progress"
  | "paused"
  | "completed"
  | "all-complete";

export interface FocusCurrentTaskCardProps {
  status: FocusCardStatus;
  title: string;
  /** Primary planned evidence type label (display-only, in-progress). */
  plannedEvidenceType?: string | null;
  capturedEvidence?: readonly FocusCapturedEvidenceItem[];
  /** Set this step aside (in-progress → paused). */
  onPause?: () => void;
  /** Resume a paused step (paused → in-progress). */
  onPickUp?: () => void;
  /** Mark complete — revealed only when evidence is captured. */
  onMarkComplete?: () => void;
  /** Reopen a completed step. */
  onReopen?: () => void;
  /** Design the badge from the all-steps-complete state. */
  onDesignBadge?: () => void;
  /** Open the evidence-type chooser (#409). */
  onChangeEvidenceType?: () => void;
  /** Capture a new piece of the planned evidence type. */
  onAddEvidence?: () => void;
  /** C (dependency), internal: this step comes "after [step]". Never "blocked by". */
  afterStep?: string;
  /** C (dependency), external wait: "waiting on [who] · expected [date]". */
  waitingOn?: { who: string; expected?: string };
  /** B (date): factual "due [date]" — no urgency / "overdue" framing. */
  dueDate?: string;
}

/**
 * Focus Mode hero card. Pure presentational, prop-driven; not wired to any
 * screen (that is #377). Four view states, each its own sub-view so the JSX for
 * one state never leaks conditional clutter into another.
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
    default:
      return <InProgressView {...props} />;
  }
}

/**
 * In-progress: no pill (position says it — the brief's "silent" state). Evidence
 * is always required; "✓ Mark complete" is *revealed* by captured evidence, never
 * shown disabled before it lands. Nothing frames evidence as missing/needed.
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
  const plannedLabel = plannedEvidenceType ?? t("focusMode:evidenceFallback");
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
      <Text style={styles.evidenceRequired}>
        {t("focusMode:currentTask.inProgress.evidenceRequired")}
      </Text>
      <View style={styles.plannedRow}>
        <Text style={styles.plannedType}>{plannedLabel}</Text>
        <Pressable
          onPress={onChangeEvidenceType}
          style={styles.changeAffordance}
          accessible
          accessibilityRole="button"
          accessibilityLabel={t(
            "focusMode:currentTask.inProgress.changeEvidenceType",
          )}
        >
          <Text style={styles.changeText}>
            {t("focusMode:currentTask.inProgress.changeEvidenceType")}
          </Text>
        </Pressable>
      </View>
      <CapturedEvidenceRail items={captured} />
      <Text style={styles.helperLine}>
        {t("focusMode:currentTask.inProgress.helperLine")}
      </Text>
      <View style={styles.footRow}>
        <Pressable
          onPress={onAddEvidence}
          style={styles.primaryCta}
          accessible
          accessibilityRole="button"
          accessibilityLabel={t("focusMode:currentTask.inProgress.addTypeCta", {
            type: plannedLabel,
          })}
        >
          <Text style={styles.primaryCtaText}>
            {t("focusMode:currentTask.inProgress.addTypeCta", {
              type: plannedLabel,
            })}
          </Text>
        </Pressable>
        <Pressable
          onPress={onPause}
          style={styles.secondaryCta}
          accessible
          accessibilityRole="button"
          accessibilityLabel={t("focusMode:currentTask.inProgress.pauseA11y")}
        >
          <Text style={styles.secondaryCtaText}>
            {t("focusMode:currentTask.inProgress.pauseCta")}
          </Text>
        </Pressable>
        {captured.length > 0 ? (
          <Pressable
            onPress={onMarkComplete}
            style={styles.completeCta}
            accessible
            accessibilityRole="button"
            accessibilityLabel={t(
              "focusMode:currentTask.inProgress.markCompleteA11y",
            )}
          >
            <Text style={styles.completeCtaText}>
              {t("focusMode:currentTask.inProgress.markCompleteCta")}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

/** Paused: pill beside the title, "set aside" body, single "pick back up" CTA. */
function PausedView({ title, onPickUp }: FocusCurrentTaskCardProps) {
  const { t } = useTranslation(["common", "focusMode"]);
  return (
    <View style={styles.card}>
      <View style={styles.titleRow}>
        <Text style={styles.title} accessible accessibilityRole="header">
          {title}
        </Text>
        <StateWordPill status="paused" />
      </View>
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

/** Completed: pill beside the title, the captured rail, single "reopen" CTA. */
function CompletedView({
  title,
  capturedEvidence,
  onReopen,
}: FocusCurrentTaskCardProps) {
  const { t } = useTranslation(["common", "focusMode"]);
  const captured = capturedEvidence ?? [];
  return (
    <View style={styles.card}>
      <View style={styles.titleRow}>
        <Text style={styles.title} accessible accessibilityRole="header">
          {title}
        </Text>
        <StateWordPill status="completed" />
      </View>
      <CapturedEvidenceRail items={captured} />
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

/** All steps done: no pill, trophy copy, single "design your badge" CTA. */
function AllCompleteView({ onDesignBadge }: FocusCurrentTaskCardProps) {
  const { t } = useTranslation(["common", "focusMode"]);
  return (
    <View style={styles.card}>
      <Text style={styles.heading} accessible accessibilityRole="header">
        {t("focusMode:currentTask.allComplete.heading")}
      </Text>
      <Text style={styles.bodyText}>
        {t("focusMode:currentTask.allComplete.body")}
      </Text>
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
