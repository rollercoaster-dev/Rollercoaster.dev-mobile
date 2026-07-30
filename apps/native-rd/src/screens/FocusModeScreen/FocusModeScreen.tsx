import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  ActivityIndicator,
  AccessibilityInfo,
  KeyboardAvoidingView,
  ScrollView,
} from "react-native";
import { ScreenSubHeader } from "../../components/ScreenHeader";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
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
import {
  FocusParkedState,
  type FocusParkedRow,
} from "../../components/FocusParkedState";
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
  areAllStepsComplete,
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
 * flat, orphan-promotion included — #292/#337), and `null` when nothing is
 * actionable. Nothing actionable means the goal is either fully set aside or
 * fully done, and the screen renders a dedicated state for each (#467 D5/D6) —
 * so this returns no fallback step rather than picking one.
 */
function resolveFocusStepId(rows: readonly StepRowLike[]): string | null {
  const actionable = resolveNextActionableStep(rows);
  if (actionable.kind === "none") return null;
  return rows[actionable.index]?.id ?? null;
}

/**
 * The card-section body when no step is actionable.
 *
 * `resolveNextActionableStep` reports `none` for both "every step is done" and
 * "every step that's left is set aside", so the tie-break lives here (D5). The
 * stepless goal is checked *first*: `areAllStepsComplete([])` is `false`, so it
 * would otherwise land in the parked state as a nonsensical "Nothing in
 * progress. 0 set aside" — a goal with no steps stays chrome-only (D6).
 */
function NoActionableBody({
  stepCount,
  allStepsComplete,
  parkedRows,
  goalTitle,
  onDesignBadge,
}: {
  stepCount: number;
  allStepsComplete: boolean;
  parkedRows: readonly FocusParkedRow[];
  goalTitle: string;
  onDesignBadge: () => void;
}) {
  if (stepCount === 0) return null;
  if (allStepsComplete) {
    return (
      <FocusCurrentTaskCard
        status="all-complete"
        title={goalTitle}
        onDesignBadge={onDesignBadge}
      />
    );
  }
  // Scrolled at the call site, not inside FocusParkedState: its own `rows`
  // container is a plain gap-only View, and a goal can have more set-aside steps
  // than fit one screen (D9).
  return (
    <ScrollView contentContainerStyle={styles.parkedScrollContent}>
      <FocusParkedState rows={parkedRows} />
    </ScrollView>
  );
}

function FocusContent({
  goalId,
  routeStepId,
}: {
  goalId: string;
  /** The Timeline-return leg's tapped step, if this visit came from there. */
  routeStepId?: string;
}) {
  const { t, i18n } = useTranslation(["focusMode", "common"]);
  // Route-scoped so `setParams` is typed against FocusMode's own params (D10).
  const navigation =
    useNavigation<
      NativeStackNavigationProp<GoalsStackParamList, "FocusMode">
    >();
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

  // The Timeline-return pin (D2): a one-shot override of the derived step,
  // holding whichever node the user tapped in TimelineJourney so they land on
  // that exact step even when it is done or set aside. Cleared on the first
  // step-toggle mutation (see `runStepMutation`), after which the screen follows
  // auto-advance again.
  const [pinnedStepId, setPinnedStepId] = useState<string | null>(null);
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

  // Consume the Timeline-return param on every focus transition, not once on
  // mount: this screen is already mounted *underneath* TimelineJourney, so a
  // node tap re-focuses this instance rather than remounting it. `useFocusEffect`
  // also fires when the same node is tapped twice in a row, which a
  // `[route.params.stepId]`-keyed `useEffect` would skip (D2).
  //
  // Clearing the param is the other half: left set, any later arrival here from
  // an unrelated path would silently re-pin a by-then-stale step and undo
  // whatever auto-advance happened in between.
  useFocusEffect(
    useCallback(() => {
      if (!routeStepId) return;
      setPinnedStepId(routeStepId);
      navigation.setParams({ stepId: undefined });
    }, [routeStepId, navigation]),
  );

  // Pure derivation, no held state (D1): the resolver runs against the live
  // query rows on every render, so completing / setting aside / resuming /
  // reopening a step auto-advances the card to whatever became actionable — and
  // a step deleted out from under the screen (EditMode, still mounted) can never
  // leave a dangling id behind.
  const currentStepId =
    pinnedStepId !== null && stepRows.some((s) => s.id === pinnedStepId)
      ? pinnedStepId
      : resolveFocusStepId(stepRows);

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
  //
  // Normalized (and de-duplicated) here rather than at each reader: the column
  // is free-form JSON, and the card, the plan sheet's selection, and
  // `handleTogglePlannedType`'s add/remove math must all key off the *same*
  // list. Left raw, an unknown stored type would render and select as `file`
  // (`validateEvidenceType`) while the toggle compared against the raw key, so
  // tapping that chip would append `file` instead of clearing it.
  const plannedEvidenceTypes = useMemo<readonly EvidenceTypeValue[]>(
    () => [
      ...new Set(
        resolvePlannedEvidenceTypes(
          (currentStep?.plannedEvidenceTypes as string | null) ?? null,
          logger,
        ).map(validateEvidenceType),
      ),
    ],
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
      if (!ok) return;
      // Acting on the step is the second way the Timeline pin is consumed (D2):
      // from here on the card follows auto-advance rather than staying on the
      // step the user arrived at.
      if (kind === "step-toggle") setPinnedStepId(null);
      if (announcement) {
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

  /**
   * Resume one specific step. Explicit-id (rather than reading `currentStep`)
   * because the parked state resumes a row while there is no current step at all
   * (D7) — and it still goes through {@link runStepMutation}, so a parked row's
   * write failure surfaces exactly like every other path's.
   */
  const handleResumeStep = useCallback(
    (stepId: string) => {
      runStepMutation("step-resume", "step-toggle", () =>
        resumeStep(stepId as StepId),
      );
    },
    [runStepMutation],
  );

  const handlePickUp = useCallback(() => {
    if (!currentStep) return;
    handleResumeStep(currentStep.id);
  }, [currentStep, handleResumeStep]);

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

  // The same finishing entry point every other surface uses (TimelineJourney's
  // FinishLine badge CTA) — one route, so #449 has a single path to retire (D8).
  const handleDesignBadge = useCallback(() => {
    navigation.navigate("CompletionFlow", { goalId });
  }, [goalId, navigation]);

  // One resumable row per set-aside step, for the parked state. Each row closes
  // over its own id, so tapping row N can only ever resume row N.
  const parkedRows = useMemo<FocusParkedRow[]>(
    () =>
      stepRows
        .filter((s) => s.status === StepStatus.paused)
        .map((s) => ({
          id: s.id,
          title: s.title ?? "",
          onResume: () => handleResumeStep(s.id),
        })),
    [stepRows, handleResumeStep],
  );

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
        ) : (
          <NoActionableBody
            stepCount={stepRows.length}
            allStepsComplete={areAllStepsComplete(stepRows)}
            parkedRows={parkedRows}
            goalTitle={goal.title ?? ""}
            onDesignBadge={handleDesignBadge}
          />
        )}
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
          selectedTypes={plannedEvidenceTypes}
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
            <FocusContent
              goalId={route.params.goalId}
              routeStepId={route.params.stepId}
            />
          </Suspense>
        </ErrorBoundary>
      </KeyboardAvoidingView>
    </View>
  );
}
