import { View, Text, Pressable, PixelRatio } from "react-native";
import { useUnistyles } from "react-native-unistyles";
import { BadgeRenderer } from "../../badges/BadgeRenderer";
import { getBadgeLayoutBoxes } from "../../badges/layoutBoxes";
import type { BadgeDesign } from "../../badges/types";
import { styles } from "./BadgeCard.styles";

export type BadgeCardSize = "compact" | "normal" | "spacious";

export interface BadgeCardProps {
  title: string;
  earnedDate: string;
  description?: string | null;
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
  const fontScale = PixelRatio.getFontScale();
  const { headline, body, caption } = theme.textStyles;
  const textColumnHeight =
    headline.lineHeight +
    theme.space[1] +
    body.lineHeight * 2 +
    theme.space[2] +
    caption.lineHeight;
  const badgeSize = Math.round(textColumnHeight * fontScale);

  // When a design has a banner and/or a bottom label, the BadgeRenderer's
  // viewBox is taller than the badge's square — let the wrapper match that
  // natural height so the card grows instead of clipping.
  const badgeViewBox = design ? getBadgeLayoutBoxes(design, badgeSize) : null;
  const badgeRenderedHeight = badgeViewBox?.viewBox.h ?? badgeSize;
  const badgeRenderedWidth = badgeViewBox?.viewBox.w ?? badgeSize;

  return (
    <Pressable
      onPress={onPress}
      accessible
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={`Badge: ${title}, earned ${earnedDate}`}
      style={styles.pressable}
    >
      <View style={styles.container(size)}>
        <View
          style={styles.badgeWrapper(badgeRenderedWidth, badgeRenderedHeight)}
        >
          {design ? (
            <BadgeRenderer
              design={design}
              size={badgeSize}
              showShadow={false}
            />
          ) : (
            <View style={styles.initials(badgeSize)}>
              <Text style={styles.initialsText(badgeSize)}>
                {(title.charAt(0) || "?").toUpperCase()}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.textColumn}>
          <Text style={styles.title} numberOfLines={1} ellipsizeMode="tail">
            {title}
          </Text>
          {description ? (
            <Text
              style={styles.description}
              numberOfLines={2}
              ellipsizeMode="tail"
            >
              {description}
            </Text>
          ) : null}
          <Text style={styles.date}>{earnedDate}</Text>
          {evidenceCount !== undefined && (
            <Text style={styles.evidenceCount}>
              {evidenceCount} {evidenceCount === 1 ? "piece" : "pieces"} of
              evidence
            </Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}
