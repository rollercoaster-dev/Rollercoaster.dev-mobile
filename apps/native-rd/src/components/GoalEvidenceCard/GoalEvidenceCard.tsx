import React from "react";
import { View, Text, Pressable } from "react-native";
import Animated from "react-native-reanimated";
import { Card } from "../Card";
import { Checkbox } from "../Checkbox";
import { StatusBadge } from "../StatusBadge";
import { useFlashOnIncrease } from "../../hooks/useFlashOnIncrease";
import { formatEvidenceLabel } from "../../utils/formatEvidenceLabel";
import { styles } from "./GoalEvidenceCard.styles";

export interface GoalEvidenceCardProps {
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
  evidenceCount,
  onEvidenceTap,
  canMarkComplete = false,
  onMarkComplete,
}: GoalEvidenceCardProps) {
  const evidenceLabel = formatEvidenceLabel(evidenceCount);
  const flashStyle = useFlashOnIncrease(evidenceCount);

  const showCompleteAffordance =
    onMarkComplete !== undefined && canMarkComplete;

  return (
    <View style={styles.wrapper}>
      <Card>
        <View style={styles.container}>
          <Text style={styles.goalLabel}>★ Goal</Text>
          <Text style={styles.title} accessible accessibilityRole="header">
            Goal Evidence
          </Text>
          <Text style={styles.description}>
            Evidence for the overall goal, not tied to a specific step
          </Text>
          <View style={styles.statusRow}>
            {showCompleteAffordance && (
              <StatusBadge variant="active" label="Ready" />
            )}
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
