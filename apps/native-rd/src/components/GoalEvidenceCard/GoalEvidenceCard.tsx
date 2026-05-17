import React, { useMemo } from "react";
import { View, Text, Pressable, PixelRatio } from "react-native";
import { useUnistyles } from "react-native-unistyles";
import Animated from "react-native-reanimated";
import { Card } from "../Card";
import { Checkbox } from "../Checkbox";
import { StatusBadge } from "../StatusBadge";
import {
  BadgeRenderer,
  getRendererLayoutOptions,
} from "../../badges/BadgeRenderer";
import { getBadgeLayoutBoxes } from "../../badges/layoutBoxes";
import { createDefaultBadgeDesign, parseBadgeDesign } from "../../badges/types";
import { useFlashOnIncrease } from "../../hooks/useFlashOnIncrease";
import { formatEvidenceLabel } from "../../utils/formatEvidenceLabel";
import { styles } from "./GoalEvidenceCard.styles";

const BADGE_HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 } as const;

export interface GoalEvidenceCardProps {
  goalTitle: string;
  goalDescription: string | null;
  goalColor: string | null;
  goalDesignJson: string | null;
  onBadgePress: () => void;
  evidenceCount: number;
  onEvidenceTap: () => void;
  /**
   * Pass a handler to expose the Mark Complete affordance.
   * Omit to hide it entirely (no checkbox, no Ready badge).
   */
  onMarkComplete?: () => void;
}

export function GoalEvidenceCard({
  goalTitle,
  goalDescription,
  goalColor,
  goalDesignJson,
  onBadgePress,
  evidenceCount,
  onEvidenceTap,
  onMarkComplete,
}: GoalEvidenceCardProps) {
  const { theme } = useUnistyles();
  const evidenceLabel = formatEvidenceLabel(evidenceCount);
  const flashStyle = useFlashOnIncrease(evidenceCount);

  const effectiveDesign = useMemo(
    () =>
      parseBadgeDesign(goalDesignJson) ??
      createDefaultBadgeDesign(goalTitle, goalColor),
    [goalDesignJson, goalTitle, goalColor],
  );

  const fontScale = PixelRatio.getFontScale();
  const { headline, body } = theme.textStyles;
  // Title can wrap to 2 lines and description to 3; the row uses flex-start so
  // text just grows past the badge in those cases — don't widen the multiplier
  // to "fix" the asymmetry between numberOfLines and this calc.
  const textColumnHeight =
    headline.lineHeight + theme.space[1] + body.lineHeight * 2;
  const badgeSize = Math.round(textColumnHeight * fontScale);

  // Banner / bottomLabel can overflow the badge square — size the wrapper to
  // the SVG viewBox so the card grows horizontally instead of clipping.
  const rendererOptions = getRendererLayoutOptions(theme, false);
  const viewBox = useMemo(
    () =>
      getBadgeLayoutBoxes(effectiveDesign, badgeSize, rendererOptions).viewBox,
    [
      effectiveDesign,
      badgeSize,
      rendererOptions.strokeWidth,
      rendererOptions.hasShadow,
    ],
  );

  return (
    <View style={styles.wrapper}>
      <Card>
        <View style={styles.container}>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Goal</Text>
            {onMarkComplete && <StatusBadge variant="active" label="Ready" />}
          </View>
          <View style={styles.bodyRow}>
            <Pressable
              onPress={onBadgePress}
              hitSlop={BADGE_HIT_SLOP}
              accessible
              accessibilityRole="button"
              accessibilityLabel={`Badge preview for ${goalTitle}, tap to edit design`}
              style={styles.badgePressable(viewBox.w, viewBox.h)}
            >
              <BadgeRenderer
                design={effectiveDesign}
                size={badgeSize}
                showShadow={false}
              />
            </Pressable>
            <View style={styles.textColumn}>
              <Text
                style={styles.title}
                accessible
                accessibilityRole="header"
                numberOfLines={2}
              >
                {goalTitle}
              </Text>
              {goalDescription ? (
                <Text style={styles.description} numberOfLines={3}>
                  {goalDescription}
                </Text>
              ) : null}
            </View>
          </View>
          <View style={styles.evidenceBadgeWrapper}>
            <Pressable
              onPress={onEvidenceTap}
              style={styles.evidenceBadge}
              accessible
              accessibilityRole="button"
              accessibilityLabel={`${evidenceCount} goal evidence items, tap to view`}
            >
              <Text style={styles.evidenceText}>{evidenceLabel}</Text>
            </Pressable>
            <Animated.View
              style={[styles.evidenceFlash, flashStyle]}
              pointerEvents="none"
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            />
          </View>

          {onMarkComplete && (
            <View style={styles.checkboxRow}>
              <Checkbox
                checked={false}
                onToggle={onMarkComplete}
                label="Mark goal complete"
                accessibilityHint="Opens completion flow to capture final evidence"
              />
            </View>
          )}
        </View>
      </Card>
    </View>
  );
}
