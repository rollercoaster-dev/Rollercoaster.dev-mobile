import React from "react";
import { View, Text, Pressable } from "react-native";
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
 * the word reads as the same state color as its node in every theme. Sits above
 * the title, left-aligned, in mono uppercase (prototype fidelity, L4). Carries the
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

/** One C·B truth-line: a colored glyph, plain text, and an optional mono meta suffix. */
// The three glyph styles share one shape ({ fontSize, color }), so the waiting
// style's type stands in for all of them.
type GlyphStyle = typeof styles.metadataGlyphWaiting;
interface MetaLine {
  key: string;
  glyph: string;
  glyphStyle: GlyphStyle;
  text: string;
  meta: string | null;
}

/**
 * Quiet C·B truth-lines (prototype `Focus Mode A`). Every present line renders
 * independently — a "waiting on…" external wait AND an internal "after…"
 * prerequisite can both show (never "blocked by"). Each line is glyph + text +
 * an optional mono meta suffix; the "due …" date is plain text, with mono only
 * on the trailing meta — pure prototype fidelity (no ADR governs date
 * typography). Copy is literal pending #378 (which owns the real C·B data +
 * i18n). Renders nothing when no C/B prop is set.
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
  // TODO(#378): literal English; #378 owns the real C·B data + i18n for these
  // lines. Remove this note and the inline strings when #378 wires them up.
  const lines: MetaLine[] = [];
  if (waitingOn) {
    lines.push({
      key: "waiting",
      glyph: "⏳",
      glyphStyle: styles.metadataGlyphWaiting,
      text: `waiting on ${waitingOn.who}`,
      meta: waitingOn.expected ? `· expected ${waitingOn.expected}` : null,
    });
  }
  if (afterStep) {
    lines.push({
      key: "after",
      glyph: "↩",
      glyphStyle: styles.metadataGlyphAfter,
      text: `after ${afterStep}`,
      // No completion suffix: `afterStep` carries only the prerequisite's title,
      // not its done-state, so a hard-coded "✓ done" would assert a fact the
      // props can't back. #378 owns real dependency-completion data.
      meta: null,
    });
  }
  if (dueDate) {
    lines.push({
      key: "due",
      glyph: "▦",
      glyphStyle: styles.metadataGlyphDue,
      text: `due ${dueDate}`,
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
          <Text style={line.glyphStyle} importantForAccessibility="no">
            {line.glyph}
          </Text>
          <Text style={styles.metadataText}>{line.text}</Text>
          {line.meta ? (
            <Text style={styles.metadataMeta}>{line.meta}</Text>
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
  onChangeEvidencePlan: () => void;
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
              <Text style={styles.plannedIcon} importantForAccessibility="no">
                {entry.icon}
              </Text>
            ) : null}
            <Text style={styles.plannedLabel}>{entry.label}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.changeText}>
        {t("focusMode:currentTask.inProgress.changeEvidencePlan")}
      </Text>
    </Pressable>
  );
}

/**
 * Read-only evidence rail — one green status chip per captured piece, labelled
 * with its caption when it has one (else the type short-label). Mirrors the
 * StepCard rail: chips are `accessibilityRole="text"`, never buttons. We never
 * surface what is missing — the rail simply shows what is present. Hidden when
 * empty. The section {@link label} varies by state ("Captured" in-progress,
 * "Evidence" when completed).
 */
export function CapturedEvidenceRail({
  items,
  label,
}: {
  items: readonly FocusCapturedEvidenceItem[];
  label: string;
}) {
  const { t } = useTranslation(["common", "focusMode"]);
  if (items.length === 0) {
    return null;
  }
  return (
    <View style={styles.evidenceRail}>
      <Text style={styles.evidenceRailLabel} accessibilityRole="text">
        {label}
      </Text>
      <View style={styles.evidenceRailRow}>
        {items.map((item, index) => {
          const caption = item.caption?.trim();
          const hasCaption = caption != null && caption.length > 0;
          // Normalize before label/icon lookup so an unknown type can't leak a
          // raw key or a missing icon — falls back to `file` (matches StepCard).
          const safeType = validateEvidenceType(item.type);
          const typeLabel = evidenceShortLabel(t, safeType);
          // Stable, unique chip key/testID even when several captionless,
          // id-less items share a type: `index` disambiguates within a type, and
          // the raw `item.type` (not `safeType`) keeps an unknown type's chips
          // distinct. Prefer the row id when present.
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
