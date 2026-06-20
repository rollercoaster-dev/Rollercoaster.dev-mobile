import React from "react";
import { View, Text } from "react-native";
import { useTranslation } from "react-i18next";
import { Card } from "../Card";
import { ProgressBar } from "../ProgressBar";
import { StatusBadge, type StatusBadgeVariant } from "../StatusBadge";
import { styles } from "./GoalCard.styles";

export interface GoalCardGoal {
  id: string;
  title: string;
  status: "active" | "completed";
  stepsTotal: number;
  stepsCompleted: number;
  nextStepTitle: string | null;
  /**
   * Quiet line rendered below the next-step hero. Pre-composed by the caller
   * (#292): `"↳ in [parent]"` when the hero is a pending leaf, `"all N substeps
   * done"` in the invite state, or null/absent for a flat top-level step.
   * GoalCard stays presentational — it renders whatever string it is given.
   */
  nextStepContext?: string | null;
}

export interface GoalCardProps {
  goal: GoalCardGoal;
  onPress?: () => void;
  onLongPress?: () => void;
}

export function GoalCard({ goal, onPress, onLongPress }: GoalCardProps) {
  const { t } = useTranslation(["goals", "common"]);
  const progress =
    goal.stepsTotal > 0 ? goal.stepsCompleted / goal.stepsTotal : 0;

  const statusVariant: StatusBadgeVariant =
    goal.status === "completed" ? "completed" : "active";

  const nextStep = goal.nextStepTitle?.trim() || null;
  const nextStepContext = goal.nextStepContext?.trim() || null;

  const labelOpts = {
    title: goal.title,
    stepsCompleted: goal.stepsCompleted,
    stepsTotal: goal.stepsTotal,
    status: t(`common:status.${goal.status}`),
  };
  const accessibilityLabel = nextStep
    ? t("goals:card.a11y.labelWithNextStep", { ...labelOpts, nextStep })
    : t("goals:card.a11y.label", labelOpts);

  return (
    <Card
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityLabel={onPress ? accessibilityLabel : undefined}
      accessibilityHint={onPress ? t("goals:card.a11y.hint") : undefined}
      testID={`goal-card-${goal.id}`}
    >
      <View style={styles.header}>
        <Text
          style={styles.title}
          numberOfLines={2}
          accessible
          accessibilityRole="header"
        >
          {goal.title}
        </Text>
        <StatusBadge variant={statusVariant} />
      </View>
      {nextStep && (
        <Text
          style={styles.nextStep}
          numberOfLines={2}
          testID="goal-card-next-step"
        >
          {nextStep}
        </Text>
      )}
      {nextStep && nextStepContext && (
        <Text
          style={styles.nextStepContext}
          numberOfLines={1}
          testID="goal-card-next-step-context"
        >
          {nextStepContext}
        </Text>
      )}
      {goal.stepsTotal > 0 && (
        <View style={styles.progressRow}>
          <View style={styles.progressBar}>
            <ProgressBar progress={progress} />
          </View>
          <Text style={styles.progressLabel}>
            {t("goals:card.progressLabel", {
              completed: goal.stepsCompleted,
              total: goal.stepsTotal,
            })}
          </Text>
        </View>
      )}
    </Card>
  );
}
