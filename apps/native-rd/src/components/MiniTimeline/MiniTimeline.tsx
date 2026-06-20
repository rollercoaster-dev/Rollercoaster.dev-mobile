import React from "react";
import { View, Pressable, Text } from "react-native";
import { useTranslation } from "react-i18next";
import { styles } from "./MiniTimeline.styles";
import type { StepStatus } from "../../types/steps";

export type { StepStatus };

export interface MiniTimelineStep {
  status: StepStatus;
  /**
   * Sub-step flag (#292). Child nodes render smaller and inline on the same
   * track, joined to their parent by short connectors and grouped under a
   * bottom-border "shelf" (the prototype's `grp-indent` indented sub-spine).
   * Absent/false = a standard top-level node.
   */
  isChild?: boolean;
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
  const { t } = useTranslation(["common"]);
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
        accessibilityHint: t("common:timeline.a11y.hint"),
      } as const);

  // Group each run of child steps under its preceding top-level (lead) step.
  // The flat `steps` array places each parent immediately before its children
  // (#292 query order), so a run of `isChild` steps attaches to the last lead.
  const groups: {
    lead: { step: MiniTimelineStep; index: number };
    children: { step: MiniTimelineStep; index: number }[];
  }[] = [];
  steps.forEach((step, index) => {
    if (step.isChild && groups.length > 0) {
      groups[groups.length - 1].children.push({ step, index });
    } else {
      groups.push({ lead: { step, index }, children: [] });
    }
  });

  const renderNode = (
    step: MiniTimelineStep,
    index: number,
    isChild: boolean,
  ) => {
    const isCurrent = index === currentIndex;
    return (
      <Pressable
        onPress={() => onStepTap(index)}
        // Child nodes are smaller; widen their hit area so the touch target
        // stays at least 44pt (full sub-step a11y audit is #294).
        hitSlop={isChild ? 17 : 15}
        accessible
        accessibilityRole="button"
        accessibilityLabel={t("common:timeline.a11y.step", {
          index: index + 1,
          status: step.status,
        })}
      >
        <View
          testID={`timeline-node-${index}`}
          style={[
            styles.node,
            step.status === "completed" && styles.nodeCompleted,
            isChild && styles.nodeChild,
            isCurrent &&
              (isChild ? styles.nodeChildCurrent : styles.nodeCurrent),
          ]}
        />
      </Pressable>
    );
  };

  const renderSegment = (completed: boolean, short = false) => (
    <View
      style={[
        styles.segment,
        short && styles.segmentShort,
        completed ? styles.segmentCompleted : styles.segmentPending,
      ]}
    />
  );

  return (
    <View style={styles.container}>
      <View style={styles.track}>
        {groups.map((group) => {
          // A top-level step's connector (and the goal-node-preceding segment)
          // reflects the lead's own completion. A parent stays "pending" until
          // manually completed, so its connector stays dashed even when all its
          // children are done (#292 invite state — no auto-completion).
          const leadCompleted = group.lead.step.status === "completed";
          if (group.children.length === 0) {
            return (
              <React.Fragment key={group.lead.index}>
                {renderNode(group.lead.step, group.lead.index, false)}
                {renderSegment(leadCompleted)}
              </React.Fragment>
            );
          }
          return (
            <React.Fragment key={group.lead.index}>
              <View style={styles.groupIndent}>
                {renderNode(group.lead.step, group.lead.index, false)}
                {group.children.map((child) => (
                  <React.Fragment key={child.index}>
                    {renderSegment(child.step.status === "completed", true)}
                    {renderNode(child.step, child.index, true)}
                  </React.Fragment>
                ))}
              </View>
              {renderSegment(leadCompleted)}
            </React.Fragment>
          );
        })}
        <Pressable
          onPress={() => onStepTap(steps.length)}
          hitSlop={15}
          accessible
          accessibilityRole="button"
          accessibilityLabel={t("common:timeline.a11y.goalEvidence")}
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
        <Text style={styles.hintText}>{t("common:timeline.hint")}</Text>
      </Pressable>
    </View>
  );
}
