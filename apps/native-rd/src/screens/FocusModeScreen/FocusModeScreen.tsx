import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  View,
  ActivityIndicator,
  AccessibilityInfo,
  Alert,
  KeyboardAvoidingView,
} from "react-native";
import { ScreenSubHeader } from "../../components/ScreenHeader";
import { useNavigation, type NavigationProp } from "@react-navigation/native";
import { useQuery } from "@evolu/react";
import { Pencil, Eye, EyeSlash } from "phosphor-react-native";
import { useTranslation } from "react-i18next";
import { Text } from "../../components/Text";
import { ErrorBoundary } from "../../components/ErrorBoundary";
import { IconButton } from "../../components/IconButton";
import { CardCarousel } from "../../components/CardCarousel";
import {
  MiniTimeline,
  type MiniTimelineStep,
} from "../../components/MiniTimeline";
import {
  ProgressDots,
  type ProgressDotsStep,
} from "../../components/ProgressDots";
import { StepCard, type StepCardStatus } from "../../components/StepCard";
import { GoalEvidenceCard } from "../../components/GoalEvidenceCard";
import {
  EvidenceDrawer,
  type EvidenceItemData,
} from "../../components/EvidenceDrawer";
import { ModeIndicator } from "../../components/ModeIndicator";
import { parsePlannedEvidenceTypes } from "../../utils/parsePlannedEvidenceTypes";
import { ConfirmDeleteModal } from "../ConfirmDeleteModal";
import {
  goalsQuery,
  stepsByGoalQuery,
  evidenceByGoalQuery,
  stepEvidenceByGoalQuery,
  completeStep,
  uncompleteStep,
  deleteEvidence,
  canCompleteStep,
  isPendingStep,
  EvidenceType,
  StepStatus,
} from "../../db";
import type { GoalId, StepId, EvidenceId } from "../../db";
import { useToast } from "../../components/Toast";
import type {
  GoalsStackParamList,
  FocusModeScreenProps as FocusModeNavProps,
  CaptureScreenName,
} from "../../navigation/types";
import {
  validateEvidenceType,
  type EvidenceTypeValue,
  type QuickEvidenceType,
} from "../../types/evidence";
import { evidenceShortLabel } from "../../i18n/labels";
import type { StepStatus as UIStepStatus } from "../../types/steps";
import { deleteEvidenceFile } from "../../utils/evidenceCleanup";
import { Logger } from "../../shims/rd-logger";
import { reportError, breadcrumb } from "../../services/sentry-report";
import { KEYBOARD_AVOIDING_PROPS } from "../../utils/keyboard";
import { useEvidenceViewer } from "../../utils/evidenceViewers";
import { useFocusModePrefs } from "../../hooks/useFocusModePrefs";
import { styles } from "./FocusModeScreen.styles";

const logger = new Logger("FocusModeScreen");

const EVIDENCE_ROUTE_MAP: Partial<
  Record<EvidenceTypeValue, CaptureScreenName>
> = {
  [EvidenceType.photo]: "CapturePhoto",
  [EvidenceType.video]: "CaptureVideo",
  [EvidenceType.voice_memo]: "CaptureVoiceMemo",
  [EvidenceType.text]: "CaptureTextNote",
  [EvidenceType.link]: "CaptureLink",
  [EvidenceType.file]: "CaptureFile",
};

/**
 * Index (into the flat `stepRows`) of the first pending *leaf* to snap to on
 * mount (#292). Mirrors the goal card's resolution: walk top-level steps in
 * order and, for the first non-completed one, return the first pending child
 * (a leaf) — or the parent itself when it is flat or in the invite state (all
 * children done, parent still pending). Returns -1 when nothing is pending.
 *
 * This skips a parent whose children are still pending so the carousel lands on
 * the actionable leaf, not the container.
 */
function findFirstPendingLeafIndex(
  rows: readonly {
    id: string;
    parentStepId: string | null;
    status: string | null;
  }[],
): number {
  const childrenByParent = new Map<
    string,
    { index: number; status: string | null }[]
  >();
  const topLevel: { id: string; index: number; status: string | null }[] = [];
  rows.forEach((row, index) => {
    if (row.parentStepId != null) {
      const entry = { index, status: row.status };
      const list = childrenByParent.get(row.parentStepId);
      if (list) list.push(entry);
      else childrenByParent.set(row.parentStepId, [entry]);
    } else {
      topLevel.push({ id: row.id, index, status: row.status });
    }
  });

  for (const step of topLevel) {
    if (step.status === StepStatus.completed) continue;
    const children = childrenByParent.get(step.id) ?? [];
    if (children.length === 0) return step.index; // flat
    const pendingChild = children.find(
      (c) => c.status !== StepStatus.completed,
    );
    return pendingChild ? pendingChild.index : step.index; // leaf, else invite
  }
  return -1;
}

function FocusContent({ goalId }: { goalId: string }) {
  const { t } = useTranslation(["focusMode", "common"]);
  const navigation = useNavigation<NavigationProp<GoalsStackParamList>>();
  const { showToast } = useToast();
  const rows = useQuery(goalsQuery);
  const goal = rows.find((r) => r.id === goalId);
  const stepRows = useQuery(stepsByGoalQuery(goalId as GoalId));
  const goalEvidenceRows = useQuery(evidenceByGoalQuery(goalId as GoalId));

  const allStepEvidenceRows = useQuery(
    stepEvidenceByGoalQuery(goalId as GoalId),
  );

  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isFABMenuOpen, setIsFABMenuOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const { viewEvidence, viewerModals } = useEvidenceViewer();
  const { timelineHidden, setTimelineHidden } = useFocusModePrefs();
  const lifecycle = useRef({
    snappedToFirstPending: false,
    snappedToGoalCard: false,
    // Reopen Goal lands FocusMode with steps already completed; without this
    // guard, the snap-to-goal effect fires on mount instead of only on a
    // genuine pending → complete transition.
    sawIncomplete: false,
  });
  useEffect(() => {
    breadcrumb({ category: "focus", message: "enter" });
    return () => {
      breadcrumb({ category: "focus", message: "exit" });
    };
  }, []);

  const isGoalCard = currentCardIndex >= stepRows.length;

  // Derive UI step status: current step is 'in-progress', others are mapped from DB
  const uiSteps = useMemo(
    () =>
      stepRows.map((row, index) => {
        // `stepsByGoalQuery` uses selectAll, so parentStepId is present. A
        // non-null parentStepId marks a sub-step (#292); resolve its parent's
        // title for the StepCard / MiniTimeline context line.
        const isChild = row.parentStepId != null;
        return {
          id: row.id,
          title: row.title ?? "",
          status:
            row.status === StepStatus.completed
              ? ("completed" as UIStepStatus)
              : index === currentCardIndex
                ? ("in-progress" as UIStepStatus)
                : ("pending" as UIStepStatus),
          evidenceCount: 0, // Will be enriched below
          isChild,
          parentTitle: isChild
            ? (stepRows.find((r) => r.id === row.parentStepId)?.title ?? null)
            : null,
        };
      }),
    [stepRows, currentCardIndex],
  );

  // Evidence counts per step (reuses allStepEvidenceRows to avoid duplicate query)
  const stepEvidenceCounts = useStepEvidenceCounts(
    allStepEvidenceRows,
    stepRows,
  );

  // Enrich step evidence counts and evidence type info
  const stepsWithEvidence = useMemo(
    () =>
      uiSteps.map((step, i) => {
        const stepEvidence = allStepEvidenceRows.filter(
          (e) => e.stepId === step.id,
        );
        const capturedTypes = [
          ...new Set(
            stepEvidence.map((e) => e.type).filter(Boolean) as string[],
          ),
        ];
        const rawPlanned = stepRows[i]?.plannedEvidenceTypes as string | null;
        const plannedTypes = parsePlannedEvidenceTypes(rawPlanned);
        if (rawPlanned != null && plannedTypes == null) {
          console.warn(
            "[FocusModeScreen] Failed to parse plannedEvidenceTypes",
            {
              stepId: step.id,
              plannedEvidenceTypes: rawPlanned,
            },
          );
        }
        return {
          ...step,
          evidenceCount: stepEvidenceCounts[i] ?? 0,
          plannedEvidenceTypes: plannedTypes,
          capturedEvidenceTypes: capturedTypes,
        };
      }),
    [uiSteps, stepRows, allStepEvidenceRows, stepEvidenceCounts],
  );

  // Timeline + dot steps (memoized to prevent child re-renders on unrelated state changes)
  const timelineSteps = useMemo<MiniTimelineStep[]>(
    () =>
      stepsWithEvidence.map((s) => ({ status: s.status, isChild: s.isChild })),
    [stepsWithEvidence],
  );
  const dotSteps = useMemo<ProgressDotsStep[]>(
    () => stepsWithEvidence.map((s) => ({ status: s.status })),
    [stepsWithEvidence],
  );

  // Current evidence for the drawer
  const currentStepId = isGoalCard ? null : stepRows[currentCardIndex]?.id;
  const currentStepEvidenceRows = useMemo(
    () =>
      currentStepId
        ? allStepEvidenceRows.filter((row) => row.stepId === currentStepId)
        : [],
    [allStepEvidenceRows, currentStepId],
  );

  const evidenceFallbackLabel = t("focusMode:evidenceFallback");
  const drawerEvidence: EvidenceItemData[] = (
    isGoalCard ? goalEvidenceRows : currentStepEvidenceRows
  ).map((row) => ({
    id: row.id,
    type: validateEvidenceType(row.type ?? "file"),
    label: row.description ?? row.type ?? evidenceFallbackLabel,
  }));

  const goalEvidenceCount = goalEvidenceRows.length;

  const allStepsComplete =
    stepRows.length > 0 &&
    stepRows.every((s) => s.status === StepStatus.completed);

  // Stepless goals are tappable from mount; stepped goals gate on all-complete.
  const canMarkComplete = stepRows.length === 0 || allStepsComplete;

  // Snap to first pending step on initial load. Dep is stepRows.length —
  // useQuery returns a fresh array each emission, so depending on stepRows
  // would re-fire pointlessly.
  const stepRowsLength = stepRows.length;
  useEffect(() => {
    if (lifecycle.current.snappedToFirstPending) return;
    if (stepRowsLength === 0) return;
    lifecycle.current.snappedToFirstPending = true;
    const firstPendingIndex = findFirstPendingLeafIndex(stepRows);
    if (firstPendingIndex > 0) {
      setCurrentCardIndex(firstPendingIndex);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only fire on initial population
  }, [stepRowsLength]);

  // On the pending → complete transition, snap to the goal card so the
  // user sees the Mark Complete affordance without scrolling.
  const goalTitleForAnnouncement = goal?.title as string | undefined;
  useEffect(() => {
    if (!goalTitleForAnnouncement) return;
    if (!allStepsComplete) {
      lifecycle.current.sawIncomplete = true;
      return;
    }
    if (!lifecycle.current.sawIncomplete) return;
    if (lifecycle.current.snappedToGoalCard) return;
    lifecycle.current.snappedToGoalCard = true;
    setCurrentCardIndex(stepRowsLength);
    AccessibilityInfo.announceForAccessibility(
      t("focusMode:a11y.allStepsComplete", {
        title: goalTitleForAnnouncement,
      }),
    );
  }, [goalTitleForAnnouncement, allStepsComplete, stepRowsLength, t]);

  // --- Event Handlers ---

  const handleIndexChange = useCallback((index: number) => {
    setCurrentCardIndex(index);
    setIsDrawerOpen(false);
    setIsFABMenuOpen(false);
  }, []);

  const handleMarkComplete = useCallback(() => {
    navigation.navigate("CompletionFlow", { goalId });
  }, [goalId, navigation]);

  const handleBadgePress = useCallback(() => {
    navigation.navigate("BadgeDesigner", {
      mode: "new-goal",
      goalId,
      returnVia: "back",
    });
  }, [goalId, navigation]);

  const handleToggleStep = useCallback(
    (stepId: string) => {
      const step = stepRows.find((s) => s.id === stepId);
      if (!step) {
        console.warn(
          `[FocusModeScreen] handleToggleStep: step not found for id "${stepId}"`,
        );
        return;
      }

      try {
        if (step.status === StepStatus.completed) {
          uncompleteStep(stepId as StepId);
          AccessibilityInfo.announceForAccessibility(
            t("focusMode:a11y.stepUncompleted", { title: step.title }),
          );
        } else {
          const stepEvidence = allStepEvidenceRows
            .filter((e) => e.stepId === stepId)
            .map((e) => ({ type: (e.type as string | null) ?? null }));
          const plannedTypes =
            (step.plannedEvidenceTypes as string | null) ?? null;

          if (!canCompleteStep(plannedTypes, stepEvidence)) {
            showToast({
              message: t("focusMode:toast.evidenceRequired"),
              duration: 3000,
            });
            return;
          }

          completeStep(stepId as StepId, plannedTypes, stepEvidence);
          AccessibilityInfo.announceForAccessibility(
            t("focusMode:a11y.stepCompleted", { title: step.title }),
          );
          // Advance past the just-completed step to the next pending one.
          // stepRows is the pre-completion snapshot, so skip stepId explicitly.
          // Forward first, then wrap; if nothing remains pending, the
          // all-steps-complete effect navigates to CompletionFlow.
          const isOtherPending = (s: (typeof stepRows)[number]): boolean =>
            s.id !== stepId && isPendingStep(s);
          const completedIndex = stepRows.findIndex((s) => s.id === stepId);
          const forwardIndex = stepRows.findIndex(
            (s, i) => i > completedIndex && isOtherPending(s),
          );
          const nextIndex =
            forwardIndex !== -1
              ? forwardIndex
              : stepRows.findIndex(isOtherPending);
          if (nextIndex !== -1) {
            // Use handleIndexChange (not setCurrentCardIndex) so the evidence
            // drawer / FAB menu close — otherwise an open overlay would persist
            // over the new step's content.
            handleIndexChange(nextIndex);
          }
        }
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : t("focusMode:errors.somethingWrong");
        console.error("[FocusModeScreen] Failed to toggle step completion", {
          stepId,
          error,
        });
        reportError(error, { area: "focus.mode", kind: "step-toggle" });
        showToast({
          message: t("focusMode:errors.couldNotUpdateStep", { message }),
          duration: 3000,
        });
      }
    },
    [allStepEvidenceRows, handleIndexChange, showToast, stepRows, t],
  );

  const handleEvidenceTap = useCallback(() => {
    setIsDrawerOpen(true);
  }, []);

  const handleToggleDrawer = useCallback(() => {
    setIsDrawerOpen((prev) => !prev);
  }, []);

  const handleToggleFABMenu = useCallback(() => {
    setIsFABMenuOpen((prev) => !prev);
    if (!isDrawerOpen) setIsDrawerOpen(true);
  }, [isDrawerOpen]);

  const handleSelectEvidenceType = useCallback(
    (type: EvidenceTypeValue) => {
      setIsFABMenuOpen(false);
      const routeName = EVIDENCE_ROUTE_MAP[type];
      if (!routeName) {
        logger.error("No capture route mapped for evidence type", { type });
        const label = evidenceShortLabel(t, type);
        showToast({
          message: t("focusMode:errors.couldNotOpenCapture", { label }),
          duration: 3000,
        });
        return;
      }

      navigation.navigate(routeName, {
        goalId,
        stepId: isGoalCard ? undefined : stepRows[currentCardIndex]?.id,
      });
    },
    [currentCardIndex, goalId, isGoalCard, navigation, showToast, stepRows, t],
  );

  const handleQuickEvidence = useCallback(
    (stepId: string, type: QuickEvidenceType) => {
      setIsFABMenuOpen(false);
      const routeName = EVIDENCE_ROUTE_MAP[type];
      if (!routeName) {
        logger.error("No capture route mapped for evidence type", { type });
        const label = evidenceShortLabel(t, type);
        showToast({
          message: t("focusMode:errors.couldNotOpenCapture", { label }),
          duration: 3000,
        });
        return;
      }

      navigation.navigate(routeName, {
        goalId,
        stepId,
      });
    },
    [goalId, navigation, showToast, t],
  );

  const handleRequestDeleteEvidence = useCallback((id: string) => {
    setPendingDeleteId(id);
  }, []);

  const handleConfirmDeleteEvidence = useCallback(() => {
    if (!pendingDeleteId) return;
    const id = pendingDeleteId;
    setPendingDeleteId(null);
    const row =
      currentStepEvidenceRows.find((r) => r.id === id) ??
      goalEvidenceRows.find((r) => r.id === id);
    try {
      deleteEvidence(id as EvidenceId);

      // Soft-delete is committed on confirm; clean up the backing file
      // immediately. There is no undo, so there is nothing to defer.
      if (row?.uri && row.type) {
        deleteEvidenceFile(row.uri, row.type);
      }

      showToast({
        message: t("focusMode:toast.evidenceDeleted"),
        duration: 5000,
      });
    } catch (error) {
      console.error("[FocusModeScreen] Failed to delete evidence", {
        evidenceId: id,
        error,
      });
      reportError(error, { area: "focus.mode", kind: "evidence-delete" });
      Alert.alert(
        t("focusMode:errors.couldNotDeleteEvidenceTitle"),
        t("focusMode:errors.somethingWrong"),
      );
    }
  }, [
    currentStepEvidenceRows,
    goalEvidenceRows,
    pendingDeleteId,
    showToast,
    t,
  ]);

  const handleViewEvidence = useCallback(
    (id: string) => {
      const row =
        currentStepEvidenceRows.find((r) => r.id === id) ??
        goalEvidenceRows.find((r) => r.id === id);
      if (!row) return;
      viewEvidence({
        id: row.id,
        title: row.description ?? row.type ?? evidenceFallbackLabel,
        type: validateEvidenceType(row.type ?? "file"),
        uri: row.uri ?? undefined,
        metadata: row.metadata ?? undefined,
      });
    },
    [
      currentStepEvidenceRows,
      evidenceFallbackLabel,
      goalEvidenceRows,
      viewEvidence,
    ],
  );

  const handleTimelineTap = useCallback(() => {
    navigation.navigate("TimelineJourney", { goalId });
  }, [goalId, navigation]);

  const handleEditPress = useCallback(() => {
    navigation.navigate("EditMode", { goalId, cameFromFocus: true });
  }, [goalId, navigation]);

  if (!goal) {
    return (
      <View style={styles.centered}>
        <Text variant="body">{t("focusMode:errors.goalNotFound")}</Text>
      </View>
    );
  }

  // --- Render ---

  return (
    <View style={styles.content}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Text
          variant="title"
          style={styles.title}
          numberOfLines={2}
          accessible
          accessibilityRole="header"
        >
          {goal.title}
        </Text>
        {stepRows.length > 0 && (
          <IconButton
            icon={
              timelineHidden ? (
                <EyeSlash size={20} weight="bold" />
              ) : (
                <Eye size={20} weight="bold" />
              )
            }
            onPress={() => setTimelineHidden(!timelineHidden)}
            tone="ghost"
            accessibilityLabel={
              timelineHidden
                ? t("focusMode:header.showTimeline")
                : t("focusMode:header.hideTimeline")
            }
            size="sm"
          />
        )}
        <IconButton
          icon={<Pencil size={20} weight="bold" />}
          onPress={handleEditPress}
          tone="ghost"
          accessibilityLabel={t("focusMode:header.editGoal")}
          size="sm"
        />
      </View>

      {!timelineHidden && stepRows.length > 0 && (
        <MiniTimeline
          steps={timelineSteps}
          currentIndex={currentCardIndex}
          onStepTap={handleIndexChange}
          onTimelineTap={handleTimelineTap}
          accessibilityLabel={t("common:timeline.a11y.label")}
        />
      )}

      {/* CardCarousel with ProgressDots as indicator */}
      <View style={styles.carouselSection}>
        <CardCarousel
          currentIndex={currentCardIndex}
          onIndexChange={handleIndexChange}
          accessibilityLabel={t("focusMode:a11y.carousel", {
            count: stepRows.length,
          })}
          renderIndicator={() => (
            <ProgressDots
              steps={dotSteps}
              currentIndex={currentCardIndex}
              onDotTap={handleIndexChange}
              showGoalDot
            />
          )}
        >
          {[
            ...stepsWithEvidence.map((step, index) => (
              <StepCard
                key={step.id}
                step={{
                  id: step.id,
                  title: step.title,
                  status: step.status as StepCardStatus,
                  evidenceCount: step.evidenceCount,
                  plannedEvidenceTypes: step.plannedEvidenceTypes,
                  capturedEvidenceTypes: step.capturedEvidenceTypes,
                  parentTitle: step.parentTitle,
                }}
                stepIndex={index}
                totalSteps={stepRows.length}
                onToggleComplete={handleToggleStep}
                onEvidenceTap={handleEvidenceTap}
                onQuickEvidence={handleQuickEvidence}
              />
            )),
            <GoalEvidenceCard
              key="goal-evidence"
              goalTitle={goal.title as string}
              goalDescription={(goal.description as string | null) ?? null}
              goalColor={(goal.color as string | null) ?? null}
              goalDesignJson={(goal.design as string | null) ?? null}
              onBadgePress={handleBadgePress}
              evidenceCount={goalEvidenceCount}
              onEvidenceTap={handleEvidenceTap}
              onMarkComplete={canMarkComplete ? handleMarkComplete : undefined}
            />,
          ]}
        </CardCarousel>
      </View>

      {/* EvidenceDrawer */}
      <EvidenceDrawer
        evidence={drawerEvidence}
        isGoal={isGoalCard}
        isOpen={isDrawerOpen}
        onToggle={handleToggleDrawer}
        onViewEvidence={handleViewEvidence}
        onDeleteEvidence={handleRequestDeleteEvidence}
        isFABMenuOpen={isFABMenuOpen}
        onAddEvidence={handleToggleFABMenu}
        onSelectEvidenceType={handleSelectEvidenceType}
      />

      {/* Confirm delete evidence modal */}
      <ConfirmDeleteModal
        visible={!!pendingDeleteId}
        title={t("focusMode:confirmDelete.title")}
        message={t("focusMode:confirmDelete.message")}
        onConfirm={handleConfirmDeleteEvidence}
        onCancel={() => setPendingDeleteId(null)}
      />

      {/* Evidence viewer modals */}
      {viewerModals}
    </View>
  );
}

/**
 * Hook to get evidence counts per step using a single joined query.
 * Avoids hooks-in-loop by fetching all step evidence for the goal at once,
 * then grouping counts client-side with useMemo.
 */
function useStepEvidenceCounts(
  allStepEvidence: readonly { stepId: string | null }[],
  stepRows: readonly { id: string }[],
): number[] {
  return useMemo(() => {
    const counts = new Map<string, number>();
    for (const ev of allStepEvidence) {
      if (ev.stepId) counts.set(ev.stepId, (counts.get(ev.stepId) ?? 0) + 1);
    }
    return stepRows.map((s) => counts.get(s.id) ?? 0);
  }, [allStepEvidence, stepRows]);
}

export function FocusModeScreen({ route }: FocusModeNavProps) {
  const navigation = useNavigation();
  const { t } = useTranslation(["focusMode"]);

  return (
    <View style={styles.screen}>
      <ScreenSubHeader
        label={t("focusMode:title")}
        onBack={() => navigation.goBack()}
      />
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        {...KEYBOARD_AVOIDING_PROPS}
      >
        <ErrorBoundary>
          <Suspense
            fallback={
              <ActivityIndicator style={styles.loadingIndicator} size="large" />
            }
          >
            <FocusContent goalId={route.params.goalId} />
          </Suspense>
        </ErrorBoundary>
        <ModeIndicator mode="focus" />
      </KeyboardAvoidingView>
    </View>
  );
}
