import React from "react";
import { View, Pressable, type GestureResponderEvent } from "react-native";
import { useTranslation } from "react-i18next";
import { Text } from "../Text";
import {
  stepStateColorMap,
  type StepStateMapKey,
} from "../TimelineNode/stepStateColorMap";
import { EVIDENCE_OPTIONS, validateEvidenceType } from "../../types/evidence";
import { evidenceShortLabel } from "../../i18n/labels";
import { TimingMarkIcon, type TimingMarkTone } from "../TimingMarkIcon";
import { styles } from "./FocusCurrentTaskCard.styles";

/**
 * A captured piece of evidence rendered as a rail chip (#360). The chip shows
 * {@link caption} when set, otherwise the type's short label, and opens the
 * evidence viewer on that row (#696).
 */
export interface FocusCapturedEvidenceItem {
  /** Evidence row id — the chip's key/testID and the viewer's start item. */
  id: string;
  type: string;
  /** User-entered caption. Null/blank → show the type label. */
  caption?: string | null;
}

/**
 * E (state) pill in the one #406 color language: bg = node bg, ink = node fg, so
 * the word reads as the same state color as its node in every theme. Sits above
 * the title, left-aligned, in mono uppercase (prototype fidelity, L4). Carries the
 * word in its `accessibilityLabel` too — color is never the sole signal.
 *
 * The completed state also gets a visible "✓" (prototype fidelity). The glyph
 * stays out of the `accessibilityLabel`: the state word alone is already the
 * full accessible name, so spelling the checkmark in would just be redundant.
 */
export function StateWordPill({ status }: { status: StepStateMapKey }) {
  const { t } = useTranslation(["common", "focusMode"]);
  const label = t(stepStateColorMap[status].badgeI18nKey);
  return (
    <View
      style={styles.stateWordPill(status)}
      accessible
      accessibilityRole="text"
      accessibilityLabel={label}
    >
      <Text variant="label" chrome style={styles.stateWordText(status)}>
        {status === "completed" ? `✓ ${label}` : label}
      </Text>
    </View>
  );
}

/** One C·B truth-line: a themed mark, plain text, and an optional mono meta suffix. */
interface MetaLine {
  key: TimingMarkTone;
  text: string;
  meta: string | null;
}

/**
 * Quiet C·B truth-lines (prototype `Focus Mode A`). Every present line renders
 * independently — a "waiting on…" external wait AND an internal "after…"
 * prerequisite can both show (never "blocked by"). Each line is mark + text +
 * an optional mono meta suffix; the "due …" date is plain text, with mono only
 * on the trailing meta — prototype fidelity (no ADR governs date typography).
 * Renders nothing when no C/B prop is set.
 *
 * Connective copy lives in `focusMode:currentTask.metadata.*`, mirroring
 * `timelineJourney:step.metadata.*`. One shape difference: waiting-on's date is
 * a *separate* key (`waitingOnExpectedMeta`), not a second full sentence,
 * because this band renders it as its own mono `Text` node — a typographic
 * split, not a grammatical one. The whole clause including its "·" separator
 * stays the translator's to rewrite, so it is not the fragment concatenation
 * docs/i18n.md forbids, though it does fix the date clause as trailing. Values
 * arrive final — titles are user content, dates caller-formatted. A passed
 * expected date swaps that clause for `wasExpectedMeta` (#571): only the date
 * reads as behind us, past tense and never overdue (ADR-0012).
 */
export function MetadataBand({
  afterStep,
  waitingOn,
  dueDate,
}: {
  afterStep?: string;
  waitingOn?: { who: string; expected?: string; isPast?: boolean };
  dueDate?: string;
}) {
  const { t } = useTranslation(["focusMode"]);

  const lines: MetaLine[] = [];
  if (waitingOn) {
    lines.push({
      key: "waiting",
      text: t("focusMode:currentTask.metadata.waitingOn", {
        who: waitingOn.who,
      }),
      meta: waitingOn.expected
        ? t(
            waitingOn.isPast
              ? "focusMode:currentTask.metadata.wasExpectedMeta"
              : "focusMode:currentTask.metadata.waitingOnExpectedMeta",
            { date: waitingOn.expected },
          )
        : null,
    });
  }
  if (afterStep) {
    lines.push({
      key: "after",
      text: t("focusMode:currentTask.metadata.after", { title: afterStep }),
      // No completion suffix: `afterStep` carries only the prerequisite's title,
      // not its done-state, so a hard-coded "✓ done" would assert a fact the
      // props can't back. Real dependency-completion data is still unsourced.
      meta: null,
    });
  }
  if (dueDate) {
    lines.push({
      key: "due",
      text: t("focusMode:currentTask.metadata.due", { date: dueDate }),
      meta: null,
    });
  }

  if (lines.length === 0) {
    return null;
  }

  return (
    <View style={styles.metadataBand}>
      {lines.map((line) => (
        <View key={line.key} style={styles.metadataLine}>
          <TimingMarkIcon
            tone={line.key}
            testID={`focus-current-task-metadata-mark-${line.key}`}
          />
          <Text variant="metadata" style={styles.metadataText}>
            {line.text}
          </Text>
          {line.meta ? (
            <Text variant="metadata" style={styles.metadataMeta}>
              {line.meta}
            </Text>
          ) : null}
        </View>
      ))}
    </View>
  );
}

/**
 * The planned-evidence box (in-progress only). Generalizes the old single-type
 * box to the N-type plan: one icon + short-label per planned type inside the one
 * bordered/shadowed box, with a trailing "change" affordance. The **whole box is
 * a single tap target** that opens the evidence-plan chooser (D4) — its purpose
 * (see / change the plan) stays structurally distinct from the footer's per-type
 * "Add {type}" invites (capture a still-needed piece).
 *
 * `accessible` collapses the box's children, so the a11y label names the action
 * and joins every planned-type short label so a screen-reader user hears the same
 * plan a sighted user reads. Labels are joined with a plain separator, not
 * `Intl.ListFormat` — that API throws on Hermes on-device (issue #66 probe;
 * `docs/research/hermes-intl-spike-66-findings.md`), so it can't be used in a
 * component #466 will mount in the real app.
 */
export function PlannedEvidenceBox({
  plannedTypes,
  onChangeEvidencePlan,
}: {
  plannedTypes: readonly string[];
  onChangeEvidencePlan: (event: GestureResponderEvent) => void;
}) {
  const { t } = useTranslation(["common", "focusMode"]);
  const entries = plannedTypes.map((raw, index) => {
    // Normalize for icon/label lookup so an unknown planned key can't leak a raw
    // string or a missing icon — falls back to `file` (matches the captured rail).
    const safeType = validateEvidenceType(raw);
    return {
      key: `${raw}-${index}`,
      label: evidenceShortLabel(t, safeType),
      icon: EVIDENCE_OPTIONS.find((o) => o.type === safeType)?.icon ?? null,
    };
  });
  const joinedLabels = entries.map((e) => e.label).join(", ");
  // An empty plan is an unexpected, invalid state ("every step needs evidence"),
  // but the control must still describe itself: joining zero labels yields "",
  // which would render "…currently " with a dangling blank for a screen reader.
  // Fall back to the action the box offers when nothing is planned yet.
  const accessibilityLabel =
    entries.length > 0
      ? t("focusMode:currentTask.inProgress.changeEvidencePlanA11y", {
          types: joinedLabels,
        })
      : t("focusMode:currentTask.inProgress.changeEvidencePlanEmptyA11y");
  return (
    <Pressable
      onPress={onChangeEvidencePlan}
      style={styles.plannedBox}
      accessible
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      testID="focus-current-task-change-plan"
    >
      <View style={styles.plannedTypeList}>
        {entries.map((entry) => (
          <View key={entry.key} style={styles.plannedType}>
            {entry.icon ? (
              <Text
                variant="title"
                style={styles.plannedIcon}
                importantForAccessibility="no"
              >
                {entry.icon}
              </Text>
            ) : null}
            <Text variant="label" style={styles.plannedLabel}>
              {entry.label}
            </Text>
          </View>
        ))}
      </View>
      <Text variant="label" style={styles.changeText}>
        {t("focusMode:currentTask.inProgress.changeEvidencePlan")}
      </Text>
    </Pressable>
  );
}

/**
 * Captured-evidence rail — one green chip per captured piece, labelled with its
 * caption when it has one (else the type short-label). Each chip is a button
 * that opens the shared evidence viewer on that piece, as Timeline evidence
 * cards and badge proof entries do (#696). The viewer is a pushed screen, so
 * back returns to this card on the same step. We never surface what is missing
 * — the rail simply shows what is present. Hidden when empty. The section
 * {@link label} varies by state ("Captured" in-progress, "Evidence" when
 * completed).
 */
export function CapturedEvidenceRail({
  items,
  label,
  onOpenEvidence,
}: {
  items: readonly FocusCapturedEvidenceItem[];
  label: string;
  /** Open the evidence viewer on this evidence row. */
  onOpenEvidence: (evidenceId: string) => void;
}) {
  const { t } = useTranslation(["common", "focusMode"]);
  if (items.length === 0) {
    return null;
  }
  return (
    <View style={styles.evidenceRail}>
      <Text
        variant="label"
        chrome
        style={styles.evidenceRailLabel}
        accessibilityRole="text"
      >
        {label}
      </Text>
      <View style={styles.evidenceRailRow}>
        {items.map((item) => {
          const caption = item.caption?.trim();
          const hasCaption = caption != null && caption.length > 0;
          // Normalize before label/icon lookup so an unknown type can't leak a
          // raw key or a missing icon — falls back to `file` (matches StepCard).
          const safeType = validateEvidenceType(item.type);
          const typeLabel = evidenceShortLabel(t, safeType);
          const icon = EVIDENCE_OPTIONS.find((o) => o.type === safeType)?.icon;
          const a11yLabel = hasCaption
            ? t("focusMode:evidenceRail.capturedChipNamed", {
                caption,
                type: typeLabel,
              })
            : t("focusMode:evidenceRail.capturedChip", { type: typeLabel });
          return (
            <Pressable
              key={item.id}
              onPress={() => onOpenEvidence(item.id)}
              style={({ pressed }) => [
                styles.evidenceChip,
                pressed && styles.evidenceChipPressed,
              ]}
              accessible
              accessibilityRole="button"
              accessibilityLabel={a11yLabel}
              accessibilityHint={t("focusMode:evidenceRail.openHint")}
              testID={`focus-current-task-evidence-chip-${item.id}`}
            >
              {icon ? (
                <Text
                  variant="label"
                  chrome
                  style={styles.evidenceChipIcon}
                  accessibilityElementsHidden
                >
                  {icon}
                </Text>
              ) : null}
              <Text
                variant="label"
                chrome
                style={styles.evidenceChipText}
                numberOfLines={2}
              >
                {hasCaption ? caption : typeLabel}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
