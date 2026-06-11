import React from "react";
import { View, Pressable } from "react-native";
import { useTranslation } from "react-i18next";
import { styles } from "./ProgressDots.styles";
import type { StepStatus } from "../../types/steps";

export type { StepStatus };

export interface ProgressDotsStep {
  status: StepStatus;
}

export interface ProgressDotsProps {
  steps: ProgressDotsStep[];
  currentIndex: number;
  onDotTap: (index: number) => void;
  showGoalDot?: boolean;
}

export function ProgressDots({
  steps,
  currentIndex,
  onDotTap,
  showGoalDot = true,
}: ProgressDotsProps) {
  const { t } = useTranslation(["common"]);
  const maxIndex = steps.length + (showGoalDot ? 0 : -1);
  if (
    __DEV__ &&
    maxIndex >= 0 &&
    (currentIndex < 0 || currentIndex > maxIndex)
  ) {
    console.warn(
      `ProgressDots: currentIndex (${currentIndex}) is out of bounds [0..${maxIndex}]`,
    );
  }

  return (
    <View
      style={styles.container}
      accessibilityRole="tablist"
      accessibilityLabel={t("common:progressDots.a11y.label")}
    >
      {steps.map((step, index) => {
        const isCurrent = index === currentIndex;
        return (
          <Pressable
            key={index}
            onPress={() => onDotTap(index)}
            hitSlop={16}
            accessible
            accessibilityRole="tab"
            accessibilityLabel={t("common:timeline.a11y.step", {
              index: index + 1,
              status: step.status,
            })}
            accessibilityState={{ selected: isCurrent }}
          >
            <View
              style={[
                styles.dot,
                step.status === "completed" && styles.dotCompleted,
                step.status === "in-progress" && styles.dotInProgress,
                isCurrent && styles.dotCurrent,
              ]}
            />
          </Pressable>
        );
      })}
      {showGoalDot && (
        <Pressable
          onPress={() => onDotTap(steps.length)}
          hitSlop={16}
          accessible
          accessibilityRole="tab"
          accessibilityLabel={t("common:timeline.a11y.goalEvidence")}
          accessibilityState={{ selected: currentIndex === steps.length }}
        >
          <View
            style={[
              styles.dotGoal,
              currentIndex === steps.length && styles.dotGoalCurrent,
            ]}
          />
        </Pressable>
      )}
    </View>
  );
}
