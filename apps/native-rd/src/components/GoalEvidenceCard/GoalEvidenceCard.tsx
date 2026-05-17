import React from "react";
import { View, Text, Pressable } from "react-native";
import Animated from "react-native-reanimated";
import { Card } from "../Card";
import { Checkbox } from "../Checkbox";
import { StatusBadge, type StatusBadgeVariant } from "../StatusBadge";
import { useFlashOnIncrease } from "../../hooks/useFlashOnIncrease";
import { formatEvidenceLabel } from "../../utils/formatEvidenceLabel";
import { styles } from "./GoalEvidenceCard.styles";

export interface GoalEvidenceCardProps {
  evidenceCount: number;
  onEvidenceTap: () => void;
  /**
   * Whether the "Mark goal complete" check is currently tappable.
   * Stepless goals: pass `true`. Stepped goals: pass `allStepsComplete`.
   *
   * When `onMarkComplete` is omitted the check is not rendered at all —
   * callers that haven't migrated yet see the original card unchanged.
   */
  canMarkComplete?: boolean;
  onMarkComplete?: () => void;
  /** Count of still-pending steps. Drives the locked-state hint copy. */
  pendingStepCount?: number;
}

export function GoalEvidenceCard({
  evidenceCount,
  onEvidenceTap,
  canMarkComplete = false,
  onMarkComplete,
  pendingStepCount = 0,
}: GoalEvidenceCardProps) {
  const evidenceLabel = formatEvidenceLabel(evidenceCount);
  const flashStyle = useFlashOnIncrease(evidenceCount);

  const showCompleteAffordance = onMarkComplete !== undefined;

  const statusVariant: StatusBadgeVariant = canMarkComplete
    ? "active"
    : "locked";
  const statusLabel = canMarkComplete ? "Ready" : "Locked";

  const lockedHint =
    !canMarkComplete && pendingStepCount > 0
      ? `Complete ${pendingStepCount} remaining step${
          pendingStepCount === 1 ? "" : "s"
        } first`
      : null;

  const handleMarkComplete = () => {
    if (!canMarkComplete) return;
    onMarkComplete?.();
  };

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
              <StatusBadge variant={statusVariant} label={statusLabel} />
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

          {showCompleteAffordance && lockedHint && (
            <Text style={styles.lockedHint} accessibilityRole="text">
              {lockedHint}
            </Text>
          )}

          {showCompleteAffordance && (
            <View style={styles.checkboxRow}>
              <Checkbox
                checked={false}
                onToggle={handleMarkComplete}
                label="Mark goal complete"
                disabled={!canMarkComplete}
                accessibilityHint={
                  canMarkComplete
                    ? "Opens completion flow to capture final evidence"
                    : (lockedHint ?? "Complete remaining steps first")
                }
              />
            </View>
          )}
        </View>
      </Card>
    </View>
  );
}
