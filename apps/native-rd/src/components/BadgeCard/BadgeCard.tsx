import { useMemo } from "react";
import { View, Text as RNText, Pressable } from "react-native";
import { useUnistyles } from "react-native-unistyles";
import {
  BadgeRenderer,
  getRendererLayoutOptions,
} from "../../badges/BadgeRenderer";
import { getBadgeLayoutBoxes } from "../../badges/layoutBoxes";
import type { BadgeDesign } from "../../badges/types";
import { Text } from "../Text";
import { useTypeScale } from "../../hooks/useTypeScale";
import { styles } from "./BadgeCard.styles";

export type BadgeCardSize = "compact" | "normal" | "spacious";

export interface BadgeCardProps {
  title: string;
  earnedDate: string;
  description?: string;
  evidenceCount?: number;
  design?: BadgeDesign | null;
  size?: BadgeCardSize;
  onPress?: () => void;
}

export function BadgeCard({
  title,
  earnedDate,
  description,
  evidenceCount,
  design,
  size = "normal",
  onPress,
}: BadgeCardProps) {
  const { theme } = useUnistyles();
  const { scaleFor } = useTypeScale();
  const { headline, body, caption } = theme.textStyles;
  // Each line grows by its own role's capped scale, matching the Text nodes below.
  const textColumnHeight =
    headline.lineHeight * scaleFor("headline") +
    theme.space[1] +
    body.lineHeight * 2 * scaleFor("body") +
    theme.space[2] +
    caption.lineHeight * scaleFor("caption");
  const badgeSize = Math.round(textColumnHeight);

  // Banner/bottomLabel overflow the badge square — size to the SVG viewBox so the card grows instead of clipping.
  // Pass the same layout options the renderer uses (no shadow, theme-aware strokeWidth) so the wrapper matches the mounted SVG.
  const rendererOptions = getRendererLayoutOptions(theme, false);
  const viewBox = useMemo(
    () =>
      design
        ? getBadgeLayoutBoxes(design, badgeSize, rendererOptions).viewBox
        : null,
    [design, badgeSize, rendererOptions.strokeWidth, rendererOptions.hasShadow],
  );

  return (
    <Pressable
      onPress={onPress}
      accessible
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={`Badge: ${title}, earned ${earnedDate}`}
      accessibilityHint={description}
      style={styles.pressable}
    >
      <View style={styles.container(size)}>
        <View
          style={styles.badgeWrapper(
            viewBox?.w ?? badgeSize,
            viewBox?.h ?? badgeSize,
          )}
        >
          {design ? (
            <BadgeRenderer
              design={design}
              size={badgeSize}
              showShadow={false}
            />
          ) : (
            <View style={styles.initials(badgeSize)}>
              {/* Sized from badgeSize, which already tracks the scaled text column. */}
              <RNText
                style={styles.initialsText(badgeSize)}
                allowFontScaling={false}
              >
                {(title.charAt(0) || "?").toUpperCase()}
              </RNText>
            </View>
          )}
        </View>
        <View style={styles.textColumn}>
          <Text
            variant="headline"
            style={styles.title}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {title}
          </Text>
          {description ? (
            <Text
              variant="body"
              style={styles.description}
              numberOfLines={2}
              ellipsizeMode="tail"
            >
              {description}
            </Text>
          ) : null}
          <Text variant="caption" style={styles.date}>
            {earnedDate}
          </Text>
          {evidenceCount !== undefined && (
            <Text variant="caption" style={styles.evidenceCount}>
              {/* eslint-disable-next-line local/no-raw-jsx-strings -- pre-existing; migrate to formatEvidenceLabel() (#62) */}
              {evidenceCount} {evidenceCount === 1 ? "piece" : "pieces"} of
              evidence
            </Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}
