import { Suspense, useCallback, useMemo } from "react";
import { View, ScrollView, ActivityIndicator } from "react-native";
import { useNavigation, type NavigationProp } from "@react-navigation/native";
import { useQuery } from "@evolu/react";
import { useTranslation } from "react-i18next";
import { Text } from "../../components/Text";
import { ErrorBoundary } from "../../components/ErrorBoundary";
import { Button } from "../../components/Button";
import { ScreenSubHeader } from "../../components/ScreenHeader";
import { ProgressBar } from "../../components/ProgressBar";
import { TimelineStep } from "../../components/TimelineStep";
import type { TimelineStepChild } from "../../components/TimelineStep";
import { FinishLine } from "../../components/FinishLine";
import {
  goalsQuery,
  stepsByGoalQuery,
  evidenceByGoalQuery,
  stepEvidenceByGoalQuery,
  groupStepsByParent,
  areAllStepsComplete,
  StepStatus,
} from "../../db";
import { parseBadgeDesign } from "../../badges/types";
import type { GoalId, GroupedStep } from "../../db";
import type {
  GoalsStackParamList,
  RootTabParamList,
  TimelineJourneyScreenProps,
} from "../../navigation/types";
import type { StepStatus as UIStepStatus } from "../../types/steps";
import type { EvidenceItemData } from "../../components/EvidenceDrawer";
import { validateEvidenceType } from "../../types/evidence";
import { Logger } from "../../shims/rd-logger";
import { styles } from "./TimelineJourneyScreen.styles";

const logger = new Logger("TimelineJourneyScreen");

/**
 * Id of the leaf to highlight as the journey's single in-progress accent (#293).
 * Mirrors FocusMode's findFirstPendingLeafIndex (#292) over the grouped tree so
 * the accent lands on the same step FocusMode snaps to: walk roots in order; a
 * root's first pending child wins (a pending leaf stays reachable even under a
 * manually-completed parent — completion is per-step, not cascaded); otherwise a
 * pending childless root is itself current, as is the invite state (all children
 * done but the parent still open). Returns null when nothing is pending.
 */
function findCurrentLeafId(grouped: readonly GroupedStep[]): string | null {
  for (const root of grouped) {
    const pendingChild = root.children.find(
      (c) => c.status !== StepStatus.completed,
    );
    if (pendingChild) return pendingChild.id;
    if (root.status === StepStatus.completed) continue;
    return root.id;
  }
  return null;
}

function TimelineContent({
  goalId,
  originBadgeId,
}: {
  goalId: string;
  originBadgeId?: string;
}) {
  const navigation = useNavigation<NavigationProp<GoalsStackParamList>>();
  const { t } = useTranslation(["timelineJourney"]);
  const rows = useQuery(goalsQuery);
  const goal = rows.find((r) => r.id === goalId);
  const stepRows = useQuery(stepsByGoalQuery(goalId as GoalId));
  const goalEvidenceRows = useQuery(evidenceByGoalQuery(goalId as GoalId));

  const evidenceFallbackLabel = t("timelineJourney:evidenceFallbackLabel");

  // Group the flat rows into a one-level parent → children tree and resolve the
  // current leaf — the journey's single in-progress accent (#293).
  const groupedSteps = useMemo(() => groupStepsByParent(stepRows), [stepRows]);
  const currentLeafId = useMemo(
    () => findCurrentLeafId(groupedSteps),
    [groupedSteps],
  );

  // Evidence keyed by step id — looked up for roots and children alike.
  const evidenceByStepId = useStepEvidence(
    goalId as GoalId,
    evidenceFallbackLabel,
  );

  // A node (root or child) is in-progress iff it is the current leaf; otherwise
  // completed/pending from its own DB status. currentLeafId never points at a
  // completed step, so the in-progress check is safe to take first.
  const statusFor = (id: string, dbStatus: string | null): UIStepStatus =>
    id === currentLeafId
      ? "in-progress"
      : dbStatus === StepStatus.completed
        ? "completed"
        : "pending";

  const stepsWithChildren = groupedSteps.map((root) => {
    const evidence = evidenceByStepId.get(root.id) ?? [];
    return {
      id: root.id,
      title: root.title ?? "",
      status: statusFor(root.id, root.status),
      evidenceCount: evidence.length,
      evidence,
      children: root.children.map<TimelineStepChild>((child) => ({
        id: child.id,
        title: child.title ?? "",
        status: statusFor(child.id, child.status),
        evidence: evidenceByStepId.get(child.id) ?? [],
      })),
    };
  });

  // Goal evidence for FinishLine
  const goalEvidence: EvidenceItemData[] = goalEvidenceRows.map((row) => ({
    id: row.id,
    type: validateEvidenceType(row.type ?? "file"),
    label:
      row.description ?? row.type ?? t("timelineJourney:evidenceFallbackLabel"),
  }));

  // Every-unit progress: stepRows already counts parents + children, matching
  // #292's goal-card rule (the journey counts each step, parent or sub-step).
  const completedCount = stepRows.filter(
    (s) => s.status === StepStatus.completed,
  ).length;
  const progress = stepRows.length > 0 ? completedCount / stepRows.length : 0;

  if (!goal) {
    return (
      <View style={styles.centered}>
        <Text variant="body">{t("timelineJourney:errors.goalNotFound")}</Text>
      </View>
    );
  }

  // When originBadgeId is set the user arrived from BadgeDetail and the back
  // affordance must hop tabs back to BadgesTab/BadgeDetail rather than stay in
  // the Goals stack. handleHeaderBack mirrors this. Both fall through to
  // in-stack navigation when the tab parent is missing (deep link / modal
  // host / Storybook) — getParent() returns undefined in those hosts.
  const handleBack = () => {
    if (originBadgeId) {
      const parent = navigation.getParent<NavigationProp<RootTabParamList>>();
      if (parent) {
        parent.navigate("BadgesTab", {
          screen: "BadgeDetail",
          params: { badgeId: originBadgeId },
          // Seed Badges beneath BadgeDetail (see #325) so the list stays
          // reachable via back / the Badges tab on a cold BadgesTab.
          initial: false,
        });
        return;
      }
      logger.warn("Timeline back tapped without a tab navigator parent", {
        goalId,
        originBadgeId,
      });
    }
    navigation.navigate("FocusMode", { goalId });
  };

  const handleNodePress = (_stepIndex: number) => {
    navigation.navigate("FocusMode", { goalId });
  };

  const handleEvidencePress = (evidenceId: string) => {
    navigation.navigate("EvidenceViewer", {
      goalId,
      initialEvidenceId: evidenceId,
    });
  };

  return (
    <View style={{ flex: 1 }}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text
            style={styles.title}
            numberOfLines={2}
            accessible
            accessibilityRole="header"
          >
            {goal.title}
          </Text>
          <Button
            label={
              originBadgeId
                ? t("timelineJourney:backToBadge")
                : t("timelineJourney:backToFocus")
            }
            onPress={handleBack}
            variant="secondary"
            size="sm"
          />
        </View>
        {goal.description && (
          <Text style={styles.description} numberOfLines={3}>
            {goal.description}
          </Text>
        )}
        <View style={styles.progressContainer}>
          <ProgressBar progress={progress} />
          <Text style={styles.progressLabel}>
            {t("timelineJourney:progress", {
              completed: completedCount,
              total: stepRows.length,
            })}
          </Text>
        </View>
      </View>

      {/* Timeline */}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.timelineContainer}>
          {stepsWithChildren.map((step, index) => (
            <TimelineStep
              key={step.id}
              step={step}
              stepIndex={index}
              evidence={step.evidence}
              subSteps={step.children}
              onNodePress={handleNodePress}
              onEvidencePress={handleEvidencePress}
            />
          ))}
          <FinishLine
            goalTitle={goal.title ?? ""}
            badgeDesign={parseBadgeDesign(goal.design)}
            allStepsComplete={areAllStepsComplete(stepRows)}
            // TODO(#378): wire real finishing-flow navigation
            onBadgePress={() => {}}
            goalEvidence={goalEvidence}
            onEvidencePress={handleEvidencePress}
          />
        </View>
      </ScrollView>
    </View>
  );
}

/**
 * Hook to get evidence grouped per step id using a single joined query.
 * Avoids hooks-in-loop by fetching all step evidence for the goal at once, then
 * grouping into a `Map<stepId, EvidenceItemData[]>` so both roots and children
 * can look up their evidence by id (#293).
 */
function useStepEvidence(
  goalId: GoalId,
  fallbackLabel: string,
): Map<string, EvidenceItemData[]> {
  const allStepEvidence = useQuery(stepEvidenceByGoalQuery(goalId));
  return useMemo(() => {
    const grouped = new Map<string, EvidenceItemData[]>();
    for (const ev of allStepEvidence) {
      if (!ev.stepId) continue;
      const list = grouped.get(ev.stepId) ?? [];
      list.push({
        id: ev.id as string,
        type: validateEvidenceType((ev.type ?? "file") as string),
        label: (ev.description ?? ev.type ?? fallbackLabel) as string,
      });
      grouped.set(ev.stepId, list);
    }
    return grouped;
  }, [allStepEvidence, fallbackLabel]);
}

export function TimelineJourneyScreen({ route }: TimelineJourneyScreenProps) {
  const navigation = useNavigation();
  const { t } = useTranslation(["timelineJourney"]);
  const { goalId, originBadgeId } = route.params;

  // Mirrors handleBack in TimelineContent — see comment there for the
  // cross-tab retargeting rationale and the parent-missing fallback.
  const handleHeaderBack = useCallback(() => {
    if (originBadgeId) {
      const parent = navigation.getParent<NavigationProp<RootTabParamList>>();
      if (parent) {
        parent.navigate("BadgesTab", {
          screen: "BadgeDetail",
          params: { badgeId: originBadgeId },
          // Seed Badges beneath BadgeDetail (see #325) so the list stays
          // reachable via back / the Badges tab on a cold BadgesTab.
          initial: false,
        });
        return;
      }
      logger.warn(
        "Timeline header back tapped without a tab navigator parent",
        { goalId, originBadgeId },
      );
    }
    navigation.goBack();
  }, [navigation, originBadgeId, goalId]);

  return (
    <View style={styles.screen}>
      <ScreenSubHeader
        label={t("timelineJourney:title")}
        onBack={handleHeaderBack}
      />
      <View style={styles.body}>
        <ErrorBoundary>
          <Suspense
            fallback={
              <ActivityIndicator style={styles.loadingIndicator} size="large" />
            }
          >
            <TimelineContent goalId={goalId} originBadgeId={originBadgeId} />
          </Suspense>
        </ErrorBoundary>
      </View>
    </View>
  );
}
