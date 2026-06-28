import React, { Suspense, useMemo, useState } from "react";
import { View, ScrollView, ActivityIndicator } from "react-native";
import { useTranslation } from "react-i18next";
import { useNavigation } from "@react-navigation/native";
import { useTabScreenContentInset } from "../../navigation/useTabScreenContentInset";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery } from "@evolu/react";
import { ErrorBoundary } from "../../components/ErrorBoundary";
import { ScreenHeader } from "../../components/ScreenHeader";
import { Text } from "../../components/Text";
import { ConfirmDeleteModal } from "../ConfirmDeleteModal";
import { Logger } from "../../shims/rd-logger";
import {
  activeGoalsQuery,
  stepsForActiveGoalsQuery,
  resolveNextActionableStep,
  deleteGoal,
  StepStatus,
} from "../../db";
import { GoalsStackParamList } from "../../navigation/types";
import { GoalsCockpit, type CockpitHeroGoal } from "./GoalsCockpit";
import { styles } from "./GoalsScreen.styles";

const logger = new Logger("GoalsScreen");

type GoalRow = typeof activeGoalsQuery.Row;
type StepRow = typeof stepsForActiveGoalsQuery.Row;
type Nav = NativeStackNavigationProp<GoalsStackParamList>;

/**
 * Evolu stamps `createdAt`/`updatedAt` on every row as ISO-8601 DateIso
 * (branded) strings. Same-format UTC ISO strings sort chronologically by simple
 * lexical comparison, so the cockpit's recency ranking compares them as strings.
 */
function isoOrNull(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

/**
 * Recency key for a goal = the newest of its own `updatedAt` (falling back to
 * `createdAt`) and the `updatedAt` of any of its steps. "Most recently worked on
 * the goal or any of its steps" (#381 D2). Returns "" only if a row carries no
 * timestamps at all, which sorts it last.
 */
function goalActivityKey(goalRow: GoalRow, steps: readonly StepRow[]): string {
  let latest =
    isoOrNull(goalRow.updatedAt) ?? isoOrNull(goalRow.createdAt) ?? "";
  for (const step of steps) {
    const stepUpdated = isoOrNull(step.updatedAt);
    if (stepUpdated && stepUpdated > latest) latest = stepUpdated;
  }
  return latest;
}

function buildCockpitGoal(
  goalRow: GoalRow,
  steps: readonly StepRow[],
): CockpitHeroGoal {
  // Every-unit progress (#292 R1): parents and children are all rows in
  // `steps`, so counting every row is the every-unit rule with no filtering.
  const stepsCompleted = steps.filter(
    (s) => s.status === StepStatus.completed,
  ).length;
  const stepsTotal = steps.length;
  const progress = stepsTotal > 0 ? stepsCompleted / stepsTotal : 0;

  // Resolve the single next-action title via the shared resolver (#337), which
  // owns the leaf/invite/flat bucketing and orphan promotion. The cockpit hero
  // shows only the title — no "↳ in parent" / "all N substeps done" context
  // line (that detail lives in FocusMode, not on the home cockpit).
  const next = resolveNextActionableStep(steps);
  const nextStepTitle =
    next.kind === "none" ? null : (steps[next.index]?.title ?? null);

  return {
    id: goalRow.id,
    title: goalRow.title ?? "",
    nextStepTitle,
    progress,
    stepsCompleted,
    stepsTotal,
  };
}

function GoalsCockpitContainer({
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

  // Rank by latest activity so the hero is the most-recently-worked goal (D2).
  // `rows` arrive `createdAt DESC`; ties keep that order via the index tie-break
  // (an explicit stable sort, independent of the engine's sort stability).
  const ranked = useMemo(
    () =>
      rows
        .map((row, index) => ({
          row,
          index,
          activity: goalActivityKey(row, stepsByGoalId.get(row.id) ?? []),
        }))
        .sort((a, b) =>
          a.activity < b.activity
            ? 1
            : a.activity > b.activity
              ? -1
              : a.index - b.index,
        )
        .map((entry) => entry.row),
    [rows, stepsByGoalId],
  );

  const heroRow = ranked[0] ?? null;
  const hero: CockpitHeroGoal | null = heroRow
    ? buildCockpitGoal(heroRow, stepsByGoalId.get(heroRow.id) ?? [])
    : null;
  const keepWarm = ranked
    .slice(1)
    .map((row) => buildCockpitGoal(row, stepsByGoalId.get(row.id) ?? []));
  const goalCount = ranked.length;

  function confirmDelete() {
    if (deleteTarget) {
      deleteGoal(deleteTarget.id);
      setDeleteTarget(null);
    }
  }

  return (
    <>
      {/* "Today" framing + live goal count when goals exist; falls back to the
          plain "Goals" title when empty (prototype: Goals · Cockpit vs Empty). */}
      <ScreenHeader
        title={hero ? t("goals:todayTitle") : t("goals:title")}
        right={
          goalCount > 0 ? (
            <Text variant="mono" style={styles.headerCount}>
              {t("goals:goalCount", { count: goalCount })}
            </Text>
          ) : undefined
        }
      />
      <ScrollView contentContainerStyle={[styles.listContent, contentInset]}>
        <GoalsCockpit
          hero={hero}
          keepWarm={keepWarm}
          onStartResume={(goalId) =>
            navigation.navigate("FocusMode", { goalId })
          }
          onOpenGoal={(goalId) => navigation.navigate("FocusMode", { goalId })}
          onNewGoal={() => navigation.navigate("NewGoal")}
          onDeleteGoal={(goalId) =>
            setDeleteTarget(rows.find((r) => r.id === goalId) ?? null)
          }
        />
      </ScrollView>
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
  const tabInset = useTabScreenContentInset();

  return (
    <View style={styles.screen}>
      <ErrorBoundary>
        <Suspense
          fallback={
            <ActivityIndicator style={styles.loadingIndicator} size="large" />
          }
        >
          <GoalsCockpitContainer contentInset={tabInset} />
        </Suspense>
      </ErrorBoundary>
    </View>
  );
}
