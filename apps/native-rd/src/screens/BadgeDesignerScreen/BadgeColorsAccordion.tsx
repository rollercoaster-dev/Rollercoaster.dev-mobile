// Tabbed channel picker for the badge designer's Colors accordion. The Frame
// tab only mounts when a frame is selected on the design, mirroring the
// renderer.

import React, { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import { useUnistyles } from "react-native-unistyles";
import { useTranslation } from "react-i18next";

import { Text } from "../../components/Text";
import { BrutalistSlider } from "../../components/BrutalistSlider";
import { ColorPicker } from "../../badges/ColorPicker";
import {
  BADGE_COLOR_THEME_SENTINEL,
  BADGE_DUOTONE_OPACITY_DEFAULT,
  BADGE_DUOTONE_OPACITY_MAX,
  BADGE_DUOTONE_OPACITY_MIN,
  BADGE_DUOTONE_OPACITY_STEP,
  BadgeFrame,
} from "../../badges/types";
import type { BadgeDesign } from "../../badges/types";
import { getSafeTextColor } from "../../utils/accessibility";
import { ChannelPalette } from "./ChannelPalette";
import { styles } from "./BadgeColorsAccordion.styles";

export const BADGE_COLOR_CHANNELS = [
  "fill",
  "border",
  "frame",
  "icon",
] as const;

export type Channel = (typeof BADGE_COLOR_CHANNELS)[number];

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
  onChangeIconDuotoneOpacity: (value: number) => void;
  onOpenCustomPicker: (channel: Channel) => void;
}

export function BadgeColorsAccordion({
  design,
  goalColor,
  onChangeFill,
  onChangeBorder,
  onChangeFrame,
  onChangeIcon,
  onChangeIconDuotoneOpacity,
  onOpenCustomPicker,
}: BadgeColorsAccordionProps) {
  const { theme } = useUnistyles();
  const { t } = useTranslation(["badgeDesigner"]);

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

  // Render Border immediately when Frame disappears; the effect then updates
  // stored state so re-enabling a frame does not reopen the stale Frame tab.
  const effectiveTab: Channel =
    tab === "frame" && !frameEnabled ? "border" : tab;

  useEffect(() => {
    if (tab === "frame" && !frameEnabled) setTab("border");
  }, [frameEnabled, tab]);

  return (
    <View style={styles.root}>
      <View style={styles.tabBar} accessibilityRole="tablist">
        <TabHeader
          active={effectiveTab === "fill"}
          onPress={() => setTab("fill")}
          label={t("badgeDesigner:colorChannels.fill")}
          preview={
            <View style={[styles.tabChip, { backgroundColor: design.color }]} />
          }
        />
        <TabHeader
          active={effectiveTab === "border"}
          onPress={() => setTab("border")}
          label={t("badgeDesigner:colorChannels.border")}
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
            active={effectiveTab === "frame"}
            onPress={() => setTab("frame")}
            label={t("badgeDesigner:colorChannels.frame")}
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
          active={effectiveTab === "icon"}
          onPress={() => setTab("icon")}
          label={t("badgeDesigner:colorChannels.icon")}
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

      {effectiveTab === "fill" && (
        <ColorPicker
          selectedColor={design.color}
          onSelectColor={onChangeFill}
          goalColor={goalColor ?? undefined}
          onOpenCustomPicker={() => onOpenCustomPicker("fill")}
        />
      )}

      {effectiveTab === "border" && (
        <ChannelPalette
          a11yLabel={t("badgeDesigner:borderColor.a11y")}
          getSwatchLabel={(id) => t(`borderColor.options.${id}`)}
          getSwatchA11y={(label) =>
            t("badgeDesigner:borderColor.optionA11y", { label })
          }
          customLabel={t("badgeDesigner:borderColor.custom")}
          customHint={t("badgeDesigner:borderColor.customHint")}
          sentinel={{
            label: t("badgeDesigner:borderColor.matchTheme"),
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

      {effectiveTab === "frame" && frameEnabled && (
        <ChannelPalette
          a11yLabel={t("badgeDesigner:frameColor.a11y")}
          getSwatchLabel={(id) => t(`frameColor.options.${id}`)}
          getSwatchA11y={(label) =>
            t("badgeDesigner:frameColor.optionA11y", { label })
          }
          customLabel={t("badgeDesigner:frameColor.custom")}
          customHint={t("badgeDesigner:frameColor.customHint")}
          sentinel={{
            label: t("badgeDesigner:frameColor.matchTheme"),
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

      {effectiveTab === "icon" && (
        <View style={styles.iconTabBody}>
          <ChannelPalette
            a11yLabel={t("badgeDesigner:iconColor.a11y")}
            getSwatchLabel={(id) => t(`iconColor.options.${id}`)}
            getSwatchA11y={(label) =>
              t("badgeDesigner:iconColor.optionA11y", { label })
            }
            customLabel={t("badgeDesigner:iconColor.custom")}
            customHint={t("badgeDesigner:iconColor.customHint")}
            sentinel={{
              label: t("badgeDesigner:iconColor.matchAuto"),
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
          {design.iconWeight === "duotone" && (
            <View style={styles.opacityControl}>
              <View style={styles.opacityLabelRow}>
                <Text variant="label">
                  {t("badgeDesigner:iconColor.opacityLabel")}
                </Text>
                <Text variant="label" testID="duotone-opacity-value">
                  {t("badgeDesigner:iconColor.opacityValue", {
                    value: Math.round(
                      (design.iconDuotoneOpacity ??
                        BADGE_DUOTONE_OPACITY_DEFAULT) * 100,
                    ),
                  })}
                </Text>
              </View>
              <BrutalistSlider
                value={
                  design.iconDuotoneOpacity ?? BADGE_DUOTONE_OPACITY_DEFAULT
                }
                minimumValue={BADGE_DUOTONE_OPACITY_MIN}
                maximumValue={BADGE_DUOTONE_OPACITY_MAX}
                step={BADGE_DUOTONE_OPACITY_STEP}
                onValueChange={onChangeIconDuotoneOpacity}
                accessibilityLabel={t("badgeDesigner:iconColor.opacityA11y")}
                accessibilityHint={t("badgeDesigner:iconColor.opacityHint")}
                formatA11yValue={({
                  value: v,
                  minimumValue: lo,
                  maximumValue: hi,
                }) => ({
                  min: Math.round(lo * 100),
                  max: Math.round(hi * 100),
                  now: Math.round(v * 100),
                  text: `${Math.round(v * 100)}%`,
                })}
              />
            </View>
          )}
        </View>
      )}
    </View>
  );
}

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
