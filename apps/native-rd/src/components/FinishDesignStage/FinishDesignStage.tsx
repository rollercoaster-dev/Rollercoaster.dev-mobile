import React, { useState } from "react";
import { ScrollView, TextInput, View } from "react-native";
import { useUnistyles } from "react-native-unistyles";
import { ArrowLeft } from "phosphor-react-native";

import { Text } from "../Text";
import { Button } from "../Button";
import { IconButton } from "../IconButton";
import { CollapsibleSection } from "../CollapsibleSection";
import { BadgeRenderer } from "../../badges/BadgeRenderer";
import { ShapeSelector } from "../../badges/ShapeSelector";
import { ColorPicker } from "../../badges/ColorPicker";
import { CenterModeSelector } from "../../badges/CenterModeSelector";
import { IconPicker } from "../../badges/IconPicker";
import { BOTTOM_LABEL_INPUT_MAX_CHARS } from "../../badges/text/BottomLabel";
import {
  BadgeCenterMode,
  type BadgeDesign,
  type BadgeIconWeight,
  type BadgeShape,
} from "../../badges/types";
import { styles } from "./FinishDesignStage.styles";

/** The four accordion sections, in top-to-bottom order. */
export type FinishDesignSection = "shape" | "color" | "center" | "bottomLabel";

export interface FinishDesignStageProps {
  /** Current badge design (controlled by the caller). */
  design: BadgeDesign;
  /** Fires with the patched design on every control change (no "Apply" step). */
  onDesignChange: (design: BadgeDesign) => void;
  /** Goal color — surfaces the extra "goal" swatch in the Color section. */
  goalColor?: string | null;
  /** Goal title, shown as the header subtitle beneath the stage title (D4). */
  goalTitle?: string;
  /** Back-chevron press handler. */
  onBack: () => void;
  /** "Bake my badge" CTA press handler — a bare callback, no persistence (D8). */
  onBake: () => void;
  /** Stage title in the header band. */
  headerTitle?: string;
  /** a11y label for the back chevron. */
  backAccessibilityLabel?: string;
  /** Section header labels. */
  shapeSectionTitle?: string;
  colorSectionTitle?: string;
  centerSectionTitle?: string;
  bottomLabelSectionTitle?: string;
  /** Placeholder shown in the empty bottom-label field. */
  bottomLabelPlaceholder?: string;
  /** a11y label for the bottom-label field. */
  bottomLabelAccessibilityLabel?: string;
  /** Primary CTA label. */
  bakeLabel?: string;
  /** Muted subcopy below the CTA. */
  bakeSubcopy?: string;
  /** Live preview size in logical pixels (matches the prototype's `badgePreviewMd`). */
  badgeSize?: number;
  /**
   * Seeds the internal single-open accordion state (uncontrolled default, like
   * `defaultValue`). The toggle stays internal (D10); this only sets which
   * section starts open — used by the per-section stories. `null` starts with
   * every section collapsed.
   */
  initialExpandedSection?: FinishDesignSection | null;
}

/**
 * Badge-designer stage of the finishing flow. Renders the "Make your badge"
 * header, a live `BadgeRenderer` preview, and a single-open accordion of four
 * sections (Shape / Color / Center / Bottom label) composing the existing
 * `src/badges/` selectors, ending in a "Bake my badge" CTA.
 *
 * Presentational only — `design`/`onDesignChange` are fully controlled (D9) and
 * the CTA fires a bare `onBake()` with no persistence, signing, or navigation
 * (D8). Screen wiring is #449. See dev plan for issue #471.
 */
export function FinishDesignStage({
  design,
  onDesignChange,
  goalColor,
  goalTitle,
  onBack,
  onBake,
  headerTitle = "Make your badge",
  backAccessibilityLabel = "Back",
  shapeSectionTitle = "Shape",
  colorSectionTitle = "Color",
  centerSectionTitle = "Center",
  bottomLabelSectionTitle = "Bottom label",
  bottomLabelPlaceholder = "EARNED 2026",
  bottomLabelAccessibilityLabel = "Bottom label",
  bakeLabel = "✓ Bake my badge",
  bakeSubcopy = "saves & seals it into a verifiable badge",
  badgeSize = 150,
  initialExpandedSection = "shape",
}: FinishDesignStageProps) {
  const { theme } = useUnistyles();

  // Single-open: opening any section replaces the current one; pressing the
  // open header collapses it, leaving every section closed. Mirrors
  // BadgeDesignerScreen's `openSection` helper (D10).
  const [expandedSection, setExpandedSection] =
    useState<FinishDesignSection | null>(initialExpandedSection);
  const openSection = (id: FinishDesignSection) => (next: boolean) => {
    setExpandedSection(next ? id : null);
  };

  // Every handler spreads `{ ...design, <changed field> }` so untouched fields
  // (frame, pathText, banner, borderColor, frameColor, iconColor) pass through
  // byte-identical (D8).
  const handleShapeChange = (shape: BadgeShape) =>
    onDesignChange({ ...design, shape });
  const handleColorChange = (color: string) =>
    onDesignChange({ ...design, color });
  const handleCenterModeChange = (centerMode: BadgeCenterMode) =>
    onDesignChange({ ...design, centerMode });
  const handleMonogramChange = (monogram: string) =>
    onDesignChange({ ...design, monogram });
  const handleIconChange = (iconName: string) =>
    onDesignChange({ ...design, iconName });
  const handleWeightChange = (iconWeight: BadgeIconWeight) =>
    onDesignChange({ ...design, iconWeight });
  const handleBottomLabelChange = (bottomLabel: string) =>
    onDesignChange({ ...design, bottomLabel });

  const centerMode = design.centerMode ?? BadgeCenterMode.icon;

  return (
    <View style={styles.container} testID="finish-design-stage">
      <View style={styles.header}>
        <IconButton
          icon={<ArrowLeft size={24} weight="bold" />}
          onPress={onBack}
          tone="chrome"
          accessibilityLabel={backAccessibilityLabel}
          testID="finish-design-back"
        />
        <View style={styles.headerText}>
          <Text
            variant="title"
            style={styles.headerTitle}
            accessibilityRole="header"
          >
            {headerTitle}
          </Text>
          {goalTitle ? (
            <Text
              variant="mono"
              style={styles.headerSubtitle}
              numberOfLines={1}
            >
              {goalTitle}
            </Text>
          ) : null}
        </View>
        {/* Trailing spacer keeps the title optically centered against the back button. */}
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.preview}>
        <BadgeRenderer
          design={design}
          size={badgeSize}
          testID="finish-design-preview"
        />
      </View>

      <ScrollView
        style={styles.sections}
        contentContainerStyle={styles.sectionsContent}
        keyboardShouldPersistTaps="handled"
      >
        <CollapsibleSection
          title={shapeSectionTitle}
          expanded={expandedSection === "shape"}
          onExpandedChange={openSection("shape")}
          testID="finish-design-shape"
        >
          <ShapeSelector
            selectedShape={design.shape}
            onSelectShape={handleShapeChange}
          />
        </CollapsibleSection>

        <CollapsibleSection
          title={colorSectionTitle}
          expanded={expandedSection === "color"}
          onExpandedChange={openSection("color")}
          testID="finish-design-color"
        >
          <ColorPicker
            selectedColor={design.color}
            onSelectColor={handleColorChange}
            goalColor={goalColor ?? undefined}
          />
        </CollapsibleSection>

        <CollapsibleSection
          title={centerSectionTitle}
          expanded={expandedSection === "center"}
          onExpandedChange={openSection("center")}
          testID="finish-design-center"
        >
          <View style={styles.centerStack}>
            <CenterModeSelector
              selectedMode={centerMode}
              monogram={design.monogram ?? ""}
              onSelectMode={handleCenterModeChange}
              onChangeMonogram={handleMonogramChange}
            />
            {centerMode === BadgeCenterMode.icon && (
              <IconPicker
                selectedIcon={design.iconName}
                selectedWeight={design.iconWeight}
                onSelectIcon={handleIconChange}
                onSelectWeight={handleWeightChange}
                accentColor={design.color}
              />
            )}
          </View>
        </CollapsibleSection>

        <CollapsibleSection
          title={bottomLabelSectionTitle}
          expanded={expandedSection === "bottomLabel"}
          onExpandedChange={openSection("bottomLabel")}
          testID="finish-design-bottom-label"
        >
          <TextInput
            style={styles.bottomLabelInput}
            value={design.bottomLabel ?? ""}
            onChangeText={handleBottomLabelChange}
            maxLength={BOTTOM_LABEL_INPUT_MAX_CHARS}
            placeholder={bottomLabelPlaceholder}
            placeholderTextColor={theme.colors.textSecondary}
            accessibilityLabel={bottomLabelAccessibilityLabel}
            testID="finish-design-bottom-label-input"
          />
        </CollapsibleSection>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          label={bakeLabel}
          onPress={onBake}
          variant="primary"
          size="lg"
          testID="finish-design-bake"
        />
        <Text variant="caption" style={styles.subcopy}>
          {bakeSubcopy}
        </Text>
      </View>
    </View>
  );
}
