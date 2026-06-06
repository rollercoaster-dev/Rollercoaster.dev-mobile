/**
 * Colors accordion body for the badge designer.
 *
 * Tabbed picker (Fill / Border / Frame / Icon) where each tab owns a full
 * channel: sentinel (when applicable) + palette swatches + custom-color
 * trigger. The Frame tab is only mounted when a frame is selected on the
 * design, mirroring the renderer's behaviour.
 *
 * Replaces the earlier stack of separate `ColorPicker` / `BorderColorPicker`
 * / `IconColorPicker` cards which read as duplicated palettes (issue #248).
 */

import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import { useTranslation } from "react-i18next";

import { Text } from "../../components/Text";
import { ColorPicker, ACCENT_COLORS } from "../../badges/ColorPicker";
import { BADGE_COLOR_THEME_SENTINEL, BadgeFrame } from "../../badges/types";
import type { BadgeDesign } from "../../badges/types";
import { getSafeTextColor, meetsWCAG } from "../../utils/accessibility";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Channel = "fill" | "border" | "frame" | "icon";

// Decorative glyph painted in the Icon-tab preview chip so users can see the
// resolved icon color against the fill. Hidden from screen readers; not user
// copy, so it lives outside i18n.
const ICON_TAB_PREVIEW_GLYPH = "A";

export interface BadgeColorsAccordionProps {
  design: BadgeDesign;
  goalColor?: string | null;
  onChangeFill: (hex: string) => void;
  onChangeBorder: (value: typeof BADGE_COLOR_THEME_SENTINEL | string) => void;
  onChangeFrame: (value: typeof BADGE_COLOR_THEME_SENTINEL | string) => void;
  onChangeIcon: (value: typeof BADGE_COLOR_THEME_SENTINEL | string) => void;
  onOpenCustomPicker: (channel: Channel) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function BadgeColorsAccordion({
  design,
  goalColor,
  onChangeFill,
  onChangeBorder,
  onChangeFrame,
  onChangeIcon,
  onOpenCustomPicker,
}: BadgeColorsAccordionProps) {
  const { theme } = useUnistyles();
  const { t } = useTranslation("badgeDesigner");

  const frameEnabled = design.frame !== BadgeFrame.none;

  const borderRaw = design.borderColor ?? BADGE_COLOR_THEME_SENTINEL;
  const borderResolved =
    borderRaw === BADGE_COLOR_THEME_SENTINEL ? theme.colors.border : borderRaw;
  const frameRaw = design.frameColor ?? BADGE_COLOR_THEME_SENTINEL;
  const frameResolved =
    frameRaw === BADGE_COLOR_THEME_SENTINEL ? theme.colors.border : frameRaw;
  const iconRaw = design.iconColor ?? BADGE_COLOR_THEME_SENTINEL;
  const iconResolved =
    iconRaw === BADGE_COLOR_THEME_SENTINEL
      ? getSafeTextColor(design.color, "BadgeColorsAccordion")
      : iconRaw;

  const [tab, setTab] = useState<Channel>("fill");

  // If the user removes the frame while the Frame tab is open, redirect to
  // Border. Without this the tab body would unmount and leave an active tab
  // header with no content rendered.
  useEffect(() => {
    if (tab === "frame" && !frameEnabled) setTab("border");
  }, [frameEnabled, tab]);

  // Only warn on explicit hex picks — the Auto sentinel already chooses the
  // high-contrast color, so warning on it would be noise.
  const showIconContrastWarning =
    iconRaw !== BADGE_COLOR_THEME_SENTINEL &&
    !meetsWCAG(iconResolved, design.color).passes;

  return (
    <View style={styles.root}>
      <View style={styles.tabBar} accessibilityRole="tablist">
        <TabHeader
          active={tab === "fill"}
          onPress={() => setTab("fill")}
          label={t("colorChannels.fill")}
          preview={
            <View style={[styles.tabChip, { backgroundColor: design.color }]} />
          }
        />
        <TabHeader
          active={tab === "border"}
          onPress={() => setTab("border")}
          label={t("colorChannels.border")}
          preview={
            <View
              style={[
                styles.tabChip,
                styles.tabChipRing,
                { borderColor: borderResolved },
              ]}
            />
          }
        />
        {frameEnabled && (
          <TabHeader
            active={tab === "frame"}
            onPress={() => setTab("frame")}
            label={t("colorChannels.frame")}
            preview={
              <View
                style={[
                  styles.tabChip,
                  styles.tabChipRing,
                  { borderColor: frameResolved, borderStyle: "dashed" },
                ]}
              />
            }
          />
        )}
        <TabHeader
          active={tab === "icon"}
          onPress={() => setTab("icon")}
          label={t("colorChannels.icon")}
          preview={
            <View
              style={[
                styles.tabChip,
                styles.tabChipIcon,
                { backgroundColor: design.color },
              ]}
            >
              <Text
                style={[styles.tabChipGlyph, { color: iconResolved }]}
                accessibilityElementsHidden
              >
                {ICON_TAB_PREVIEW_GLYPH}
              </Text>
            </View>
          }
        />
      </View>

      {tab === "fill" && (
        <ColorPicker
          selectedColor={design.color}
          onSelectColor={onChangeFill}
          goalColor={goalColor ?? undefined}
          onOpenCustomPicker={() => onOpenCustomPicker("fill")}
        />
      )}

      {tab === "border" && (
        <ChannelPalette
          a11yLabel={t("borderColor.a11y")}
          getSwatchLabel={(id) => t(`borderColor.options.${id}`)}
          getSwatchA11y={(label) => t("borderColor.optionA11y", { label })}
          customLabel={t("borderColor.custom")}
          customHint={t("borderColor.customHint")}
          sentinel={{
            label: t("borderColor.matchTheme"),
            previewColor: theme.colors.border,
            hollow: true,
            selected: borderRaw === BADGE_COLOR_THEME_SENTINEL,
            onPress: () => onChangeBorder(BADGE_COLOR_THEME_SENTINEL),
          }}
          selectedHex={
            borderRaw === BADGE_COLOR_THEME_SENTINEL ? null : borderRaw
          }
          onSelectHex={onChangeBorder}
          onOpenCustom={() => onOpenCustomPicker("border")}
        />
      )}

      {tab === "frame" && frameEnabled && (
        <ChannelPalette
          a11yLabel={t("frameColor.a11y")}
          getSwatchLabel={(id) => t(`frameColor.options.${id}`)}
          getSwatchA11y={(label) => t("frameColor.optionA11y", { label })}
          customLabel={t("frameColor.custom")}
          customHint={t("frameColor.customHint")}
          sentinel={{
            label: t("frameColor.matchTheme"),
            previewColor: theme.colors.border,
            hollow: true,
            selected: frameRaw === BADGE_COLOR_THEME_SENTINEL,
            onPress: () => onChangeFrame(BADGE_COLOR_THEME_SENTINEL),
          }}
          selectedHex={
            frameRaw === BADGE_COLOR_THEME_SENTINEL ? null : frameRaw
          }
          onSelectHex={onChangeFrame}
          onOpenCustom={() => onOpenCustomPicker("frame")}
        />
      )}

      {tab === "icon" && (
        <View style={styles.iconTabBody}>
          <ChannelPalette
            a11yLabel={t("iconColor.a11y")}
            getSwatchLabel={(id) => t(`iconColor.options.${id}`)}
            getSwatchA11y={(label) => t("iconColor.optionA11y", { label })}
            customLabel={t("iconColor.custom")}
            customHint={t("iconColor.customHint")}
            sentinel={{
              label: t("iconColor.matchAuto"),
              previewColor: iconResolved,
              hollow: false,
              selected: iconRaw === BADGE_COLOR_THEME_SENTINEL,
              onPress: () => onChangeIcon(BADGE_COLOR_THEME_SENTINEL),
            }}
            selectedHex={
              iconRaw === BADGE_COLOR_THEME_SENTINEL ? null : iconRaw
            }
            onSelectHex={onChangeIcon}
            onOpenCustom={() => onOpenCustomPicker("icon")}
          />
          {showIconContrastWarning && (
            <Text
              variant="caption"
              style={styles.contrastWarning}
              testID="icon-contrast-warning"
            >
              {t("iconColor.contrastWarning")}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Tab header
// ---------------------------------------------------------------------------

interface TabHeaderProps {
  active: boolean;
  label: string;
  onPress: () => void;
  preview: React.ReactNode;
}

function TabHeader({ active, label, onPress, preview }: TabHeaderProps) {
  const { theme } = useUnistyles();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.tab,
        {
          borderBottomColor: active
            ? theme.colors.accentPrimary
            : "transparent",
        },
      ]}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
    >
      {preview}
      <Text
        variant="caption"
        style={{
          color: active ? theme.colors.text : theme.colors.textSecondary,
          fontWeight: active ? "700" : "500",
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Generic channel palette (sentinel + accent swatches + custom)
// ---------------------------------------------------------------------------

interface SentinelConfig {
  label: string;
  previewColor: string;
  /** Hollow ring preview (Border/Frame) vs filled disc (Icon Auto). */
  hollow: boolean;
  selected: boolean;
  onPress: () => void;
}

type AccentSwatchId = (typeof ACCENT_COLORS)[number]["id"];

interface ChannelPaletteProps {
  a11yLabel: string;
  /** Returns the visible label for a swatch id, e.g. `"Purple"`. */
  getSwatchLabel: (id: AccentSwatchId) => string;
  /** Returns the a11y label for a swatch, e.g. `"Purple border color"`. */
  getSwatchA11y: (label: string) => string;
  customLabel: string;
  customHint: string;
  sentinel: SentinelConfig;
  selectedHex: string | null;
  onSelectHex: (hex: string) => void;
  onOpenCustom: () => void;
}

function ChannelPalette({
  a11yLabel,
  getSwatchLabel,
  getSwatchA11y,
  customLabel,
  customHint,
  sentinel,
  selectedHex,
  onSelectHex,
  onOpenCustom,
}: ChannelPaletteProps) {
  const { theme } = useUnistyles();

  const isCustomSelected =
    selectedHex !== null && !ACCENT_COLORS.some((c) => c.hex === selectedHex);

  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={a11yLabel}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.paletteRow}
      >
        <Pressable
          onPress={sentinel.onPress}
          style={styles.cell}
          accessibilityRole="radio"
          accessibilityLabel={sentinel.label}
          accessibilityState={{ checked: sentinel.selected }}
        >
          <View
            style={[
              styles.swatch,
              sentinel.hollow
                ? {
                    backgroundColor: "transparent",
                    borderColor: sentinel.selected
                      ? theme.colors.accentPrimary
                      : sentinel.previewColor,
                    borderWidth: sentinel.selected ? 4 : 3,
                  }
                : {
                    backgroundColor: sentinel.previewColor,
                    borderColor: sentinel.selected
                      ? theme.colors.accentPrimary
                      : "transparent",
                    borderWidth: sentinel.selected ? 4 : 3,
                  },
            ]}
          />
          <Text
            variant="caption"
            style={{
              color: sentinel.selected
                ? theme.colors.text
                : theme.colors.textSecondary,
              fontWeight: sentinel.selected ? "700" : "500",
            }}
            numberOfLines={1}
          >
            {sentinel.label}
          </Text>
        </Pressable>

        {ACCENT_COLORS.map(({ id, hex }) => {
          const isSelected = hex === selectedHex;
          const label = getSwatchLabel(id);
          return (
            <Pressable
              key={`${id}-${hex}`}
              onPress={() => onSelectHex(hex)}
              accessibilityRole="radio"
              accessibilityLabel={getSwatchA11y(label)}
              accessibilityState={{ checked: isSelected }}
              style={styles.cell}
            >
              <View
                style={[
                  styles.swatch,
                  {
                    backgroundColor: hex,
                    borderColor: isSelected
                      ? theme.colors.accentPrimary
                      : "transparent",
                    borderWidth: isSelected ? 4 : 3,
                  },
                ]}
              />
              <Text
                variant="caption"
                style={{
                  color: isSelected
                    ? theme.colors.text
                    : theme.colors.textSecondary,
                  fontWeight: isSelected ? "700" : "500",
                }}
                numberOfLines={1}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}

        <Pressable
          onPress={onOpenCustom}
          style={styles.cell}
          accessibilityRole="button"
          accessibilityLabel={customLabel}
          accessibilityHint={customHint}
        >
          <View
            style={[
              styles.swatch,
              styles.customSwatch,
              {
                backgroundColor: isCustomSelected
                  ? (selectedHex as string)
                  : theme.colors.background,
                borderColor: isCustomSelected
                  ? theme.colors.accentPrimary
                  : theme.colors.border,
                borderWidth: isCustomSelected ? 4 : 3,
              },
            ]}
          >
            <Text
              style={[
                styles.customGlyph,
                {
                  color: isCustomSelected
                    ? theme.colors.background
                    : theme.colors.text,
                },
              ]}
              accessibilityElementsHidden
            >
              +
            </Text>
          </View>
          <Text
            variant="caption"
            style={{
              color: isCustomSelected
                ? theme.colors.text
                : theme.colors.textSecondary,
              fontWeight: isCustomSelected ? "700" : "500",
            }}
            numberOfLines={1}
          >
            {customLabel}
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const SWATCH_SIZE = 44;
const TAB_CHIP_SIZE = 22;

const styles = StyleSheet.create((theme) => ({
  root: {
    gap: theme.space[3],
  },
  tabBar: {
    flexDirection: "row",
    gap: theme.space[2],
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: theme.space[1],
    paddingVertical: theme.space[2],
    borderBottomWidth: 3,
    minHeight: 56,
  },
  tabChip: {
    width: TAB_CHIP_SIZE,
    height: TAB_CHIP_SIZE,
    borderRadius: TAB_CHIP_SIZE / 2,
  },
  tabChipRing: {
    backgroundColor: "transparent",
    borderWidth: 3,
  },
  tabChipIcon: {
    alignItems: "center",
    justifyContent: "center",
  },
  tabChipGlyph: {
    fontSize: 12,
    fontWeight: "800",
  },
  paletteRow: {
    gap: theme.space[3],
    paddingHorizontal: theme.space[1],
    alignItems: "flex-start",
  },
  cell: {
    alignItems: "center",
    minWidth: 56,
    minHeight: 72,
    gap: theme.space[1],
  },
  swatch: {
    width: SWATCH_SIZE,
    height: SWATCH_SIZE,
    borderRadius: SWATCH_SIZE / 2,
  },
  customSwatch: {
    alignItems: "center",
    justifyContent: "center",
  },
  customGlyph: {
    fontSize: 22,
    fontWeight: "700",
    fontFamily: theme.fontFamily.body,
  },
  iconTabBody: {
    gap: theme.space[2],
  },
  contrastWarning: {
    color: theme.colors.error,
  },
}));
