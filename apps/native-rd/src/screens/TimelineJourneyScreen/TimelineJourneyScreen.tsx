import { Suspense, useCallback, useMemo } from "react";
import { View, ScrollView, ActivityIndicator } from "react-native";
import { useNavigation, type NavigationProp } from "@react-navigation/native";
import { useQuery } from "@evolu/react";
import { useTranslation } from "react-i18next";
import { Text } from "../../components/Text";
import { ErrorBoundary } from "../../components/ErrorBoundary";
import { Button } from "../../components/Button";
import { ScreenSubHeader } from "../../components/ScreenHeader";
import { TimelineBreakdownBar } from "../../components/TimelineBreakdownBar";
import type { StepStateMapKey } from "../../components/TimelineNode/stepStateColorMap";
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
  resolveNextActionableStep,
  resolveActionableIndex,
  resolveStepDependencyBand,
  StepStatus,
} from "../../db";
import { formatDate } from "../../utils/format";
import { parseBadgeDesign } from "../../badges/types";
import type { GoalId } from "../../db";
import type {
  GoalsStackParamList,
  RootTabParamList,
  TimelineJourneyScreenProps,
} from "../../navigation/types";
import type { StepStatus as UIStepStatus } from "../../types/steps";
import type { EvidenceItemData } from "../../types/evidence";
import { validateEvidenceType } from "../../types/evidence";
import { Logger } from "../../shims/rd-logger";
import { styles } from "./TimelineJourneyScreen.styles";

const logger = new Logger("TimelineJourneyScreen");

/**
 * Id of the leaf to highlight as the journey's single in-progress accent (#293).
 * Thin adapter over the shared {@link resolveNextActionableStep}, which Focus
 * Mode also resolves through (#337) — named here rather than whichever private
 * helper Focus Mode wraps it in, because that name has already changed twice.
 * The accent therefore lands on exactly the step FocusMode snaps to: a root's
 * first pending child
 * wins (a pending leaf stays reachable even under a manually-completed parent —
 * completion is per-step, not cascaded), otherwise a pending childless root is
 * itself current, as is the invite state (all children done, parent still open)
 * or the parked state (parent still open, all its remaining children set
 * aside — #536). Completed *and* paused steps are skipped, so a deliberately
 * set-aside step never takes the accent (#417). Returns null when nothing is
 * actionable.
 */
function findCurrentLeafId(
  rows: readonly {
    id: string;
    parentStepId: string | null;
    status: string | null;
  }[],
): string | null {
  const index = resolveActionableIndex(resolveNextActionableStep(rows));
  return index === null ? null : (rows[index]?.id ?? null);
}

function TimelineContent({
  goalId,
  originBadgeId,
}: {
  goalId: string;
  originBadgeId?: string;
}) {
  const navigation = useNavigation<NavigationProp<GoalsStackParamList>>();
  const { t, i18n } = useTranslation(["timelineJourney"]);
  const rows = useQuery(goalsQuery);
  const goal = rows.find((r) => r.id === goalId);
  const stepRows = useQuery(stepsByGoalQuery(goalId as GoalId));
  const goalEvidenceRows = useQuery(evidenceByGoalQuery(goalId as GoalId));

  const evidenceFallbackLabel = t("timelineJourney:evidenceFallbackLabel");

  // Group the flat rows into a one-level parent → children tree and resolve the
  // current leaf — the journey's single in-progress accent (#293). The resolver
  // reads the flat `(ordinal, createdAt)`-ordered rows, not the tree.
  const groupedSteps = useMemo(() => groupStepsByParent(stepRows), [stepRows]);
  const currentLeafId = useMemo(() => findCurrentLeafId(stepRows), [stepRows]);

  // Evidence keyed by step id — looked up for roots and children alike.
  const evidenceByStepId = useStepEvidence(
    goalId as GoalId,
    evidenceFallbackLabel,
  );

  // A node (root or child) is in-progress iff it is the current leaf; otherwise
  // completed/paused/pending from its own DB status. currentLeafId never points
  // at a completed or paused step, so the in-progress check is safe to take
  // first — and a set-aside step keeps its own `paused` color language (#417)
  // instead of masquerading as pending.
  const statusFor = (id: string, dbStatus: string | null): UIStepStatus =>
    id === currentLeafId
      ? "in-progress"
      : dbStatus === StepStatus.completed
        ? "completed"
        : dbStatus === StepStatus.paused
          ? "paused"
          : "pending";

  // One clock for the whole render pass (#571) — every step's "was expected"
  // reading is judged against the same instant, so two steps a millisecond
  // apart can't disagree about whether the same date has passed.
  const now = new Date();

  const stepsWithChildren = groupedSteps.map((root) => {
    const evidence = evidenceByStepId.get(root.id) ?? [];
    // C·B band (#454): the resolver hands back raw fields, so this caller owns
    // the date formatting (locale from the active UI language) and leaves each
    // prop undefined when its column is unset — MetadataBand then renders
    // nothing rather than a placeholder line. Roots only: sub-steps carry no
    // C/B band (#407 OQ-2), so `children` below deliberately omits these props.
    const band = resolveStepDependencyBand(root, stepRows, now);
    return {
      id: root.id,
      title: root.title ?? "",
      status: statusFor(root.id, root.status),
      evidenceCount: evidence.length,
      evidence,
      afterStep: band.afterStepTitle ?? undefined,
      waitingOn: band.waitingOnLabel
        ? {
            who: band.waitingOnLabel,
            expected: band.waitingOnExpectedAt
              ? formatDate(band.waitingOnExpectedAt, i18n.language)
              : undefined,
          }
        : undefined,
      dueDate: band.dueAt ? formatDate(band.dueAt, i18n.language) : undefined,
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

  // Every-unit honest breakdown (#451): stepRows already counts parents +
  // children, matching #292's goal-card rule (the journey counts each step,
  // parent or sub-step), so the four buckets always sum to stepRows.length.
  // Tallied here because TimelineBreakdownBar does no traversal of its own —
  // and tallied *through statusFor* so the bar's buckets can't drift from the
  // colors the nodes render (the in-progress accent counts as in-progress, a
  // set-aside step as paused rather than pending).
  const counts = stepRows.reduce<Record<StepStateMapKey, number>>(
    (tally, row) => {
      tally[statusFor(row.id, row.status)] += 1;
      return tally;
    },
    { completed: 0, "in-progress": 0, pending: 0, paused: 0 },
  );

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

  // The return leg (#467): Focus Mode lands on the *tapped* step rather than on
  // whatever `resolveNextActionableStep` would otherwise pick, so tapping a
  // done or set-aside node shows that step's own card.
  const handleNodePress = (stepId: string) => {
    navigation.navigate("FocusMode", { goalId, stepId });
  };

  const handleEvidencePress = (evidenceId: string) => {
    navigation.navigate("EvidenceViewer", {
      goalId,
      initialEvidenceId: evidenceId,
    });
  };

  const handleBadgePress = () => {
    navigation.navigate("CompletionFlow", { goalId });
  };

  const handleEditPress = () => {
    navigation.navigate("EditMode", { goalId });
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
          <View style={styles.headerActions}>
            <Button
              label={
                originBadgeId
                  ? t("timelineJourney:backToBadge")
                  : t("timelineJourney:backToFocus")
              }
              onPress={handleBack}
              variant="secondary"
              size="sm"
              // Label alternates between backToFocus and backToBadge depending
              // on where the screen was opened from, so flows address it by id.
              testID="timeline-back-button"
            />
            <Button
              label={t("timelineJourney:editButton")}
              onPress={handleEditPress}
              variant="secondary"
              size="sm"
              testID="timeline-edit-button"
            />
          </View>
        </View>
        {goal.description && (
          <Text style={styles.description} numberOfLines={3}>
            {goal.description}
          </Text>
        )}
        <View style={styles.breakdownContainer}>
          <TimelineBreakdownBar counts={counts} />
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
            onBadgePress={handleBadgePress}
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
