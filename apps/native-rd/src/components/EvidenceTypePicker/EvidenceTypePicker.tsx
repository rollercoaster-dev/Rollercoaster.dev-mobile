import React from "react";
import { View, Pressable, Text as RNText } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { EVIDENCE_OPTIONS, type EvidenceTypeValue } from "../../types/evidence";
import { EvidenceType } from "../../db";
import { evidenceLabel } from "../../i18n/labels";
import { AnimatedSheet } from "./AnimatedSheet";
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
 * Capture mode: bottom sheet for single-selecting one evidence type before
 * capturing (Focus Mode, #377). Rendered in-tree (scrim + sheet rising from
 * the bottom of the caller's frame), not as an RN Modal — see CaptureSheet.
 */
export interface CaptureEvidenceTypePickerProps {
  mode: "capture";
  /** Whether the capture sheet is open (drives the slide-up/scrim animation). */
  visible: boolean;
  /**
   * Sheet header copy. Defaults to "Add evidence"
   * (common:evidenceTypePicker.addEvidence). Callers choosing a *planned* type
   * (rather than capturing now) pass their own — e.g. the New Goal wizard's
   * "Evidence type" during goal creation (#463, D3).
   */
  headerTitle?: string;
  /** Active step title shown in the sheet sub-line; omit to hide the sub-line. */
  activeStepTitle?: string;
  /** Pre-highlighted type in the sheet; defaults to `text` ("Note") when omitted. */
  selectedType?: EvidenceTypeValue;
  /** Called when a type cell is tapped. Caller updates its selection and closes the sheet. */
  onSelectType: (type: EvidenceTypeValue) => void;
  /** Closes the sheet — wired to backdrop tap, header × control, and Android back. */
  onClose: () => void;
  /**
   * Control to restore screen-reader focus to when the sheet closes — the chip
   * that opened it. Forwarded to {@link AnimatedSheet}; omit and no focus is
   * restored (e.g. the theme-matrix story).
   */
  restoreFocusRef?: React.RefObject<View | null>;
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
 * creation/editing; `"capture"` renders an in-tree bottom sheet for
 * single-selecting one type before capturing (Focus Mode, #377).
 */
export function EvidenceTypePicker(props: EvidenceTypePickerProps) {
  const { t } = useTranslation(["common"]);

  if (props.mode === "capture") {
    const { mode: _mode, ...captureProps } = props;
    return <CaptureSheet {...captureProps} />;
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

/**
 * Capture-mode bottom sheet — wraps the single-select {@link CaptureGrid} in
 * the shared {@link AnimatedSheet} shell, which owns the in-tree scrim, slide,
 * Android-back handling and animation-pref-aware timing (see AnimatedSheet).
 * This function only resolves the capture-mode copy (default "Add evidence"
 * title, the optional "saving to <step>" sub-line, the close label) and hands
 * pre-resolved strings down — AnimatedSheet itself is i18n-free (D7).
 */
function CaptureSheet({
  visible,
  headerTitle,
  activeStepTitle,
  selectedType,
  onSelectType,
  onClose,
  restoreFocusRef,
}: Omit<CaptureEvidenceTypePickerProps, "mode">) {
  const { t } = useTranslation(["common"]);
  const title = headerTitle ?? t("common:evidenceTypePicker.addEvidence");
  const subLine = activeStepTitle
    ? t("common:evidenceTypePicker.savingToActiveStep", {
        title: activeStepTitle,
      })
    : undefined;

  return (
    <AnimatedSheet
      visible={visible}
      onClose={onClose}
      title={title}
      subLine={subLine}
      closeLabel={t("common:actions.close")}
      restoreFocusRef={restoreFocusRef}
    >
      <CaptureGrid selectedType={selectedType} onSelectType={onSelectType} />
    </AnimatedSheet>
  );
}

interface CaptureGridProps {
  /** Pre-highlighted type; defaults to `text` ("Note") when omitted (D5). */
  selectedType?: EvidenceTypeValue;
  /** Called when a type cell is tapped. */
  onSelectType: (type: EvidenceTypeValue) => void;
}

/**
 * The single-select 3-up radio grid at the heart of the capture sheet. Sole
 * source of the grid JSX (D4): rendered live inside {@link AnimatedSheet} by
 * {@link CaptureSheet}, and standalone by {@link CaptureSheetBody} for the
 * theme-matrix story. Unexported — an internal helper, not a second public
 * picker (D7).
 */
function CaptureGrid({ selectedType, onSelectType }: CaptureGridProps) {
  const { t } = useTranslation(["common"]);
  // "Note" is the easy default when the caller hasn't picked a type yet (D5).
  const effectiveSelected = selectedType ?? EvidenceType.text;

  return (
    <View style={styles.grid}>
      {EVIDENCE_OPTIONS.map((opt) => {
        const isSelected = opt.type === effectiveSelected;
        const optLabel = evidenceLabel(t, opt.type);
        return (
          <Pressable
            key={opt.type}
            style={[styles.cell, isSelected && styles.cellSelected]}
            onPress={() => onSelectType(opt.type)}
            accessibilityRole="radio"
            accessibilityState={{ checked: isSelected }}
            accessibilityLabel={optLabel}
          >
            <RNText style={styles.cellIcon}>{opt.icon}</RNText>
            <RNText
              style={[styles.cellLabel, isSelected && styles.cellLabelSelected]}
            >
              {optLabel}
            </RNText>
          </Pressable>
        );
      })}
    </View>
  );
}

export interface CaptureSheetBodyProps {
  /** Sheet header copy; defaults to "Add evidence" when omitted. */
  headerTitle?: string;
  /** Active step title shown in the sub-line; omit to hide the sub-line. */
  activeStepTitle?: string;
  /** Pre-highlighted type; defaults to `text` ("Note") when omitted. */
  selectedType?: EvidenceTypeValue;
  /**
   * Called when a type cell is tapped. Required — mirrors the public
   * `mode="capture"` contract so a body can't render interactive-but-inert.
   */
  onSelectType: (type: EvidenceTypeValue) => void;
  /** Closes the sheet — wired to the header × control. Required (see above). */
  onClose: () => void;
}

/**
 * Presentational body of the capture sheet — handle, header, sub-line, and the
 * single-select 3-up grid, on the EvidenceDrawer sheet chrome (background +
 * top/side borders + rounded top corners). Rendered inside the animated
 * overlay by `CaptureSheet`, and directly by the `AllThemesMatrix` story —
 * the full picker brings an absolute-fill scrim anchored to its parent, so
 * seven live pickers would stack over the canvas; the body alone tiles. The
 * root is a plain styled `View` (bottom inset applied via `useSafeAreaInsets`)
 * rather than a styled `SafeAreaView`: unistyles styles on the third-party
 * SafeAreaView are silently dropped on web, which rendered the sheet with no
 * background at all. Not exported from the barrel, so it stays an internal
 * helper rather than a second public picker (D7).
 *
 * Deliberately duplicates {@link AnimatedSheet}'s chrome markup (handle +
 * header + sub-line) rather than delegating to it, so it can render standalone
 * — without a scrim — for `AllThemesMatrix` (seven live scrims would stack
 * over the canvas) (D3). The grid itself is *not* duplicated: both this body
 * and the live {@link AnimatedSheet} path render the same {@link CaptureGrid}
 * (D4).
 */
export function CaptureSheetBody({
  headerTitle,
  activeStepTitle,
  selectedType,
  onSelectType,
  onClose,
}: CaptureSheetBodyProps) {
  const { t } = useTranslation(["common"]);
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.sheet(insets.bottom)}>
      <View style={styles.handle} />
      <View style={styles.sheetHeader}>
        <RNText style={styles.sheetTitle} accessibilityRole="header">
          {headerTitle ?? t("common:evidenceTypePicker.addEvidence")}
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
      <CaptureGrid selectedType={selectedType} onSelectType={onSelectType} />
    </View>
  );
}
