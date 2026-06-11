import React from "react";
import { View, Pressable, Text as RNText } from "react-native";
import { useTranslation } from "react-i18next";
import { EVIDENCE_OPTIONS, type EvidenceTypeValue } from "../../types/evidence";
import { evidenceLabel } from "../../i18n/labels";
import { styles } from "./EvidenceTypePicker.styles";

export interface EvidenceTypePickerProps {
  /** Currently selected evidence types */
  selectedTypes: EvidenceTypeValue[];
  /** Called when user toggles a type on/off (required in interactive mode, unused in compact) */
  onToggleType?: (type: EvidenceTypeValue) => void;
  /** Compact mode for inline display below step titles */
  compact?: boolean;
  /** Optional label to show above chips */
  label?: string;
}

/**
 * Multi-select chip picker for evidence types.
 * Used in step creation/editing to let users choose what evidence they plan to capture.
 */
export function EvidenceTypePicker({
  selectedTypes,
  onToggleType,
  compact = false,
  label,
}: EvidenceTypePickerProps) {
  const { t } = useTranslation(["common"]);

  if (compact) {
    return (
      <View
        style={styles.compactChipsContainer}
        accessible
        accessibilityRole="none"
        accessibilityLabel={t("common:a11y.plannedEvidenceTypes")}
      >
        {EVIDENCE_OPTIONS.filter((opt) => selectedTypes.includes(opt.type)).map(
          (opt) => {
            const optLabel = evidenceLabel(t, opt.type);
            return (
              <View
                key={opt.type}
                style={styles.compactChip}
                accessible={true}
                accessibilityRole="text"
                accessibilityLabel={optLabel}
              >
                <RNText style={styles.compactChipIcon}>{opt.icon}</RNText>
                <RNText style={styles.compactChipLabel}>{optLabel}</RNText>
              </View>
            );
          },
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {label ? <RNText style={styles.label}>{label}</RNText> : null}
      <View
        style={styles.chipsContainer}
        accessible
        accessibilityRole="none"
        accessibilityLabel={t("common:a11y.evidenceTypeOptions")}
      >
        {EVIDENCE_OPTIONS.map((opt) => {
          const isSelected = selectedTypes.includes(opt.type);
          const optLabel = evidenceLabel(t, opt.type);
          return (
            <Pressable
              key={opt.type}
              style={[styles.chip, isSelected && styles.chipSelected]}
              onPress={() => onToggleType?.(opt.type)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: isSelected }}
              accessibilityLabel={optLabel}
              accessibilityHint={
                isSelected
                  ? t("common:a11y.deselectEvidenceType", { label: optLabel })
                  : t("common:a11y.selectEvidenceType", { label: optLabel })
              }
            >
              <RNText style={styles.chipIcon}>{opt.icon}</RNText>
              <RNText
                style={[
                  styles.chipLabel,
                  isSelected && styles.chipLabelSelected,
                ]}
              >
                {optLabel}
              </RNText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
