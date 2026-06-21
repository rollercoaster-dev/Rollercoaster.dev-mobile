import React from "react";
import { View, Text, Pressable } from "react-native";
import { useTranslation } from "react-i18next";
import {
  EVIDENCE_CAPTURE_OPTIONS,
  type EvidenceCaptureOption,
  type QuickEvidenceType,
} from "../../types/evidence";
import { evidenceShortLabel } from "../../i18n/labels";
import { styles } from "./StepCard.styles";

type QuickEvidenceCaptureOption = EvidenceCaptureOption & {
  readonly type: QuickEvidenceType;
};

/**
 * Planned evidence types not yet captured, in capture-button order. The card
 * foot renders one quick-capture button per result (#360, Joe 2026-06-21).
 * This never frames anything as "missing": the buttons are capture invites
 * that simply thin out as evidence lands, and vanish entirely once every
 * planned type is captured.
 */
export function getMissingQuickEvidenceOptions(
  plannedTypes: readonly string[],
  capturedTypes: readonly string[],
): readonly QuickEvidenceCaptureOption[] {
  return EVIDENCE_CAPTURE_OPTIONS.filter(
    (option): option is QuickEvidenceCaptureOption =>
      plannedTypes.includes(option.type) &&
      !capturedTypes.includes(option.type),
  );
}

export interface EvidenceCaptureButtonsProps {
  /** Step the captured evidence attaches to (leaf step or parent). */
  stepId: string;
  /** Pre-filtered options from {@link getMissingQuickEvidenceOptions}. */
  options: readonly QuickEvidenceCaptureOption[];
  onQuickEvidence: (stepId: string, type: QuickEvidenceType) => void;
}

/**
 * Row of typed quick-capture buttons pinned in the card foot. Shared by the
 * leaf and overview archetypes so a parent captures evidence the same way a
 * leaf does (#360). Pure presentation: callers compute `options` and render
 * this only when the row is non-empty.
 */
export function EvidenceCaptureButtons({
  stepId,
  options,
  onQuickEvidence,
}: EvidenceCaptureButtonsProps) {
  const { t } = useTranslation(["common"]);
  return (
    <View style={styles.quickActionsRow}>
      {options.map((option) => {
        const optionLabel = evidenceShortLabel(t, option.type);
        return (
          <Pressable
            key={option.type}
            onPress={() => onQuickEvidence(stepId, option.type)}
            style={styles.quickActionButton}
            testID={`step-card-quick-evidence-${option.type}`}
            accessible
            accessibilityRole="button"
            accessibilityLabel={t("common:stepCard.quickAction.a11y", {
              label: optionLabel,
            })}
          >
            <Text style={styles.quickActionIcon} accessibilityElementsHidden>
              {option.icon}
            </Text>
            <Text style={styles.quickActionText}>{optionLabel}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
