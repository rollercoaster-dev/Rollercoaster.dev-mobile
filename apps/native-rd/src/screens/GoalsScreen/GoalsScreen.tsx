import React, { Suspense, useMemo, useState } from "react";
import { View, FlatList, ActivityIndicator } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery } from "@evolu/react";
import { Text } from "../../components/Text";
import { ErrorBoundary } from "../../components/ErrorBoundary";
import { IconButton } from "../../components/IconButton";
import { ScreenHeader } from "../../components/ScreenHeader";
import { GoalCard, type GoalCardGoal } from "../../components/GoalCard";
import { EmptyState } from "../../components/EmptyState";
import { ConfirmDeleteModal } from "../ConfirmDeleteModal";
import {
  goalsQuery,
  stepsByGoalQuery,
  deleteGoal,
  GoalStatus,
  StepStatus,
} from "../../db";
import type { GoalId } from "../../db";
import { GoalsStackParamList } from "../../navigation/types";
import { styles } from "./GoalsScreen.styles";

type GoalRow = typeof goalsQuery.Row;
type Nav = NativeStackNavigationProp<GoalsStackParamList>;

function GoalCardWithSteps({
  goalRow,
  onPress,
  onLongPress,
}: {
  goalRow: GoalRow;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const query = useMemo(
    () => stepsByGoalQuery(goalRow.id as GoalId),
    [goalRow.id],
  );
  const stepRows = useQuery(query);
  const stepsTotal = stepRows.length;
  const stepsCompleted = stepRows.filter(
    (s) => s.status === StepStatus.completed,
  ).length;

  const goal: GoalCardGoal = {
    id: goalRow.id,
    title: goalRow.title ?? "",
    status: goalRow.status === GoalStatus.completed ? "completed" : "active",
    stepsTotal,
    stepsCompleted,
  };

  return <GoalCard goal={goal} onPress={onPress} onLongPress={onLongPress} />;
}

function GoalList() {
  const navigation = useNavigation<Nav>();
  const rows = useQuery(goalsQuery);
  const [deleteTarget, setDeleteTarget] = useState<GoalRow | null>(null);

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
        title="No goals yet"
        body="Add your first learning goal to get started."
        action={{
          label: "Create Goal",
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
          <GoalCardWithSteps
            goalRow={item}
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
        title="Delete this goal?"
        message={
          deleteTarget
            ? `"${deleteTarget.title}" and all progress will be permanently deleted.`
            : ""
        }
      />
    </>
  );
}

export function GoalsScreen() {
  const navigation = useNavigation<Nav>();

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title="Goals"
        right={
          <IconButton
            icon={
              <Text variant="headline" style={styles.addIcon}>
                +
              </Text>
            }
            onPress={() => navigation.navigate("NewGoal")}
            accessibilityLabel="Create new goal"
            testID="create-new-goal"
          />
        }
      />
      <View style={styles.scrollContent}>
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
