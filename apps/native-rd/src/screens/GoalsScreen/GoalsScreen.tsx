import React, { Suspense, useMemo, useState } from "react";
import { View, FlatList, ActivityIndicator } from "react-native";
import { useTranslation } from "react-i18next";
import { useNavigation } from "@react-navigation/native";
import { Plus } from "phosphor-react-native";
import { useTabScreenContentInset } from "../../navigation/useTabScreenContentInset";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery } from "@evolu/react";
import { ErrorBoundary } from "../../components/ErrorBoundary";
import { IconButton } from "../../components/IconButton";
import { ScreenHeader } from "../../components/ScreenHeader";
import { GoalCard, type GoalCardGoal } from "../../components/GoalCard";
import { EmptyState } from "../../components/EmptyState";
import { ConfirmDeleteModal } from "../ConfirmDeleteModal";
import { Logger } from "../../shims/rd-logger";
import {
  activeGoalsQuery,
  stepsForActiveGoalsQuery,
  resolveNextActionableStep,
  deleteGoal,
  GoalStatus,
  StepStatus,
} from "../../db";
import { GoalsStackParamList } from "../../navigation/types";
import type { TFunction } from "i18next";
import { styles } from "./GoalsScreen.styles";

const logger = new Logger("GoalsScreen");

type GoalRow = typeof activeGoalsQuery.Row;
type StepRow = typeof stepsForActiveGoalsQuery.Row;
type Nav = NativeStackNavigationProp<GoalsStackParamList>;
type GoalsT = TFunction<["goals", "common"]>;

function buildGoalCardGoal(
  goalRow: GoalRow,
  steps: readonly StepRow[],
  t: GoalsT,
): GoalCardGoal {
  // Every-unit progress (#292 R1): parents and children are all rows in
  // `steps`, so counting every row is the every-unit rule with no filtering.
  const stepsCompleted = steps.filter(
    (s) => s.status === StepStatus.completed,
  ).length;

  // Resolve the single next-action line via the shared resolver (#337), which
  // owns the leaf/invite/flat bucketing and orphan promotion (a soft-deleted
  // parent surfaces its child as top-level so its pending work stays reachable,
  // mirroring groupStepsByParent, #292). The resolver returns an index into
  // `steps`, so the per-goal slice maps the result straight back to titles:
  //   leaf   → the pending child is the hero, the container parent is context
  //   invite → the pending parent is the hero, "all N substeps done" is context
  //   flat   → a pending top-level step is its own hero (no context)
  // A pending leaf wins even under a manually completed parent — completion is
  // per-step, not cascaded, so a done parent must not hide live sub-work.
  const next = resolveNextActionableStep(steps);
  let nextStepTitle: string | null = null;
  let nextStepContext: string | null = null;
  if (next.kind === "leaf") {
    nextStepTitle = steps[next.index]?.title ?? null;
    nextStepContext = t("goals:card.nextStepContext", {
      parent: steps[next.parentIndex]?.title ?? "",
    });
  } else if (next.kind === "invite") {
    nextStepTitle = steps[next.index]?.title ?? null;
    nextStepContext = t("goals:card.allSubstepsDone", {
      count: next.childCount,
    });
  } else if (next.kind === "flat") {
    nextStepTitle = steps[next.index]?.title ?? null;
  }
  // kind === "none": no pending work, both lines stay null.

  return {
    id: goalRow.id,
    title: goalRow.title ?? "",
    status: goalRow.status === GoalStatus.completed ? "completed" : "active",
    stepsTotal: steps.length,
    stepsCompleted,
    nextStepTitle,
    nextStepContext,
  };
}

function GoalList({
  contentInset,
}: {
  contentInset: { paddingBottom: number };
}) {
  const { t } = useTranslation(["goals", "common"]);
  const navigation = useNavigation<Nav>();
  const rows = useQuery(activeGoalsQuery);
  const allSteps = useQuery(stepsForActiveGoalsQuery);
  const [deleteTarget, setDeleteTarget] = useState<GoalRow | null>(null);

  // Evolu's join surfaces goalId as nullable despite the schema; warn and
  // skip if it ever happens so a regression here doesn't silently drop a
  // goal's step data.
  const stepsByGoalId = useMemo(() => {
    const map = new Map<string, StepRow[]>();
    for (const step of allSteps) {
      if (!step.goalId) {
        logger.warn("Step row missing goalId in stepsForActiveGoalsQuery", {
          stepId: step.id,
        });
        continue;
      }
      const list = map.get(step.goalId);
      if (list) list.push(step);
      else map.set(step.goalId, [step]);
    }
    return map;
  }, [allSteps]);

  function handleDelete(row: GoalRow) {
    setDeleteTarget(row);
  }

  function confirmDelete() {
    if (deleteTarget) {
      deleteGoal(deleteTarget.id);
      setDeleteTarget(null);
    }
  }

  if (rows.length === 0) {
    return (
      <EmptyState
        title={t("goals:emptyState.title")}
        body={t("goals:emptyState.body")}
        action={{
          label: t("goals:emptyState.cta"),
          onPress: () => navigation.navigate("NewGoal"),
        }}
      />
    );
  }

  return (
    <>
      <FlatList
        data={rows}
        keyExtractor={(item) => item.id}
        style={styles.list}
        contentContainerStyle={[styles.listContent, contentInset]}
        renderItem={({ item }) => (
          <GoalCard
            goal={buildGoalCardGoal(item, stepsByGoalId.get(item.id) ?? [], t)}
            onPress={() =>
              navigation.navigate("FocusMode", { goalId: item.id })
            }
            onLongPress={() => handleDelete(item)}
          />
        )}
      />
      <ConfirmDeleteModal
        visible={deleteTarget !== null}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title={t("goals:confirmDelete.title")}
        message={
          deleteTarget
            ? t("goals:confirmDelete.message", { title: deleteTarget.title })
            : ""
        }
        confirmLabel={t("common:actions.delete")}
        cancelLabel={t("common:actions.cancel")}
      />
    </>
  );
}

export function GoalsScreen() {
  const { t } = useTranslation(["goals"]);
  const tabInset = useTabScreenContentInset();
  const navigation = useNavigation<Nav>();

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title={t("goals:title")}
        right={
          <IconButton
            icon={<Plus size={24} weight="bold" />}
            onPress={() => navigation.navigate("NewGoal")}
            accessibilityLabel={t("goals:actions.newGoal")}
            testID="goals-header-new-goal"
          />
        }
      />
      <ErrorBoundary>
        <Suspense
          fallback={
            <ActivityIndicator style={styles.loadingIndicator} size="large" />
          }
        >
          <GoalList contentInset={tabInset} />
        </Suspense>
      </ErrorBoundary>
    </View>
  );
}
