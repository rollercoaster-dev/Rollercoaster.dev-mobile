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
   * Whether the goal is ready to be marked complete.
   * Stepless goals: pass `true`. Stepped goals: pass `allStepsComplete`.
   *
   * When false (or when `onMarkComplete` is omitted), the entire
   * Mark Complete affordance is absent — no badge, no checkbox.
   * Mirrors how StepCard hides its checkbox when blocked.
   */
  canMarkComplete?: boolean;
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
  canMarkComplete = false,
  onMarkComplete,
}: GoalEvidenceCardProps) {
  const evidenceLabel = formatEvidenceLabel(evidenceCount);
  const flashStyle = useFlashOnIncrease(evidenceCount);

  // Precedence mirrors CompletionFlowScreen.tsx:150-157 — goal.design is the
  // pre-bake source of truth; createDefaultBadgeDesign synthesizes a placeholder
  // from title + color when the user hasn't customized yet.
  const effectiveDesign = useMemo(
    () =>
      parseBadgeDesign(goalDesignJson) ??
      createDefaultBadgeDesign(goalTitle, goalColor),
    [goalDesignJson, goalTitle, goalColor],
  );

  const showCompleteAffordance =
    onMarkComplete !== undefined && canMarkComplete;

  return (
    <View style={styles.wrapper}>
      <Card>
        <View style={styles.container}>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Goal</Text>
            {showCompleteAffordance && (
              <StatusBadge variant="active" label="Ready" />
            )}
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
          <View style={styles.statusRow}>
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
          </View>

          {showCompleteAffordance && (
            <View style={styles.checkboxRow}>
              <Checkbox
                checked={false}
                onToggle={onMarkComplete!}
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
