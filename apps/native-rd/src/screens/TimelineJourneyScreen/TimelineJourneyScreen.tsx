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
import { FinishLine } from "../../components/FinishLine";
import {
  goalsQuery,
  stepsByGoalQuery,
  evidenceByGoalQuery,
  stepEvidenceByGoalQuery,
  findFirstPendingIndex,
  StepStatus,
} from "../../db";
import type { GoalId } from "../../db";
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

  // Build UI steps with status
  const firstPendingIndex = findFirstPendingIndex(stepRows);
  const uiSteps: {
    id: string;
    title: string;
    status: UIStepStatus;
    evidenceCount: number;
  }[] = stepRows.map((row, index) => ({
    id: row.id,
    title: row.title ?? "",
    status:
      row.status === StepStatus.completed
        ? "completed"
        : index === firstPendingIndex
          ? "in-progress"
          : "pending",
    evidenceCount: 0,
  }));

  const evidenceFallbackLabel = t("timelineJourney:evidenceFallbackLabel");

  // Query evidence per step
  const stepEvidenceData = useStepEvidence(
    goalId as GoalId,
    stepRows,
    evidenceFallbackLabel,
  );

  // Enrich counts
  const stepsWithEvidence = uiSteps.map((step, i) => ({
    ...step,
    evidenceCount: stepEvidenceData[i]?.length ?? 0,
  }));

  // Goal evidence for FinishLine
  const goalEvidence: EvidenceItemData[] = goalEvidenceRows.map((row) => ({
    id: row.id,
    type: validateEvidenceType(row.type ?? "file"),
    label:
      row.description ?? row.type ?? t("timelineJourney:evidenceFallbackLabel"),
  }));

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
          {stepsWithEvidence.map((step, index) => (
            <TimelineStep
              key={step.id}
              step={step}
              stepIndex={index}
              evidence={stepEvidenceData[index] ?? []}
              onNodePress={handleNodePress}
              onEvidencePress={handleEvidencePress}
            />
          ))}
          <FinishLine
            goalEvidence={goalEvidence}
            onEvidencePress={handleEvidencePress}
          />
        </View>
      </ScrollView>
    </View>
  );
}

/**
 * Hook to get evidence grouped per step using a single joined query.
 * Avoids hooks-in-loop by fetching all step evidence for the goal at once,
 * then grouping into EvidenceItemData[][] with useMemo.
 */
function useStepEvidence(
  goalId: GoalId,
  stepRows: readonly { id: string }[],
  fallbackLabel: string,
): EvidenceItemData[][] {
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
    return stepRows.map((s) => grouped.get(s.id) ?? []);
  }, [allStepEvidence, stepRows, fallbackLabel]);
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
