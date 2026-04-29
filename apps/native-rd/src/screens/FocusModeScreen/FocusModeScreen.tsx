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
import { Pencil } from "phosphor-react-native";
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
  evidenceByStepQuery,
  stepEvidenceByGoalQuery,
  completeStep,
  uncompleteStep,
  deleteEvidence,
  restoreEvidence,
  createEvidence,
  canCompleteStep,
  EvidenceType,
  StepStatus,
  TEXT_EVIDENCE_PREFIX,
} from "../../db";
import type { GoalId, StepId, EvidenceId } from "../../db";
import { useToast } from "../../components/Toast";
import type {
  GoalsStackParamList,
  FocusModeScreenProps as FocusModeNavProps,
  CaptureScreenName,
} from "../../navigation/types";
import {
  EVIDENCE_OPTIONS,
  validateEvidenceType,
  type EvidenceTypeValue,
  type QuickEvidenceType,
} from "../../types/evidence";
import type { StepStatus as UIStepStatus } from "../../types/steps";
import { deleteEvidenceFile } from "../../utils/evidenceCleanup";
import { Logger } from "../../shims/rd-logger";
import { KEYBOARD_AVOIDING_PROPS } from "../../utils/keyboard";
import { useEvidenceViewer } from "../../utils/evidenceViewers";
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

function getEvidenceTypeLabel(type: EvidenceTypeValue): string {
  return (
    EVIDENCE_OPTIONS.find((option) => option.type === type)?.shortLabel ??
    type.replace("_", " ")
  );
}

function FocusContent({ goalId }: { goalId: string }) {
  const navigation = useNavigation<NavigationProp<GoalsStackParamList>>();
  const { showToast, hideToast } = useToast();
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
  const hasAnnouncedComplete = useRef(false);
  const hasTriggeredCompletion = useRef(false);
  const isMounted = useRef(true);
  const pendingFileDeletionRef = useRef<{
    id: string;
    uri: string | null;
    type: string | null;
    timer: ReturnType<typeof setTimeout>;
  } | null>(null);

  useEffect(() => {
    return () => {
      isMounted.current = false;
      if (pendingFileDeletionRef.current) {
        clearTimeout(pendingFileDeletionRef.current.timer);
      }
    };
  }, []);

  const isGoalCard = currentCardIndex >= stepRows.length;

  // Derive UI step status: current step is 'in-progress', others are mapped from DB
  const uiSteps = useMemo(
    () =>
      stepRows.map((row, index) => ({
        id: row.id,
        title: row.title ?? "",
        status:
          row.status === StepStatus.completed
            ? ("completed" as UIStepStatus)
            : index === currentCardIndex
              ? ("in-progress" as UIStepStatus)
              : ("pending" as UIStepStatus),
        evidenceCount: 0, // Will be enriched below
      })),
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
    () => stepsWithEvidence.map((s) => ({ status: s.status })),
    [stepsWithEvidence],
  );
  const dotSteps = useMemo<ProgressDotsStep[]>(
    () => stepsWithEvidence.map((s) => ({ status: s.status })),
    [stepsWithEvidence],
  );

  // Current evidence for the drawer
  const currentStepId = isGoalCard ? null : stepRows[currentCardIndex]?.id;
  const currentStepEvidenceRows = useQuery(
    currentStepId
      ? evidenceByStepQuery(currentStepId as StepId)
      : evidenceByGoalQuery(goalId as GoalId),
  );

  const drawerEvidence: EvidenceItemData[] = (
    isGoalCard ? goalEvidenceRows : currentStepEvidenceRows
  ).map((row) => ({
    id: row.id,
    type: validateEvidenceType(row.type ?? "file"),
    label: row.description ?? row.type ?? "Evidence",
  }));

  const goalEvidenceCount = goalEvidenceRows.length;

  const allStepsComplete =
    stepRows.length > 0 &&
    stepRows.every((s) => s.status === StepStatus.completed);

  // Announce when all steps become complete and auto-navigate to completion flow
  useEffect(() => {
    if (!goal) return;
    if (allStepsComplete && !hasAnnouncedComplete.current) {
      hasAnnouncedComplete.current = true;
      AccessibilityInfo.announceForAccessibility(
        `All steps completed for "${goal.title}". Goal is ready to complete!`,
      );

      // Auto-navigate to completion flow after brief delay
      if (!hasTriggeredCompletion.current) {
        hasTriggeredCompletion.current = true;
        const timer = setTimeout(() => {
          if (isMounted.current) {
            navigation.navigate("CompletionFlow", { goalId });
          }
        }, 400);
        return () => clearTimeout(timer);
      }
    } else if (!allStepsComplete) {
      hasAnnouncedComplete.current = false;
      hasTriggeredCompletion.current = false;
    }
  }, [goal, allStepsComplete, goalId, navigation]);

  const handleUndoDelete = useCallback(() => {
    const pending = pendingFileDeletionRef.current;
    if (!pending) return;
    clearTimeout(pending.timer);
    try {
      restoreEvidence(pending.id as EvidenceId);
    } catch (error) {
      console.error("[FocusModeScreen] Failed to restore evidence", {
        evidenceId: pending.id,
        error,
      });
    }
    pendingFileDeletionRef.current = null;
    hideToast();
  }, [hideToast]);

  if (!goal) {
    return (
      <View style={styles.centered}>
        <Text variant="body">Goal not found.</Text>
      </View>
    );
  }

  // --- Event Handlers ---

  const handleIndexChange = (index: number) => {
    setCurrentCardIndex(index);
    if (isDrawerOpen) setIsDrawerOpen(false);
    if (isFABMenuOpen) setIsFABMenuOpen(false);
  };

  const handleToggleStep = (stepId: string) => {
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
          `Step "${step.title}" marked as incomplete`,
        );
      } else {
        const stepEvidence = allStepEvidenceRows
          .filter((e) => e.stepId === stepId)
          .map((e) => ({ type: (e.type as string | null) ?? null }));
        const plannedTypes =
          (step.plannedEvidenceTypes as string | null) ?? null;

        if (!canCompleteStep(plannedTypes, stepEvidence)) {
          showToast({
            message: "Add evidence before completing this step",
            duration: 3000,
          });
          return;
        }

        completeStep(stepId as StepId, plannedTypes, stepEvidence);
        AccessibilityInfo.announceForAccessibility(
          `Step "${step.title}" completed`,
        );
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again.";
      console.error("[FocusModeScreen] Failed to toggle step completion", {
        stepId,
        error,
      });
      showToast({
        message: `Could not update step: ${message}`,
        duration: 3000,
      });
    }
  };

  const handleQuickNote = (stepId: string, text: string) => {
    try {
      createEvidence({
        stepId: stepId as StepId,
        type: EvidenceType.text,
        uri: TEXT_EVIDENCE_PREFIX + text,
        description: text.length > 50 ? text.slice(0, 50) + "..." : text,
      });
    } catch (error) {
      logger.error("Failed to create quick note", { stepId, error });
      showToast({ message: "Could not save note", duration: 3000 });
    }
  };

  const handleEvidenceTap = () => {
    setIsDrawerOpen(true);
  };

  const handleToggleDrawer = () => {
    setIsDrawerOpen((prev) => !prev);
  };

  const handleToggleFABMenu = () => {
    setIsFABMenuOpen((prev) => !prev);
    if (!isDrawerOpen) setIsDrawerOpen(true);
  };

  const handleQuickNoteFocus = () => {
    if (isDrawerOpen) setIsDrawerOpen(false);
    if (isFABMenuOpen) setIsFABMenuOpen(false);
  };

  const handleSelectEvidenceType = (type: EvidenceTypeValue) => {
    setIsFABMenuOpen(false);
    const routeName = EVIDENCE_ROUTE_MAP[type];
    if (!routeName) {
      logger.error("No capture route mapped for evidence type", { type });
      const label = getEvidenceTypeLabel(type);
      showToast({
        message: `Could not open ${label} capture screen`,
        duration: 3000,
      });
      return;
    }

    navigation.navigate(routeName, {
      goalId,
      stepId: isGoalCard ? undefined : stepRows[currentCardIndex]?.id,
    });
  };

  const handleQuickEvidence = (stepId: string, type: QuickEvidenceType) => {
    setIsFABMenuOpen(false);
    const routeName = EVIDENCE_ROUTE_MAP[type];
    if (!routeName) {
      logger.error("No capture route mapped for evidence type", { type });
      const label = getEvidenceTypeLabel(type);
      showToast({
        message: `Could not open ${label} capture screen`,
        duration: 3000,
      });
      return;
    }

    navigation.navigate(routeName, {
      goalId,
      stepId,
    });
  };

  const handleRequestDeleteEvidence = (id: string) => {
    setPendingDeleteId(id);
  };

  const handleConfirmDeleteEvidence = () => {
    if (!pendingDeleteId) return;
    const id = pendingDeleteId;
    setPendingDeleteId(null);
    const row =
      currentStepEvidenceRows.find((r) => r.id === id) ??
      goalEvidenceRows.find((r) => r.id === id);
    try {
      deleteEvidence(id as EvidenceId);

      // Delay file deletion — allow undo via toast
      const timer = setTimeout(() => {
        if (row?.uri && row.type) {
          deleteEvidenceFile(row.uri, row.type);
        }
        pendingFileDeletionRef.current = null;
      }, 5000);

      pendingFileDeletionRef.current = {
        id,
        uri: row?.uri ?? null,
        type: row?.type ?? null,
        timer,
      };

      showToast({
        message: "Evidence deleted",
        action: { label: "Undo", onPress: handleUndoDelete },
        duration: 5000,
      });
    } catch (error) {
      console.error("[FocusModeScreen] Failed to delete evidence", {
        evidenceId: id,
        error,
      });
      Alert.alert(
        "Could not delete evidence",
        "Something went wrong. Please try again.",
      );
    }
  };

  const handleViewEvidence = (id: string) => {
    const row =
      currentStepEvidenceRows.find((r) => r.id === id) ??
      goalEvidenceRows.find((r) => r.id === id);
    if (!row) return;
    viewEvidence({
      id: row.id,
      title: row.description ?? row.type ?? "Evidence",
      type: validateEvidenceType(row.type ?? "file"),
      uri: row.uri ?? undefined,
      metadata: row.metadata ?? undefined,
    });
  };

  const handleTimelineTap = () => {
    navigation.navigate("TimelineJourney", { goalId });
  };

  const handleEditPress = () => {
    navigation.navigate("EditMode", { goalId, cameFromFocus: true });
  };

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
        <IconButton
          icon={<Pencil size={20} weight="bold" />}
          onPress={handleEditPress}
          tone="ghost"
          accessibilityLabel="Edit goal"
          size="sm"
        />
      </View>

      {/* MiniTimeline */}
      <MiniTimeline
        steps={timelineSteps}
        currentIndex={currentCardIndex}
        onStepTap={handleIndexChange}
        onTimelineTap={handleTimelineTap}
      />

      {/* CardCarousel with ProgressDots as indicator */}
      <View style={styles.carouselSection}>
        <CardCarousel
          currentIndex={currentCardIndex}
          onIndexChange={handleIndexChange}
          accessibilityLabel={`Focus mode cards, ${stepRows.length} steps`}
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
                }}
                stepIndex={index}
                totalSteps={stepRows.length}
                onToggleComplete={() => handleToggleStep(step.id)}
                onEvidenceTap={handleEvidenceTap}
                onQuickNote={(text) => handleQuickNote(step.id, text)}
                onQuickNoteFocus={handleQuickNoteFocus}
                onQuickEvidence={(type) => handleQuickEvidence(step.id, type)}
              />
            )),
            <GoalEvidenceCard
              key="goal-evidence"
              evidenceCount={goalEvidenceCount}
              onEvidenceTap={handleEvidenceTap}
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
        title="Delete evidence?"
        message="You can undo this briefly after deleting."
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

  return (
    <View style={styles.screen}>
      <ScreenSubHeader label="Focus Mode" onBack={() => navigation.goBack()} />
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
