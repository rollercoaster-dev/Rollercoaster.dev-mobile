import React, { Suspense, useMemo, useState } from "react";
import { View, FlatList, ActivityIndicator } from "react-native";
import { useTranslation } from "react-i18next";
import { useNavigation } from "@react-navigation/native";
import { useTabScreenContentInset } from "../../navigation/useTabScreenContentInset";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery } from "@evolu/react";
import { ErrorBoundary } from "../../components/ErrorBoundary";
import { ScreenHeader } from "../../components/ScreenHeader";
import { GoalCard, type GoalCardGoal } from "../../components/GoalCard";
import { EmptyState } from "../../components/EmptyState";
import { ConfirmDeleteModal } from "../ConfirmDeleteModal";
import { Logger } from "../../shims/rd-logger";
import {
  activeGoalsQuery,
  stepsForActiveGoalsQuery,
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

  // Reconstruct the parent → children hierarchy by bucketing on parentStepId.
  // Flat query order is preserved within each bucket so "first pending" is
  // stable; it is not relied on for hierarchy (child ordinals are
  // sibling-scoped and can collide with top-level ordinals). A step counts as a
  // child only when its parent is a present top-level step — a null parent or an
  // orphan (parent soft-deleted) surfaces as top-level so its pending work stays
  // reachable, mirroring groupStepsByParent's orphan promotion (#292).
  const rootIds = new Set(
    steps.filter((s) => s.parentStepId == null).map((s) => s.id),
  );
  const childrenByParent = new Map<string, StepRow[]>();
  const topLevel: StepRow[] = [];
  for (const step of steps) {
    if (step.parentStepId != null && rootIds.has(step.parentStepId)) {
      const list = childrenByParent.get(step.parentStepId);
      if (list) list.push(step);
      else childrenByParent.set(step.parentStepId, [step]);
    } else {
      topLevel.push(step);
    }
  }

  // Resolve the single next-action line, mirroring the prototype's nextInfo():
  // the first non-completed top-level step is a flat step (hero = its title),
  // a pending leaf (hero = first pending child + "↳ in [parent]" context), or
  // the invite state (all children done, parent still pending — hero = parent
  // + "all N substeps done" readout, never a state change).
  let nextStepTitle: string | null = null;
  let nextStepContext: string | null = null;
  for (const step of topLevel) {
    if (step.status === StepStatus.completed) continue;
    const children = childrenByParent.get(step.id) ?? [];
    if (children.length === 0) {
      nextStepTitle = step.title ?? null;
    } else {
      const pendingChild = children.find(
        (c) => c.status !== StepStatus.completed,
      );
      if (pendingChild) {
        nextStepTitle = pendingChild.title ?? null;
        nextStepContext = t("goals:card.nextStepContext", {
          parent: step.title ?? "",
        });
      } else {
        nextStepTitle = step.title ?? null;
        nextStepContext = t("goals:card.allSubstepsDone", {
          count: children.length,
        });
      }
    }
    break;
  }

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

  return (
    <View style={styles.screen}>
      <ScreenHeader title={t("goals:title")} />
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
