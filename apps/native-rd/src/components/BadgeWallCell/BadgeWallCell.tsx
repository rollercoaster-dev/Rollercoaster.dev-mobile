import { View, Text, Pressable } from "react-native";
import { BadgeRenderer } from "../../badges/BadgeRenderer";
import type { BadgeDesign } from "../../badges/types";
import { styles, CELL_SIZE } from "./BadgeWallCell.styles";

/** Minimal presentational subset of a badge row this cell needs. */
export interface BadgeWallCellBadge {
  title: string;
  design: BadgeDesign | null;
}

export interface BadgeWallCellProps {
  badge: BadgeWallCellBadge;
  onPress: () => void;
  testID?: string;
}

/**
 * BadgeWallCell — one pressable badge in the dense BadgesWall gallery (#403).
 *
 * Renders the badge in its OWN designed shape (circle, shield, star, hexagon,
 * roundedRect, diamond — whatever {@link BadgeRenderer} supports). There is
 * deliberately no circular clip: the wall is a "wall of proof" of distinct
 * shapes, not a grid of
 * identical circles. Border and hard shadow come from the renderer and follow
 * the active theme (shadow dropped in highContrast / lowVision / autismFriendly).
 *
 * When a badge has no design yet, it falls back to an initial-letter tile in a
 * neutral rounded square — NOT a circle. A null design has no shape to
 * represent, so a square-ish placeholder is the honest stand-in (mirrors the
 * initials pattern in BadgeCard) and stays visually distinct from real badges.
 */
export function BadgeWallCell({ badge, onPress, testID }: BadgeWallCellProps) {
  return (
    <Pressable
      onPress={onPress}
      accessible
      accessibilityRole="button"
      accessibilityLabel={badge.title}
      style={styles.pressable}
      testID={testID}
    >
      {badge.design ? (
        <BadgeRenderer design={badge.design} size={CELL_SIZE} />
      ) : (
        <View style={styles.fallback}>
          <Text style={styles.fallbackText}>
            {(badge.title.charAt(0) || "?").toUpperCase()}
          </Text>
        </View>
      )}
    </Pressable>
  );
}
