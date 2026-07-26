import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  ActivityIndicator,
  AccessibilityInfo,
  KeyboardAvoidingView,
} from "react-native";
import { ScreenSubHeader } from "../../components/ScreenHeader";
import { useNavigation, type NavigationProp } from "@react-navigation/native";
import { useQuery } from "@evolu/react";
import type { Result } from "@evolu/common";
import { Pencil } from "phosphor-react-native";
import { useTranslation } from "react-i18next";
import { Text } from "../../components/Text";
import { ErrorBoundary } from "../../components/ErrorBoundary";
import { IconButton } from "../../components/IconButton";
import {
  FocusCurrentTaskCard,
  type FocusCapturedEvidenceItem,
} from "../../components/FocusCurrentTaskCard";
import { FocusProgressStrip } from "../../components/FocusProgressStrip";
import { EvidenceTypePicker } from "../../components/EvidenceTypePicker";
import { AnimatedSheet } from "../../components/EvidenceTypePicker/AnimatedSheet";
import { resolvePlannedEvidenceTypes } from "../../utils/parsePlannedEvidenceTypes";
import {
  goalsQuery,
  stepsByGoalQuery,
  stepEvidenceByGoalQuery,
  completeStep,
  uncompleteStep,
  pauseStep,
  resumeStep,
  updateStep,
  canCompleteStep,
  groupStepsByParent,
  flattenGroupedSteps,
  resolveNextActionableStep,
  resolveStepDependencyBand,
  EvidenceType,
  StepStatus,
} from "../../db";
import type { GoalId, StepId } from "../../db";
import { useToast } from "../../components/Toast";
import type {
  GoalsStackParamList,
  FocusModeScreenProps as FocusModeNavProps,
  CaptureScreenName,
} from "../../navigation/types";
import {
  validateEvidenceType,
  type EvidenceTypeValue,
} from "../../types/evidence";
import { evidenceShortLabel } from "../../i18n/labels";
import { formatDate } from "../../utils/format";
import { Logger } from "../../shims/rd-logger";
import { reportError, breadcrumb } from "../../services/sentry-report";
import { KEYBOARD_AVOIDING_PROPS } from "../../utils/keyboard";
import { runEvoluMutation } from "../../utils/evoluMutation";
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

/** Minimal row shape the step-focused helpers below read. */
type StepRowLike = {
  id: string;
  parentStepId: string | null;
  status: string | null;
};

/**
 * Which step Focus Mode is "on".
 *
 * The actionable step per {@link resolveNextActionableStep} (leaf / invite /
 * flat, orphan-promotion included — #292/#337). When nothing is actionable the
 * goal is either fully set aside or fully done, and the resolver reports
 * `none` for both; fall back to the first paused step, then to the last step,
 * so the screen still shows that step's own card (paused → "Pick this back
 * up", completed → "Reopen") rather than nothing at all. The dedicated
 * all-paused and all-done *screens* are #467's (D10).
 */
function resolveFocusStepId(rows: readonly StepRowLike[]): string | null {
  const actionable = resolveNextActionableStep(rows);
  if (actionable.kind !== "none") return rows[actionable.index]?.id ?? null;
  const paused = rows.find((r) => r.status === StepStatus.paused);
  if (paused) return paused.id;
  return rows[rows.length - 1]?.id ?? null;
}

function FocusContent({ goalId }: { goalId: string }) {
  const { t, i18n } = useTranslation(["focusMode", "common"]);
  const navigation = useNavigation<NavigationProp<GoalsStackParamList>>();
  const { showToast } = useToast();
  const rows = useQuery(goalsQuery);
  const goal = rows.find((r) => r.id === goalId);
  const rawStepRows = useQuery(stepsByGoalQuery(goalId as GoalId));
  // Order rows parent-then-children (orphans promoted to top-level) so the
  // resolver sees the same sub-spine order EditModeScreen and the goal card do.
  // The raw query is `(ordinal, createdAt)`-ordered with sibling-scoped child
  // ordinals, which interleaves children among parents (#292).
  const stepRows = useMemo(
    () => flattenGroupedSteps(groupStepsByParent(rawStepRows)),
    [rawStepRows],
  );
  const allStepEvidenceRows = useQuery(
    stepEvidenceByGoalQuery(goalId as GoalId),
  );

  // The step this screen is focused on. Resolved when rows first arrive and
  // then held: completing or setting aside the current step re-renders *that
  // same step* in its new state rather than jumping to another one.
  // Auto-advance-on-complete is #467's (D1).
  const [currentStepId, setCurrentStepId] = useState<string | null>(null);
  // Authoring sheet: change which evidence types this step plans.
  const [isPlanSheetOpen, setIsPlanSheetOpen] = useState(false);
  // Capture sheet: pick a type to capture right now, with none pre-implied.
  const [isCaptureSheetOpen, setIsCaptureSheetOpen] = useState(false);

  useEffect(() => {
    breadcrumb({ category: "focus", message: "enter" });
    return () => {
      breadcrumb({ category: "focus", message: "exit" });
    };
  }, []);

  // Resolve on the first non-empty emission, and re-resolve only when the held
  // id is no longer in the rows — the screen can stay mounted while EditMode
  // deletes or reparents steps, and a dangling id would leave the card section
  // empty. A status change keeps the id present, so "held" still holds.
  useEffect(() => {
    if (stepRows.length === 0) return;
    setCurrentStepId((prev) =>
      prev !== null && stepRows.some((s) => s.id === prev)
        ? prev
        : resolveFocusStepId(stepRows),
    );
  }, [stepRows]);

  const currentStep = useMemo(
    () => stepRows.find((s) => s.id === currentStepId) ?? null,
    [stepRows, currentStepId],
  );

  const currentStepEvidenceRows = useMemo(
    () =>
      currentStepId
        ? allStepEvidenceRows.filter((row) => row.stepId === currentStepId)
        : [],
    [allStepEvidenceRows, currentStepId],
  );

  // Read-only chips for the captured rail — what is present, never what is
  // absent (#360). Each carries its caption so a chip can show it instead of
  // the bare type label.
  const capturedEvidence = useMemo<FocusCapturedEvidenceItem[]>(
    () =>
      currentStepEvidenceRows
        .filter((e) => Boolean(e.type))
        .map((e) => ({
          id: e.id as string,
          type: e.type as string,
          caption: (e.description as string | null) ?? null,
        })),
    [currentStepEvidenceRows],
  );

  // An unset plan means one text note (#466 D4) — the same list canCompleteStep
  // gates on, so the card's "Mark complete" reveal and the DB verdict agree.
  const plannedEvidenceTypes = useMemo(
    () =>
      resolvePlannedEvidenceTypes(
        (currentStep?.plannedEvidenceTypes as string | null) ?? null,
      ),
    [currentStep],
  );

  // C·B band (#454): the resolver hands back raw fields, so this caller owns
  // the date formatting (locale from the active UI language) and leaves each
  // prop undefined when its column is unset — MetadataBand then renders
  // nothing rather than a placeholder line. Same shape TimelineJourneyScreen
  // builds, so the two surfaces read a step's dependencies identically.
  const band = useMemo(() => {
    if (!currentStep) return null;
    const resolved = resolveStepDependencyBand(currentStep, stepRows);
    return {
      afterStep: resolved.afterStepTitle ?? undefined,
      waitingOn: resolved.waitingOnLabel
        ? {
            who: resolved.waitingOnLabel,
            expected: resolved.waitingOnExpectedAt
              ? formatDate(resolved.waitingOnExpectedAt, i18n.language)
              : undefined,
          }
        : undefined,
      dueDate: resolved.dueAt
        ? formatDate(resolved.dueAt, i18n.language)
        : undefined,
    };
  }, [currentStep, stepRows, i18n.language]);

  const doneCount = useMemo(
    () => stepRows.filter((s) => s.status === StepStatus.completed).length,
    [stepRows],
  );

  // `title` is nullable at the row level only — `createStep` validates it as a
  // NonEmptyString1000, so an unset one is unreachable in practice. One derived
  // value regardless, so the card and the screen-reader announcements can't
  // disagree about the fallback.
  const currentStepTitle = currentStep?.title ?? "";

  // --- Event Handlers ---

  /**
   * Run a step mutation, surfacing a failure the same way step completion
   * already does — toast + Sentry — rather than letting it fail silently.
   * {@link runEvoluMutation} covers both of Evolu's failure modes (a thrown
   * validation error from `db/queries.ts` *and* a returned `{ ok: false }`
   * write Result), and the success-only announcement is gated on its verdict.
   *
   * `op` is the specific operation, for the log line; `kind` is the coarser
   * Sentry facet (see ReportContext's focus.mode entry).
   */
  const runStepMutation = useCallback(
    (
      op: string,
      kind: "step-toggle" | "evidence-plan",
      mutate: () => Result<unknown, unknown>,
      announcement?: string,
    ) => {
      const ok = runEvoluMutation(mutate, (error) => {
        const message =
          error instanceof Error
            ? error.message
            : t("focusMode:errors.somethingWrong");
        logger.error("Step mutation failed", { op, error });
        reportError(error, { area: "focus.mode", kind });
        showToast({
          message: t("focusMode:errors.couldNotUpdateStep", { message }),
          duration: 3000,
        });
      });
      if (ok && announcement) {
        AccessibilityInfo.announceForAccessibility(announcement);
      }
    },
    [showToast, t],
  );

  const handleMarkComplete = useCallback(() => {
    if (!currentStep) return;
    const stepId = currentStep.id;
    const stepEvidence = currentStepEvidenceRows.map((e) => ({
      type: (e.type as string | null) ?? null,
    }));
    const plannedJson =
      (currentStep.plannedEvidenceTypes as string | null) ?? null;

    // The card only reveals "Mark complete" once the plan is satisfied, so this
    // is a backstop against a race (evidence deleted elsewhere mid-session),
    // not the primary gate.
    if (!canCompleteStep(plannedJson, stepEvidence)) {
      showToast({
        message: t("focusMode:toast.evidenceRequired"),
        duration: 3000,
      });
      return;
    }

    runStepMutation(
      "step-complete",
      "step-toggle",
      () => completeStep(stepId as StepId, plannedJson, stepEvidence),
      t("focusMode:a11y.stepCompleted", { title: currentStepTitle }),
    );
  }, [
    currentStep,
    currentStepTitle,
    currentStepEvidenceRows,
    runStepMutation,
    showToast,
    t,
  ]);

  const handlePause = useCallback(() => {
    if (!currentStep) return;
    runStepMutation("step-pause", "step-toggle", () =>
      pauseStep(currentStep.id as StepId),
    );
  }, [currentStep, runStepMutation]);

  const handlePickUp = useCallback(() => {
    if (!currentStep) return;
    runStepMutation("step-resume", "step-toggle", () =>
      resumeStep(currentStep.id as StepId),
    );
  }, [currentStep, runStepMutation]);

  const handleReopen = useCallback(() => {
    if (!currentStep) return;
    runStepMutation(
      "step-reopen",
      "step-toggle",
      () => uncompleteStep(currentStep.id as StepId),
      t("focusMode:a11y.stepUncompleted", { title: currentStepTitle }),
    );
  }, [currentStep, currentStepTitle, runStepMutation, t]);

  const navigateToCapture = useCallback(
    (type: EvidenceTypeValue, stepId: string) => {
      const routeName = EVIDENCE_ROUTE_MAP[type];
      if (!routeName) {
        logger.error("No capture route mapped for evidence type", { type });
        showToast({
          message: t("focusMode:errors.couldNotOpenCapture", {
            label: evidenceShortLabel(t, type),
          }),
          duration: 3000,
        });
        return;
      }
      navigation.navigate(routeName, { goalId, stepId });
    },
    [goalId, navigation, showToast, t],
  );

  /**
   * A `type` means a specific "Add {type}" invite — go straight to that capture
   * screen. No `type` is the open-ended "Add more evidence" — open the capture
   * sheet so the user picks one first (FocusCurrentTaskCard.types.ts:49-54).
   */
  const handleAddEvidence = useCallback(
    (type?: string) => {
      if (!currentStepId) return;
      if (type === undefined) {
        setIsCaptureSheetOpen(true);
        return;
      }
      navigateToCapture(validateEvidenceType(type), currentStepId);
    },
    [currentStepId, navigateToCapture],
  );

  const handleSelectCaptureType = useCallback(
    (type: EvidenceTypeValue) => {
      setIsCaptureSheetOpen(false);
      if (!currentStepId) return;
      navigateToCapture(type, currentStepId);
    },
    [currentStepId, navigateToCapture],
  );

  /**
   * Toggle a planned type. Guards the "every step requires evidence" invariant
   * the same way the New Goal wizard does: the last remaining type can't be
   * deselected, so a step never lands in a 0-selected state.
   */
  const handleTogglePlannedType = useCallback(
    (type: EvidenceTypeValue) => {
      if (!currentStepId) return;
      const isSelected = plannedEvidenceTypes.includes(type);
      if (isSelected && plannedEvidenceTypes.length === 1) return;
      const next = isSelected
        ? plannedEvidenceTypes.filter((planned) => planned !== type)
        : [...plannedEvidenceTypes, type];
      runStepMutation("step-evidence-plan", "evidence-plan", () =>
        updateStep(currentStepId as StepId, { plannedEvidenceTypes: next }),
      );
    },
    [currentStepId, plannedEvidenceTypes, runStepMutation],
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
          accessibilityLabel={t("focusMode:header.editGoal")}
          size="sm"
        />
      </View>

      {/* The one way to see everything: progress + "See all steps ›" in a
          single tap target, replacing the old MiniTimeline/ProgressDots pair. */}
      <FocusProgressStrip
        doneCount={doneCount}
        totalCount={stepRows.length}
        onPress={handleTimelineTap}
      />

      <View style={styles.cardSection}>
        {currentStep ? (
          currentStep.status === StepStatus.completed ? (
            <FocusCurrentTaskCard
              status="completed"
              title={currentStepTitle}
              capturedEvidence={capturedEvidence}
              onReopen={handleReopen}
            />
          ) : currentStep.status === StepStatus.paused ? (
            <FocusCurrentTaskCard
              status="paused"
              title={currentStepTitle}
              onPickUp={handlePickUp}
            />
          ) : (
            <FocusCurrentTaskCard
              status="in-progress"
              title={currentStepTitle}
              plannedEvidenceTypes={plannedEvidenceTypes}
              capturedEvidence={capturedEvidence}
              onChangeEvidencePlan={() => setIsPlanSheetOpen(true)}
              onAddEvidence={handleAddEvidence}
              onPause={handlePause}
              onMarkComplete={handleMarkComplete}
              afterStep={band?.afterStep}
              waitingOn={band?.waitingOn}
              dueDate={band?.dueDate}
            />
          )
        ) : null}
      </View>

      {/* Capture sheet — pick a type, then capture. Reuses #409's capture mode
          whole, as the New Goal wizard's step 2 does. Renders in-tree and gates
          on `visible`, so mounting it unconditionally is inert until opened. */}
      <EvidenceTypePicker
        mode="capture"
        visible={isCaptureSheetOpen}
        activeStepTitle={currentStep?.title ?? undefined}
        onSelectType={handleSelectCaptureType}
        onClose={() => setIsCaptureSheetOpen(false)}
      />

      {/* Evidence-plan sheet — change *which* types this step plans. The
          authoring multi-select grid in the shared AnimatedSheet chrome,
          mirroring the wizard's build-step sheet. */}
      <AnimatedSheet
        visible={isPlanSheetOpen}
        onClose={() => setIsPlanSheetOpen(false)}
        title={t("focusMode:evidencePlanSheet.title")}
        closeLabel={t("common:actions.close")}
        closeTestID="focus-evidence-plan-close"
        backdropTestID="focus-evidence-plan-backdrop"
      >
        <EvidenceTypePicker
          selectedTypes={plannedEvidenceTypes.map(validateEvidenceType)}
          onToggleType={handleTogglePlannedType}
          label={t("focusMode:evidencePlanSheet.typesLabel")}
        />
      </AnimatedSheet>
    </View>
  );
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
      </KeyboardAvoidingView>
    </View>
  );
}
