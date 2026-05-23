import React from "react";
import { View, Pressable, Text } from "react-native";
import { useTranslation } from "react-i18next";
import { styles } from "./MiniTimeline.styles";
import type { StepStatus } from "../../types/steps";

export type { StepStatus };

export interface MiniTimelineStep {
  status: StepStatus;
}

export interface MiniTimelineProps {
  steps: MiniTimelineStep[];
  currentIndex: number;
  onStepTap: (index: number) => void;
  onTimelineTap: () => void;
  accessibilityLabel: string;
}

export function MiniTimeline({
  steps,
  currentIndex,
  onStepTap,
  onTimelineTap,
  accessibilityLabel,
}: MiniTimelineProps) {
  const { t } = useTranslation("common");
  const allCompleted =
    steps.length > 0 && steps.every((s) => s.status === "completed");

  // The Pressable wrapping the "Tap to expand timeline" Text collapses the
  // child into a single a11y node on iOS (its accessibilityLabel becomes the
  // element's name), so Maestro can't find the literal inner text. Drop the
  // grouping in E2E mode; production keeps `accessible+role=button+label` so
  // screen readers announce the timeline as a single button.
  //
  // Contract note: in E2E mode the caller-supplied `accessibilityLabel` prop
  // is intentionally dropped — Maestro reaches the inner Text by its literal
  // content ("Tap to expand timeline"). Re-applying the prop to the Text
  // child would override that content for a11y lookup and break the flow.
  const isE2E = process.env.EXPO_PUBLIC_E2E_MODE === "true";
  const expandA11y = isE2E
    ? ({ accessible: false } as const)
    : ({
        accessible: true,
        accessibilityRole: "button" as const,
        accessibilityLabel,
        accessibilityHint: t("timeline.a11y.hint"),
      } as const);

  return (
    <View style={styles.container}>
      <View style={styles.track}>
        {steps.map((step, index) => {
          const isCurrent = index === currentIndex;
          return (
            <React.Fragment key={index}>
              <Pressable
                onPress={() => onStepTap(index)}
                hitSlop={15}
                accessible
                accessibilityRole="button"
                accessibilityLabel={t("timeline.a11y.step", {
                  index: index + 1,
                  status: step.status,
                })}
              >
                <View
                  style={[
                    styles.node,
                    step.status === "completed" && styles.nodeCompleted,
                    isCurrent && styles.nodeCurrent,
                  ]}
                />
              </Pressable>
              <View
                style={[
                  styles.segment,
                  step.status === "completed"
                    ? styles.segmentCompleted
                    : styles.segmentPending,
                ]}
              />
            </React.Fragment>
          );
        })}
        <Pressable
          onPress={() => onStepTap(steps.length)}
          hitSlop={15}
          accessible
          accessibilityRole="button"
          accessibilityLabel={t("timeline.a11y.goalEvidence")}
        >
          <View
            style={[
              styles.nodeGoal,
              allCompleted && styles.nodeGoalCompleted,
              currentIndex === steps.length && styles.nodeCurrent,
            ]}
          />
        </Pressable>
      </View>
      <Pressable onPress={onTimelineTap} {...expandA11y}>
        <Text style={styles.hintText}>{t("timeline.hint")}</Text>
      </Pressable>
    </View>
  );
}
