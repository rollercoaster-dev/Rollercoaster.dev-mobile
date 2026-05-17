import React, { useMemo } from "react";
import { View, Text, Pressable } from "react-native";
import Animated from "react-native-reanimated";
import { Card } from "../Card";
import { Checkbox } from "../Checkbox";
import { StatusBadge } from "../StatusBadge";
import { BadgeRenderer } from "../../badges/BadgeRenderer";
import { createDefaultBadgeDesign, parseBadgeDesign } from "../../badges/types";
import { useFlashOnIncrease } from "../../hooks/useFlashOnIncrease";
import { formatEvidenceLabel } from "../../utils/formatEvidenceLabel";
import { styles } from "./GoalEvidenceCard.styles";

const BADGE_PREVIEW_SIZE = 120;
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
  const evidenceLabel = formatEvidenceLabel(evidenceCount);
  const flashStyle = useFlashOnIncrease(evidenceCount);

  const effectiveDesign = useMemo(
    () =>
      parseBadgeDesign(goalDesignJson) ??
      createDefaultBadgeDesign(goalTitle, goalColor),
    [goalDesignJson, goalTitle, goalColor],
  );

  return (
    <View style={styles.wrapper}>
      <Card>
        <View style={styles.container}>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Goal</Text>
            {onMarkComplete && <StatusBadge variant="active" label="Ready" />}
          </View>
          <View style={styles.badgeRow}>
            <Pressable
              onPress={onBadgePress}
              hitSlop={BADGE_HIT_SLOP}
              accessible
              accessibilityRole="button"
              accessibilityLabel={`Badge preview for ${goalTitle}, tap to edit design`}
              style={styles.badgePressable}
            >
              <BadgeRenderer
                design={effectiveDesign}
                size={BADGE_PREVIEW_SIZE}
                showShadow={false}
              />
            </Pressable>
          </View>
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
