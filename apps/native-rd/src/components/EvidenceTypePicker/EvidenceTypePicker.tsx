import React from "react";
import { View, Pressable, Text as RNText } from "react-native";
import { EVIDENCE_OPTIONS, type EvidenceTypeValue } from "../../types/evidence";
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
  if (compact) {
    return (
      <View
        style={styles.compactChipsContainer}
        accessible
        accessibilityRole="none"
        accessibilityLabel="Planned evidence types"
      >
        {EVIDENCE_OPTIONS.filter((opt) => selectedTypes.includes(opt.type)).map(
          (opt) => (
            <View
              key={opt.type}
              style={styles.compactChip}
              accessible={true}
              accessibilityRole="text"
              accessibilityLabel={opt.label}
            >
              <RNText style={styles.compactChipIcon}>{opt.icon}</RNText>
              <RNText style={styles.compactChipLabel}>{opt.label}</RNText>
            </View>
          ),
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
        accessibilityLabel="Evidence type options"
      >
        {EVIDENCE_OPTIONS.map((opt) => {
          const isSelected = selectedTypes.includes(opt.type);
          return (
            <Pressable
              key={opt.type}
              style={[styles.chip, isSelected && styles.chipSelected]}
              onPress={() => onToggleType?.(opt.type)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: isSelected }}
              accessibilityLabel={opt.label}
              accessibilityHint={
                isSelected ? `Deselect ${opt.label}` : `Select ${opt.label}`
              }
            >
              <RNText style={styles.chipIcon}>{opt.icon}</RNText>
              <RNText
                style={[
                  styles.chipLabel,
                  isSelected && styles.chipLabelSelected,
                ]}
              >
                {opt.label}
              </RNText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
