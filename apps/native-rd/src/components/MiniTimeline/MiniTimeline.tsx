import React from "react";
import { View, Pressable, Text } from "react-native";
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
  accessibilityLabel?: string;
}

export function MiniTimeline({
  steps,
  currentIndex,
  onStepTap,
  onTimelineTap,
  accessibilityLabel = "Step progress timeline \u2014 tap to expand",
}: MiniTimelineProps) {
  const allCompleted =
    steps.length > 0 && steps.every((s) => s.status === "completed");

  // The Pressable wrapping the "Tap to expand timeline" Text collapses the
  // child into a single a11y node on iOS (its accessibilityLabel becomes the
  // element's name), so Maestro can't find the literal inner text. Drop the
  // grouping in E2E mode; production keeps `accessible+role=button+label` so
  // screen readers announce the timeline as a single button.
  const isE2E = process.env.EXPO_PUBLIC_E2E_MODE === "true";
  const expandA11y = isE2E
    ? ({ accessible: false } as const)
    : ({
        accessible: true,
        accessibilityRole: "button" as const,
        accessibilityLabel,
        accessibilityHint: "Opens full timeline view",
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
                accessibilityLabel={`Step ${index + 1}: ${step.status}`}
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
          accessibilityLabel="Goal evidence"
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
        <Text style={styles.hintText}>Tap to expand timeline</Text>
      </Pressable>
    </View>
  );
}
