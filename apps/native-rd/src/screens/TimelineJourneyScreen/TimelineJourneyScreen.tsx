import { Suspense, useMemo } from "react";
import { View, ScrollView, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, type NavigationProp } from "@react-navigation/native";
import { useQuery } from "@evolu/react";
import { useUnistyles } from "react-native-unistyles";
import { Text } from "../../components/Text";
import { ErrorBoundary } from "../../components/ErrorBoundary";
import { Button } from "../../components/Button";
import { IconButton } from "../../components/IconButton";
import { ProgressBar } from "../../components/ProgressBar";
import { TimelineStep } from "../../components/TimelineStep";
import { FinishLine } from "../../components/FinishLine";
import {
  goalsQuery,
  stepsByGoalQuery,
  evidenceByGoalQuery,
  stepEvidenceByGoalQuery,
  StepStatus,
} from "../../db";
import type { GoalId } from "../../db";
import type {
  GoalsStackParamList,
  TimelineJourneyScreenProps,
} from "../../navigation/types";
import type { StepStatus as UIStepStatus } from "../../types/steps";
import type { EvidenceItemData } from "../../components/EvidenceDrawer";
import { validateEvidenceType } from "../../types/evidence";
import { styles } from "./TimelineJourneyScreen.styles";

function TimelineContent({ goalId }: { goalId: string }) {
  const navigation = useNavigation<NavigationProp<GoalsStackParamList>>();
  const rows = useQuery(goalsQuery);
  const goal = rows.find((r) => r.id === goalId);
  const stepRows = useQuery(stepsByGoalQuery(goalId as GoalId));
  const goalEvidenceRows = useQuery(evidenceByGoalQuery(goalId as GoalId));

  // Build UI steps with status
  const firstPendingIndex = stepRows.findIndex(
    (r) => r.status !== StepStatus.completed,
  );
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

  // Query evidence per step
  const stepEvidenceData = useStepEvidence(goalId as GoalId, stepRows);

  // Enrich counts
  const stepsWithEvidence = uiSteps.map((step, i) => ({
    ...step,
    evidenceCount: stepEvidenceData[i]?.length ?? 0,
  }));

  // Goal evidence for FinishLine
  const goalEvidence: EvidenceItemData[] = goalEvidenceRows.map((row) => ({
    id: row.id,
    type: validateEvidenceType(row.type ?? "file"),
    label: row.description ?? row.type ?? "Evidence",
  }));

  const completedCount = stepRows.filter(
    (s) => s.status === StepStatus.completed,
  ).length;
  const progress = stepRows.length > 0 ? completedCount / stepRows.length : 0;

  if (!goal) {
    return (
      <View style={styles.centered}>
        <Text variant="body">Goal not found.</Text>
      </View>
    );
  }

  const handleBackToFocus = () => {
    navigation.navigate("FocusMode", { goalId });
  };

  const handleNodePress = (_stepIndex: number) => {
    navigation.navigate("FocusMode", { goalId });
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
            label="Back to Focus"
            onPress={handleBackToFocus}
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
            {completedCount} of {stepRows.length} steps completed
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
            />
          ))}
          <FinishLine goalEvidence={goalEvidence} />
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
        label: (ev.description ?? ev.type ?? "Evidence") as string,
      });
      grouped.set(ev.stepId, list);
    }
    return stepRows.map((s) => grouped.get(s.id) ?? []);
  }, [allStepEvidence, stepRows]);
}

export function TimelineJourneyScreen({ route }: TimelineJourneyScreenProps) {
  const navigation = useNavigation();
  const { theme } = useUnistyles();

  return (
    <SafeAreaView
      edges={["top"]}
      style={{ flex: 1, backgroundColor: theme.colors.accentYellow }}
    >
      <View style={styles.topBar}>
        <IconButton
          icon={
            <Text variant="body" style={styles.backIcon}>
              {"<"}
            </Text>
          }
          onPress={() => navigation.goBack()}
          accessibilityLabel="Go back"
          size="sm"
        />
        <Text variant="label">Timeline</Text>
        <View style={styles.spacer} />
      </View>
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <ErrorBoundary>
          <Suspense
            fallback={
              <ActivityIndicator style={styles.loadingIndicator} size="large" />
            }
          >
            <TimelineContent goalId={route.params.goalId} />
          </Suspense>
        </ErrorBoundary>
      </View>
    </SafeAreaView>
  );
}
