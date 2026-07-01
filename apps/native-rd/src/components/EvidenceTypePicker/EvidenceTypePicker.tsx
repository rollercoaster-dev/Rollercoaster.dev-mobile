import React from "react";
import { View, Pressable, Modal, Text as RNText } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { EVIDENCE_OPTIONS, type EvidenceTypeValue } from "../../types/evidence";
import { EvidenceType } from "../../db";
import { evidenceLabel } from "../../i18n/labels";
import { styles } from "./EvidenceTypePicker.styles";

/**
 * Authoring mode (default): inline multi-select chip grid used in step
 * creation/editing to choose which evidence types are planned.
 */
export interface AuthoringEvidenceTypePickerProps {
  /** Presentation mode. Omit or pass `"authoring"` for the chip grid. */
  mode?: "authoring";
  /** Currently selected evidence types. */
  selectedTypes: EvidenceTypeValue[];
  /** Called when the user toggles a type on/off (unused in `compact`). */
  onToggleType?: (type: EvidenceTypeValue) => void;
  /** Compact, read-only inline display below step titles. */
  compact?: boolean;
  /** Optional label shown above the chips. */
  label?: string;
}

/**
 * Capture mode: modal bottom sheet for single-selecting one evidence type
 * before capturing (Focus Mode, #377).
 */
export interface CaptureEvidenceTypePickerProps {
  mode: "capture";
  /** Whether the capture sheet is visible (drives the Modal). */
  visible: boolean;
  /** Active step title shown in the sheet sub-line; omit to hide the sub-line. */
  activeStepTitle?: string;
  /** Pre-highlighted type in the sheet; defaults to `text` ("Note") when omitted. */
  selectedType?: EvidenceTypeValue;
  /** Called when a type cell is tapped. Caller updates its selection and closes the sheet. */
  onSelectType: (type: EvidenceTypeValue) => void;
  /** Closes the sheet — wired to backdrop tap, header × control, and Android back. */
  onClose: () => void;
}

/**
 * Props for {@link EvidenceTypePicker}: a discriminated union on `mode`. The
 * authoring chip grid and the capture bottom sheet have disjoint prop sets, so
 * the compiler enforces that a capture sheet supplies `onSelectType`/`onClose`
 * and never carries a meaningless `selectedTypes` (and vice versa).
 */
export type EvidenceTypePickerProps =
  | AuthoringEvidenceTypePickerProps
  | CaptureEvidenceTypePickerProps;

/**
 * Evidence-type picker with two presentation modes (see {@link EvidenceTypePickerProps}):
 * `"authoring"` (default) renders an inline multi-select chip grid for step
 * creation/editing; `"capture"` renders a modal bottom sheet for single-selecting
 * one type before capturing (Focus Mode, #377).
 */
export function EvidenceTypePicker(props: EvidenceTypePickerProps) {
  const { t } = useTranslation(["common"]);

  if (props.mode === "capture") {
    const { visible, activeStepTitle, selectedType, onSelectType, onClose } =
      props;
    return (
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={onClose}
        accessibilityViewIsModal
      >
        <View style={styles.overlay}>
          {/* Backdrop — tapping the exposed scrim dismisses the sheet. */}
          <Pressable
            testID="capture-sheet-backdrop"
            style={styles.backdrop}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel={t("common:actions.close")}
          />
          <CaptureSheetBody
            activeStepTitle={activeStepTitle}
            selectedType={selectedType}
            onSelectType={onSelectType}
            onClose={onClose}
          />
        </View>
      </Modal>
    );
  }

  const { selectedTypes, onToggleType, compact = false, label } = props;

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

export interface CaptureSheetBodyProps {
  activeStepTitle?: string;
  selectedType?: EvidenceTypeValue;
  onSelectType?: (type: EvidenceTypeValue) => void;
  onClose?: () => void;
}

/**
 * Presentational body of the capture sheet — handle, header, sub-line, and the
 * single-select 3-up grid. Rendered inside the Modal by `EvidenceTypePicker`'s
 * capture branch, and directly (no Modal) by the `AllThemesMatrix` story: on web
 * each `Modal` portals to `<body>` with `position: fixed`, so seven full sheets
 * can't tile — the story tiles this body instead. One source of the grid JSX; not
 * exported from the barrel, so it stays an internal helper rather than a second
 * public picker (D7).
 */
export function CaptureSheetBody({
  activeStepTitle,
  selectedType,
  onSelectType,
  onClose,
}: CaptureSheetBodyProps) {
  const { t } = useTranslation(["common"]);
  // "Note" is the easy default when the caller hasn't picked a type yet (D5).
  const effectiveSelected = selectedType ?? EvidenceType.text;

  return (
    <SafeAreaView edges={["bottom"]} style={styles.sheet}>
      <View style={styles.handle} />
      <View style={styles.sheetHeader}>
        <RNText style={styles.sheetTitle} accessibilityRole="header">
          {t("common:evidenceTypePicker.addEvidence")}
        </RNText>
        <Pressable
          style={styles.closeButton}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={t("common:actions.close")}
          hitSlop={8}
        >
          <RNText style={styles.closeIcon}>{"✕"}</RNText>
        </Pressable>
      </View>
      {activeStepTitle ? (
        <RNText style={styles.subLine}>
          {t("common:evidenceTypePicker.savingToActiveStep", {
            title: activeStepTitle,
          })}
        </RNText>
      ) : null}
      <View style={styles.grid}>
        {EVIDENCE_OPTIONS.map((opt) => {
          const isSelected = opt.type === effectiveSelected;
          const optLabel = evidenceLabel(t, opt.type);
          return (
            <Pressable
              key={opt.type}
              style={[styles.cell, isSelected && styles.cellSelected]}
              onPress={() => onSelectType?.(opt.type)}
              accessibilityRole="radio"
              accessibilityState={{ checked: isSelected }}
              accessibilityLabel={optLabel}
            >
              <RNText style={styles.cellIcon}>{opt.icon}</RNText>
              <RNText
                style={[
                  styles.cellLabel,
                  isSelected && styles.cellLabelSelected,
                ]}
              >
                {optLabel}
              </RNText>
            </Pressable>
          );
        })}
      </View>
    </SafeAreaView>
  );
}
