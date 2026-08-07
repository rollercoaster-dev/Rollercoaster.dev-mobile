import React, { useState } from "react";
import { ScrollView, TextInput, View } from "react-native";
import { useUnistyles } from "react-native-unistyles";
import { ArrowLeft } from "phosphor-react-native";

import { Text } from "../Text";
import { Button } from "../Button";
import { IconButton } from "../IconButton";
import { CollapsibleSection } from "../CollapsibleSection";
import {
  BadgeRenderer,
  type BadgeRendererHandle,
} from "../../badges/BadgeRenderer";
import { ShapeSelector } from "../../badges/ShapeSelector";
import { FrameSelector } from "../../badges/FrameSelector";
import { CenterModeSelector } from "../../badges/CenterModeSelector";
import { IconPicker } from "../../badges/IconPicker";
import { ColorPickerModal } from "../../badges/ColorPickerModal";
import {
  BadgeColorsAccordion,
  type Channel,
} from "../../badges/BadgeColorsAccordion";
import { PathTextEditor } from "../../badges/PathTextEditor";
import { BannerEditor } from "../../badges/BannerEditor";
import { BOTTOM_LABEL_INPUT_MAX_CHARS } from "../../badges/text/BottomLabel";
import { getPathTextMaxChars } from "../../badges/text/pathTextLimits";
import { getSafeTextColor } from "../../utils/accessibility";
import {
  BadgeCenterMode,
  BadgeFrame,
  BADGE_COLOR_THEME_SENTINEL,
  BannerPosition,
  PathTextPosition,
  type BadgeDesign,
  type BadgeIconWeight,
  type BadgeShape,
  type FrameDataParams,
} from "../../badges/types";
import { styles } from "./FinishDesignStage.styles";

/** The five accordion sections, in top-to-bottom order. */
export type FinishDesignSection =
  | "shape"
  | "frame"
  | "center"
  | "colors"
  | "inscriptions";

const DEFAULT_BANNER = { text: "", position: BannerPosition.top } as const;

export interface FinishDesignStageProps {
  /** Current badge design (controlled by the caller). */
  design: BadgeDesign;
  /** Fires with the patched design on every control change (no "Apply" step). */
  onDesignChange: (design: BadgeDesign) => void;
  /** Goal color — surfaces the extra "goal" swatch in the Colors section. */
  goalColor?: string | null;
  /** Goal title, shown as the header subtitle beneath the stage title (D4). */
  goalTitle?: string;
  /**
   * Goal-derived frame parameters (step count, evidence count, dates) applied
   * when the user picks a data-driven frame. Supplied by the screen via
   * `useFrameParamsForGoal`; without it a selected frame renders paramless.
   */
  frameParams?: FrameDataParams | null;
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
  frameSectionTitle?: string;
  centerSectionTitle?: string;
  colorSectionTitle?: string;
  inscriptionsSectionTitle?: string;
  /** Placeholder shown in the empty bottom-label field. */
  bottomLabelPlaceholder?: string;
  /** a11y label for the bottom-label field. */
  bottomLabelAccessibilityLabel?: string;
  /** Primary CTA label. */
  bakeLabel?: string;
  /**
   * Leading glyph on the CTA. Passed to `Button`'s `icon` prop so it renders in
   * its own `<Text>` run (dodging the Android emoji+font glyph-drop bug) and
   * stays out of the accessible name.
   */
  bakeIcon?: string;
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
  /**
   * Optional ref onto the live preview's imperative handle, so a screen can
   * rasterize the *visible* badge with `captureBadge` when the user presses
   * Bake — no second offscreen renderer, no first-mount RAF race, since the
   * preview has been mounted and stable for the whole editing session. Mirrors
   * `BadgeDesignerScreen`'s own `DesignEditor` seam (#449 D3). Stays optional:
   * stories and non-capturing callers pass nothing.
   */
  previewRef?: React.RefObject<BadgeRendererHandle | null>;
}

/**
 * Badge-designer stage of the finishing flow. Renders the "Make your badge"
 * header, a live `BadgeRenderer` preview, and a single-open accordion of five
 * sections (Shape / Frame / Center / Colors / Inscriptions) composing the
 * existing `src/badges/` selectors, ending in a "Bake my badge" CTA.
 *
 * The section set deliberately matches `BadgeDesignerScreen`'s editor: the
 * finishing flow is now the *only* way to design a badge before it is baked
 * (the old pre-bake detour into BadgeDesignerScreen is gone, #449 D2), so
 * anything missing here would simply be unreachable at bake time.
 *
 * Presentational only — `design`/`onDesignChange` are fully controlled (D9) and
 * the CTA fires a bare `onBake()` with no persistence, signing, or navigation
 * (D8). See dev plans for issues #471 and #449.
 */
export function FinishDesignStage({
  design,
  onDesignChange,
  goalColor,
  goalTitle,
  frameParams,
  onBack,
  onBake,
  headerTitle = "Make your badge",
  backAccessibilityLabel = "Back",
  shapeSectionTitle = "Shape",
  frameSectionTitle = "Frame",
  centerSectionTitle = "Center",
  colorSectionTitle = "Colors",
  inscriptionsSectionTitle = "Inscriptions",
  bottomLabelPlaceholder = "EARNED 2026",
  bottomLabelAccessibilityLabel = "Bottom label",
  bakeLabel = "Bake my badge",
  bakeIcon = "✓",
  bakeSubcopy = "saves & seals it into a verifiable badge",
  badgeSize = 150,
  initialExpandedSection = "shape",
  previewRef,
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

  // Which channel the full-screen hex picker is editing — null when closed.
  // One modal for all four channels rather than four mounted instances, same
  // as BadgeDesignerScreen.
  const [colorPickerTarget, setColorPickerTarget] = useState<Channel | null>(
    null,
  );

  // Every handler spreads `{ ...design, <changed field> }` so untouched fields
  // pass through byte-identical (D8).
  const handleShapeChange = (shape: BadgeShape) => {
    if (shape === design.shape) return;
    // Arc capacity differs per shape — re-clamp any path text so switching to a
    // tighter shape can't leave text that overruns its arc.
    onDesignChange({
      ...design,
      shape,
      pathText: design.pathText?.slice(0, getPathTextMaxChars(shape, "top")),
      pathTextBottom: design.pathTextBottom?.slice(
        0,
        getPathTextMaxChars(shape, "bottom"),
      ),
    });
  };

  const handleFrameChange = (frame: BadgeFrame) => {
    if (frame === BadgeFrame.none) {
      // Drop frameColor too — its picker is gated on a frame existing, so a
      // stored hex left behind would be unreachable noise.
      const next = { ...design, frame, frameParams: undefined };
      delete next.frameColor;
      onDesignChange(next);
      return;
    }
    // Fall back to the design's existing frameParams during the hydration
    // window so a re-selected frame doesn't regress to a params-less state.
    onDesignChange({
      ...design,
      frame,
      frameParams: frameParams ?? design.frameParams,
    });
  };

  const handleColorChange = (color: string) =>
    onDesignChange({ ...design, color });

  // All three custom-color channels drop the field when the sentinel is
  // selected. Saved JSON stays minimal and the parser's "absent → 'theme'"
  // fallback handles re-hydration uniformly.
  const dropOrSet =
    (field: "borderColor" | "frameColor" | "iconColor") =>
    (value: typeof BADGE_COLOR_THEME_SENTINEL | string) => {
      if (value === BADGE_COLOR_THEME_SENTINEL) {
        const next = { ...design };
        delete next[field];
        onDesignChange(next);
        return;
      }
      onDesignChange({ ...design, [field]: value });
    };
  const handleBorderColorChange = dropOrSet("borderColor");
  const handleFrameColorChange = dropOrSet("frameColor");
  const handleIconColorChange = dropOrSet("iconColor");

  const handleIconDuotoneOpacityChange = (iconDuotoneOpacity: number) =>
    onDesignChange({ ...design, iconDuotoneOpacity });

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

  const handlePathTextToggle = (enabled: boolean) => {
    if (enabled) {
      onDesignChange({
        ...design,
        pathText: "",
        pathTextPosition: PathTextPosition.top,
      });
      return;
    }
    onDesignChange({
      ...design,
      pathText: undefined,
      pathTextPosition: undefined,
      pathTextBottom: undefined,
    });
  };
  const handlePathTextChange = (pathText: string) =>
    onDesignChange({ ...design, pathText });
  const handlePathTextBottomChange = (pathTextBottom: string) =>
    onDesignChange({ ...design, pathTextBottom });
  const handlePathTextPositionChange = (pathTextPosition: PathTextPosition) =>
    onDesignChange({ ...design, pathTextPosition });

  const handleBannerToggle = (enabled: boolean) =>
    onDesignChange({
      ...design,
      banner: enabled ? { ...DEFAULT_BANNER } : undefined,
    });
  const handleBannerTextChange = (text: string) =>
    onDesignChange({
      ...design,
      banner: { ...(design.banner ?? DEFAULT_BANNER), text },
    });
  const handleBannerPositionChange = (position: BannerPosition) =>
    onDesignChange({
      ...design,
      banner: { ...(design.banner ?? DEFAULT_BANNER), position },
    });

  const centerMode = design.centerMode ?? BadgeCenterMode.icon;
  const frame = design.frame ?? BadgeFrame.none;
  const borderColor = design.borderColor ?? BADGE_COLOR_THEME_SENTINEL;
  const frameColor = design.frameColor ?? BADGE_COLOR_THEME_SENTINEL;
  const iconColor = design.iconColor ?? BADGE_COLOR_THEME_SENTINEL;

  // Starting hex when the modal opens, resolving sentinels to something
  // concrete so the picker never opens on a non-color.
  const modalInitialColor =
    colorPickerTarget === "border"
      ? borderColor === BADGE_COLOR_THEME_SENTINEL
        ? theme.colors.border
        : borderColor
      : colorPickerTarget === "frame"
        ? frameColor === BADGE_COLOR_THEME_SENTINEL
          ? theme.colors.border
          : frameColor
        : colorPickerTarget === "icon"
          ? iconColor === BADGE_COLOR_THEME_SENTINEL
            ? getSafeTextColor(design.color, "FinishDesignStage")
            : iconColor
          : design.color;

  const handleConfirmModalColor = (hex: string) => {
    if (colorPickerTarget === "fill") handleColorChange(hex);
    else if (colorPickerTarget === "border") handleBorderColorChange(hex);
    else if (colorPickerTarget === "frame") handleFrameColorChange(hex);
    else if (colorPickerTarget === "icon") handleIconColorChange(hex);
    setColorPickerTarget(null);
  };

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
          ref={previewRef}
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
          title={frameSectionTitle}
          expanded={expandedSection === "frame"}
          onExpandedChange={openSection("frame")}
          testID="finish-design-frame"
        >
          <FrameSelector
            selectedFrame={frame}
            onSelectFrame={handleFrameChange}
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
          title={colorSectionTitle}
          expanded={expandedSection === "colors"}
          onExpandedChange={openSection("colors")}
          testID="finish-design-color"
        >
          <BadgeColorsAccordion
            design={design}
            goalColor={goalColor}
            onChangeFill={handleColorChange}
            onChangeBorder={handleBorderColorChange}
            onChangeFrame={handleFrameColorChange}
            onChangeIcon={handleIconColorChange}
            onChangeIconDuotoneOpacity={handleIconDuotoneOpacityChange}
            onOpenCustomPicker={setColorPickerTarget}
          />
        </CollapsibleSection>

        <CollapsibleSection
          title={inscriptionsSectionTitle}
          expanded={expandedSection === "inscriptions"}
          onExpandedChange={openSection("inscriptions")}
          testID="finish-design-inscriptions"
        >
          <View style={styles.centerStack}>
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
            <PathTextEditor
              enabled={
                design.pathText !== undefined ||
                design.pathTextPosition !== undefined
              }
              text={design.pathText ?? ""}
              textBottom={design.pathTextBottom ?? ""}
              position={design.pathTextPosition ?? PathTextPosition.top}
              shape={design.shape}
              goalTitle={goalTitle ?? design.title}
              onToggle={handlePathTextToggle}
              onChangeText={handlePathTextChange}
              onChangeTextBottom={handlePathTextBottomChange}
              onChangePosition={handlePathTextPositionChange}
            />
            <BannerEditor
              enabled={design.banner != null}
              text={design.banner?.text ?? ""}
              position={design.banner?.position ?? BannerPosition.top}
              onToggle={handleBannerToggle}
              onChangeText={handleBannerTextChange}
              onChangePosition={handleBannerPositionChange}
            />
          </View>
        </CollapsibleSection>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          label={bakeLabel}
          icon={bakeIcon}
          onPress={onBake}
          variant="primary"
          size="lg"
          testID="finish-design-bake"
        />
        <Text variant="caption" style={styles.subcopy}>
          {bakeSubcopy}
        </Text>
      </View>

      {/* Custom-hex picker for whichever channel opened it. `Modal` portals
          regardless of tree position; confirmed hex flows out through the same
          per-channel handlers as a swatch tap, so the D8 pass-through
          guarantee is unchanged. */}
      <ColorPickerModal
        visible={colorPickerTarget !== null}
        initialColor={modalInitialColor}
        onConfirm={handleConfirmModalColor}
        onClose={() => setColorPickerTarget(null)}
      />
    </View>
  );
}
