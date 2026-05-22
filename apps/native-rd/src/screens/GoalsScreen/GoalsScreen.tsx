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
  isPendingStep,
  GoalStatus,
  StepStatus,
} from "../../db";
import { GoalsStackParamList } from "../../navigation/types";
import { styles } from "./GoalsScreen.styles";

const logger = new Logger("GoalsScreen");

type GoalRow = typeof activeGoalsQuery.Row;
type StepRow = typeof stepsForActiveGoalsQuery.Row;
type Nav = NativeStackNavigationProp<GoalsStackParamList>;

function buildGoalCardGoal(
  goalRow: GoalRow,
  steps: readonly StepRow[],
): GoalCardGoal {
  const stepsCompleted = steps.filter(
    (s) => s.status === StepStatus.completed,
  ).length;
  return {
    id: goalRow.id,
    title: goalRow.title ?? "",
    status: goalRow.status === GoalStatus.completed ? "completed" : "active",
    stepsTotal: steps.length,
    stepsCompleted,
    nextStepTitle: steps.find(isPendingStep)?.title ?? null,
  };
}

function GoalList() {
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
        title={t("emptyState.title")}
        body={t("emptyState.body")}
        action={{
          label: t("emptyState.cta"),
          onPress: () => navigation.navigate("NewGoal"),
        }}
      />
    );
  }

  return (
    <>
      <FlatList
        data={rows}
        scrollEnabled={false}
        keyExtractor={(item) => item.id}
        style={{ overflow: "visible" }}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <GoalCard
            goal={buildGoalCardGoal(item, stepsByGoalId.get(item.id) ?? [])}
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
        title={t("confirmDelete.title")}
        message={t("confirmDelete.message", {
          title: deleteTarget?.title ?? "",
        })}
      />
    </>
  );
}

export function GoalsScreen() {
  const { t } = useTranslation("goals");
  const tabInset = useTabScreenContentInset();

  return (
    <View style={styles.screen}>
      <ScreenHeader title={t("header.title")} />
      <View style={[styles.scrollContent, tabInset]}>
        <ErrorBoundary>
          <Suspense
            fallback={
              <ActivityIndicator style={styles.loadingIndicator} size="large" />
            }
          >
            <GoalList />
          </Suspense>
        </ErrorBoundary>
      </View>
    </View>
  );
}
