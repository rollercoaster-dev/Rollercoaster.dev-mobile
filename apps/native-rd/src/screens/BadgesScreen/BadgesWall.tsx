import React, { useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  FlatList,
  useWindowDimensions,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";
import { useTranslation } from "react-i18next";
import { BadgeRenderer } from "../../badges/BadgeRenderer";
import type { BadgeDesign } from "../../badges/types";
import { BadgeWallCell } from "../../components/BadgeWallCell/BadgeWallCell";
import { CELL_SIZE } from "../../components/BadgeWallCell/BadgeWallCell.styles";
import { useAnimationPref } from "../../hooks/useAnimationPref";
import { formatDate } from "../../utils/format";
import { palette } from "../../themes/palette";
import { styles, GALLERY_GAP, GALLERY_H_PADDING } from "./BadgesWall.styles";

/** Already-resolved most-recently-earned badge for the spotlight card (D7). */
export interface BadgesWallSpotlight {
  id: string;
  design: BadgeDesign | null;
  goalTitle: string;
  /** Resolved ISO date string (container applies `completedAt ?? createdAt`). */
  earnedAt: string | null;
}

/** Already-resolved badge for one dense gallery cell (D7). */
export interface BadgesWallGalleryItem {
  id: string;
  design: BadgeDesign | null;
  title: string;
}

export interface BadgesWallProps {
  /** Total earned-badge count shown in the header tally. */
  count: number;
  /** Most-recently-earned badge, or null (0 badges / no spotlight). */
  spotlight: BadgesWallSpotlight | null;
  /** Every earned badge, rendered one cell each — no cap (D9). */
  gallery: BadgesWallGalleryItem[];
  onOpenBadge: (id: string) => void;
  /** Empty-state CTA target — container wires this to the Goals tab (D12). */
  onSeeGoals: () => void;
}

/** Ghost-badge motif for the empty state — a dashed outline coin with the
 *  Badges-tab lightning glyph, mirroring GoalsCockpit's bespoke TargetIcon (D8).
 *  The colored halo breathes only when the caller's `glowStyle` animates. */
function GhostBadge({
  glowStyle,
}: {
  glowStyle: ReturnType<typeof useAnimatedStyle>;
}) {
  return (
    <View style={styles.ghostWrap}>
      <Animated.View
        style={[styles.ghostGlow, glowStyle]}
        pointerEvents="none"
      />
      <View style={styles.ghostBadge}>
        <Svg width={46} height={46} viewBox="0 0 24 24">
          <Path
            d="M13 2 L4 14 L11 14 L9 22 L20 9 L13 9 Z"
            fill={palette.gray500}
          />
        </Svg>
      </View>
    </View>
  );
}

/** Spotlight badge art — the badge's own shape via BadgeRenderer, or a neutral
 *  rounded-square initial tile when the design isn't set (mirrors BadgeWallCell,
 *  but without its Pressable so it doesn't nest inside the spotlight's). */
function SpotlightArt({
  design,
  title,
}: {
  design: BadgeDesign | null;
  title: string;
}) {
  if (design) return <BadgeRenderer design={design} size={CELL_SIZE} />;
  return (
    <View style={styles.spotlightArtFallback}>
      <Text style={styles.spotlightArtFallbackText}>
        {(title.charAt(0) || "?").toUpperCase()}
      </Text>
    </View>
  );
}

/**
 * BadgesWall — the pure, prop-driven "wall of proof" view for the Badges tab
 * (#404). A fixed dark full-bleed surface with a count header, a most-recent
 * badge spotlight, and a dense uncapped gallery of {@link BadgeWallCell}s; the
 * redesigned empty state replaces all of that when `count === 0`.
 *
 * No queries, navigation, or DB row types — the container (#405) resolves data
 * (parsed `design`, resolved `earnedAt`) and wires `onOpenBadge` / `onSeeGoals`.
 */
export function BadgesWall({
  count,
  spotlight,
  gallery,
  onOpenBadge,
  onSeeGoals,
}: BadgesWallProps) {
  const { t, i18n } = useTranslation(["badges"]);
  const { animationPref } = useAnimationPref();
  const { width } = useWindowDimensions();

  // Decorative celebration glow — loops only under the "full" animation pref;
  // "reduced"/"none" leave it static (opacity 0 → no halo, nothing pulses).
  // Gated identically for the spotlight and the empty-state ghost badge (D10).
  const glow = useSharedValue(0);
  useEffect(() => {
    if (animationPref === "full") {
      glow.value = withRepeat(withTiming(1, { duration: 1700 }), -1, true);
    } else {
      glow.value = 0;
    }
  }, [animationPref, glow]);
  const glowStyle = useAnimatedStyle(() => ({
    opacity: animationPref === "full" ? 0.35 + glow.value * 0.65 : 0,
  }));

  if (count === 0) {
    return (
      <View style={[styles.surface, styles.empty]}>
        <GhostBadge glowStyle={glowStyle} />
        <Text style={styles.emptyTitle} accessibilityRole="header">
          {t("badges:empty.title")}
        </Text>
        <Text style={styles.emptyBody}>{t("badges:empty.body")}</Text>
        {/* eslint-disable-next-line local/no-shared-component-reimplementation -- intentional on-surface accent CTA (D13): the shared <Button>'s accentPrimary fill is #000000 in highContrast, invisible on #161616. */}
        <Pressable
          onPress={onSeeGoals}
          accessible
          accessibilityRole="button"
          accessibilityLabel={t("badges:empty.action")}
          testID="badges-wall-see-goals"
          style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
        >
          {/* Trailing arrow lives in the copy (Button's icon slot is leading-only, D9). */}
          <Text style={styles.ctaLabel}>{t("badges:empty.action")}</Text>
        </Pressable>
      </View>
    );
  }

  // Pack the fixed 60pt cells across the measured surface width; floor of 3 so a
  // narrow/zero-width (test) viewport still lays out a grid.
  const numColumns = Math.max(
    3,
    Math.floor(
      (width - GALLERY_H_PADDING * 2 + GALLERY_GAP) / (CELL_SIZE + GALLERY_GAP),
    ),
  );

  const listHeader = (
    <View>
      <View style={styles.header}>
        <Text style={styles.headerCount} testID="badges-wall-count">
          {t("badges:wall.count", { count })}
        </Text>
        <Text style={styles.headerOverline}>
          {t("badges:wall.allVerifiable")}
        </Text>
      </View>
      {spotlight ? (
        // eslint-disable-next-line local/no-shared-component-reimplementation -- tappable content card (the spotlight), not a Button lookalike
        <Pressable
          onPress={() => onOpenBadge(spotlight.id)}
          accessible
          accessibilityRole="button"
          accessibilityLabel={spotlight.goalTitle}
          testID="badges-wall-spotlight"
          style={styles.spotlightPressable}
        >
          <View style={styles.spotlightCard}>
            <Animated.View
              style={[styles.glowOverlay, glowStyle]}
              pointerEvents="none"
            />
            <SpotlightArt
              design={spotlight.design}
              title={spotlight.goalTitle}
            />
            <View style={styles.spotlightBody}>
              <Text style={styles.spotlightOverline}>
                {t("badges:wall.justEarned")}
              </Text>
              <Text style={styles.spotlightTitle} numberOfLines={2}>
                {spotlight.goalTitle}
              </Text>
              {spotlight.earnedAt ? (
                <Text style={styles.spotlightDate}>
                  {formatDate(spotlight.earnedAt, i18n.language)}
                </Text>
              ) : null}
            </View>
            <Text style={styles.spotlightArrow}>→</Text>
          </View>
        </Pressable>
      ) : null}
    </View>
  );

  return (
    <View style={styles.surface}>
      <FlatList
        // Remount when the column count changes (rotation): FlatList throws if
        // numColumns changes without a new key.
        key={`badges-wall-cols-${numColumns}`}
        data={gallery}
        keyExtractor={(item) => item.id}
        numColumns={numColumns}
        columnWrapperStyle={styles.galleryRow}
        contentContainerStyle={styles.galleryContent}
        ListHeaderComponent={listHeader}
        renderItem={({ item }) => (
          <BadgeWallCell
            badge={{ title: item.title, design: item.design }}
            onPress={() => onOpenBadge(item.id)}
            testID={`badge-wall-cell-${item.id}`}
          />
        )}
      />
    </View>
  );
}
