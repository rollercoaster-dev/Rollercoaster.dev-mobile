import React from "react";
import { View, Text } from "react-native";
import { useTranslation } from "react-i18next";
import {
  stepStateColorMap,
  type StepStateMapKey,
} from "../TimelineNode/stepStateColorMap";
import { EVIDENCE_OPTIONS, validateEvidenceType } from "../../types/evidence";
import { evidenceShortLabel } from "../../i18n/labels";
import { styles } from "./FocusCurrentTaskCard.styles";

/**
 * A captured piece of evidence rendered as a read-only rail chip (#360). Mirrors
 * `CapturedEvidenceItem` from StepCard: the chip shows {@link caption} when set,
 * otherwise the type's short label.
 */
export interface FocusCapturedEvidenceItem {
  /** Evidence row id — chip key/testID; falls back to type+index. */
  id?: string;
  type: string;
  /** User-entered caption. Null/blank → show the type label. */
  caption?: string | null;
}

/**
 * E (state) pill in the one #406 color language: bg = node bg, ink = node fg, so
 * the word reads as the same state color as its node in every theme. Carries the
 * word in its `accessibilityLabel` too — color is never the sole signal.
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
      <Text style={styles.stateWordText(status)}>{label}</Text>
    </View>
  );
}

/**
 * Quiet C·B truth-lines. C = a dependency stated as "after [step]" (internal) or
 * "waiting on [who] · expected [date]" (external wait) — never "blocked by". B =
 * a factual "due [date]", mono, with no urgency / "overdue" framing (ADR-0010/
 * 0012). Copy is literal pending #378 (which owns real data + i18n), matching the
 * TimelineStep band. Renders nothing when no C/B prop is set.
 */
export function MetadataBand({
  afterStep,
  waitingOn,
  dueDate,
}: {
  afterStep?: string;
  waitingOn?: { who: string; expected?: string };
  dueDate?: string;
}) {
  const cLine = waitingOn
    ? `waiting on ${waitingOn.who}${
        waitingOn.expected ? ` · expected ${waitingOn.expected}` : ""
      }`
    : afterStep
      ? `after ${afterStep}`
      : null;
  const bLine = dueDate ? `due ${dueDate}` : null;

  if (!cLine && !bLine) {
    return null;
  }

  return (
    <View style={styles.metadataBand}>
      {cLine ? <Text style={styles.metadataText}>{cLine}</Text> : null}
      {bLine ? <Text style={styles.metadataDate}>{bLine}</Text> : null}
    </View>
  );
}

/**
 * Read-only "Captured" rail — one status chip per captured piece, labelled with
 * its caption when it has one (else the type short-label). Mirrors the StepCard
 * rail: chips are `accessibilityRole="text"`, never buttons. We never surface
 * what is missing — the rail simply shows what is present. Hidden when empty.
 */
export function CapturedEvidenceRail({
  items,
}: {
  items: readonly FocusCapturedEvidenceItem[];
}) {
  const { t } = useTranslation(["common", "focusMode"]);
  if (items.length === 0) {
    return null;
  }
  return (
    <View style={styles.evidenceRail}>
      <Text style={styles.evidenceRailLabel} accessibilityRole="text">
        {t("focusMode:currentTask.inProgress.evidenceRailLabel")}
      </Text>
      <View style={styles.evidenceRailRow}>
        {items.map((item, index) => {
          const caption = item.caption?.trim();
          const hasCaption = caption != null && caption.length > 0;
          // Normalize before label/icon lookup so an unknown type can't leak a
          // raw key or a missing icon — falls back to `file` (matches StepCard).
          const safeType = validateEvidenceType(item.type);
          const typeLabel = evidenceShortLabel(t, safeType);
          // `id ?? type` collides when two captionless, id-less items share a
          // type; `id ?? type-index` stays unique per chip.
          const token = item.id ?? `${item.type}-${index}`;
          const icon = EVIDENCE_OPTIONS.find((o) => o.type === safeType)?.icon;
          const a11yLabel = hasCaption
            ? t("focusMode:evidenceRail.capturedChipNamed", {
                caption,
                type: typeLabel,
              })
            : t("focusMode:evidenceRail.capturedChip", { type: typeLabel });
          return (
            <View
              key={token}
              style={styles.evidenceChip}
              accessible
              accessibilityRole="text"
              accessibilityLabel={a11yLabel}
              testID={`focus-current-task-evidence-chip-${token}`}
            >
              {icon ? (
                <Text
                  style={styles.evidenceChipIcon}
                  accessibilityElementsHidden
                >
                  {icon}
                </Text>
              ) : null}
              <Text style={styles.evidenceChipText} numberOfLines={1}>
                {hasCaption ? caption : typeLabel}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
