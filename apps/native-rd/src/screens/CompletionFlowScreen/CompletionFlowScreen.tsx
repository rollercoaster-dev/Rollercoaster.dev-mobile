import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import type { Buffer } from "buffer";
import { useNavigation, type NavigationProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery } from "@evolu/react";
import { useUnistyles } from "react-native-unistyles";
import { useTranslation } from "react-i18next";

import { Text } from "../../components/Text";
import { ErrorBoundary } from "../../components/ErrorBoundary";
import { FinishCelebrateStage } from "../../components/FinishCelebrateStage";
import { FinishDesignStage } from "../../components/FinishDesignStage";
import {
  FinishBakingStage,
  type FinishBakingStatus,
} from "../../components/FinishBakingStage";
import { FinishRevealStage } from "../../components/FinishRevealStage";
import {
  getRendererLayoutOptions,
  type BadgeRendererHandle,
} from "../../badges/BadgeRenderer";
import { captureBadge, getCaptureDimensions } from "../../badges/captureBadge";
import { createDefaultBadgeDesign, parseBadgeDesign } from "../../badges/types";
import type { BadgeDesign } from "../../badges/types";
import { useFrameParamsForGoal } from "../../badges/frames";
import {
  goalsQuery,
  stepsByGoalQuery,
  stepEvidenceByGoalQuery,
  badgeByGoalQuery,
  createEvidence,
  EvidenceType,
  TEXT_EVIDENCE_PREFIX,
} from "../../db";
import type { GoalId } from "../../db";
// Imported from the leaf module, not the `../../db` barrel: the gate is a pure
// predicate over row shapes, and reaching it through the barrel would tie it to
// the Evolu runtime for every consumer (and every test that stubs the barrel).
import {
  countStepsMissingEvidence,
  isGoalEvidenceComplete,
} from "../../db/evidenceGate";
import { isGoalSealed } from "../../db/goalSeal";
import { useCreateBadge } from "../../hooks/useCreateBadge";
import { useAnimationPref } from "../../hooks/useAnimationPref";
import type {
  GoalsStackParamList,
  RootTabParamList,
  CompletionFlowScreenProps,
} from "../../navigation/types";
import { formatDate } from "../../utils/format";
import { Logger } from "../../shims/rd-logger";
import { reportError } from "../../services/sentry-report";
import {
  celebrateCopy,
  designCopy,
  bakingCopy,
  revealCopy,
  mapBakeStatus,
} from "./finishStageCopy";
import { styles } from "./CompletionFlowScreen.styles";

const logger = new Logger("CompletionFlowScreen");

/** The four sub-stages of the canonical `finish` route, in order. */
type FinishStage = "celebrate" | "design" | "baking" | "reveal";

/**
 * Preview size for the design stage. Passed to `FinishDesignStage` *and* to
 * `getCaptureDimensions` so the requested PNG canvas matches the mounted Svg's
 * on-screen layout size — iOS `toDataURL` stamps the rendered content into the
 * upper-left of the requested canvas, so a mismatch leaves transparent margins.
 */
const DESIGN_PREVIEW_SIZE = 150;

/**
 * Brief hold on the success sub-state before advancing to reveal, so the
 * distinct "Badge created!" moment is observable rather than an instant cut.
 * Matches `FinishFlow.stories.tsx`'s own SUCCESS_HOLD_MS.
 */
const SUCCESS_HOLD_MS = 700;

function FinishFlowContent({ goalId }: { goalId: string }) {
  const navigation =
    useNavigation<NativeStackNavigationProp<GoalsStackParamList>>();
  const { theme } = useUnistyles();
  // "common" is declared alongside "completion" so the baking stage's retry
  // button can use the shared common:actions.retry label. react-i18next binds
  // the key union to the namespaces passed here, so it must be listed even
  // though it is loaded globally and keys stay fully prefixed at the call site.
  const { t, i18n } = useTranslation(["completion", "common", "badgeDesigner"]);
  const { animationPref } = useAnimationPref();

  const goals = useQuery(goalsQuery);
  const goal = goals.find((g) => g.id === goalId) ?? null;
  const stepRows = useQuery(stepsByGoalQuery(goalId as GoalId));
  const stepEvidenceRows = useQuery(stepEvidenceByGoalQuery(goalId as GoalId));
  const badgeRows = useQuery(badgeByGoalQuery(goalId as GoalId));
  const badgeRow = badgeRows[0] ?? null;

  // A goal that is already completed and already has a badge is sealed (#563):
  // its credential was minted, and useCreateBadge's idempotent guard will never
  // write again. Walking celebrate → design → Bake from here used to render the
  // user's edits on the reveal and then drop them — nothing persisted, and
  // BadgeDetail showed the old design. So a sealed goal opens on the reveal,
  // which is read-only and offers View badge / Back to goals. Latched once on
  // entry (useQuery suspends, so the rows are loaded on first render) so the
  // normal path's own completion — goal flips, badge row lands — still goes
  // through the baking success hold instead of jumping straight to reveal.
  const [sealedOnEntry] = useState(() => isGoalSealed(goal, badgeRow));
  const [stage, setStage] = useState<FinishStage>(
    sealedOnEntry ? "reveal" : "celebrate",
  );
  const [closingNote, setClosingNote] = useState("");
  const [design, setDesign] = useState<BadgeDesign | null>(null);
  const [capturedPng, setCapturedPng] = useState<Buffer | undefined>(undefined);
  // Set when the on-Bake rasterization itself fails, before the hook is ever
  // enabled. Rendered through the same error sub-state, but its Retry returns
  // to the design stage — the only place the preview (and its ref) is mounted.
  const [captureError, setCaptureError] = useState<string | null>(null);

  const goalTitle = (goal?.title as string | null) ?? "";
  const goalColor = (goal?.color as string | null) ?? null;
  const goalDesignJson = (goal?.design as string | null) ?? null;
  const badgeDesignJson =
    (badgeRow?.design as string | null | undefined) ?? null;

  // The bake writes the design to badge.design (createBadge), and that is the
  // column BadgeDetail renders — so it wins (#563). goal.design is the
  // designer's pre-bake draft (BadgeDesignerScreen's new-goal path) and the
  // synthesized default is the last resort. `design` state holds the user's
  // in-flow edits and overrides all three once they touch a control.
  const seededDesign: BadgeDesign =
    parseBadgeDesign(badgeDesignJson) ??
    parseBadgeDesign(goalDesignJson) ??
    createDefaultBadgeDesign(goalTitle, goalColor);
  const currentDesign = design ?? seededDesign;

  // Feeds the data-driven frames (step count, evidence count, elapsed days) so
  // picking one in the design stage renders real numbers, not a paramless ring.
  const frameParams = useFrameParamsForGoal(
    goalId as GoalId,
    (goal?.createdAt as string | null | undefined) ?? null,
    (goal?.completedAt as string | null | undefined) ?? null,
  );

  // The badge's evidence gate (#635 D1/D4): every step must have captured every
  // type it planned. Rendered at the Bake CTA rather than on `finish-line-cta`,
  // because the closing note — the only goal-scoped evidence affordance — sits
  // behind that CTA, so locking it would be a lockout (D4). Note the closing
  // note cannot unblock this: `stepEvidenceByGoalQuery` is step-scoped rows
  // only, and a reflection on the ride is not proof a step happened.
  const canBake = isGoalEvidenceComplete(stepRows, stepEvidenceRows);
  // Drives the blocked copy, which names how many steps are outstanding rather
  // than restating the rule.
  const stepsMissingEvidence = countStepsMissingEvidence(
    stepRows,
    stepEvidenceRows,
  );

  const previewRef = useRef<BadgeRendererHandle | null>(null);
  const capturingRef = useRef(false);

  const {
    status: hookStatus,
    error: hookError,
    retryBake,
  } = useCreateBadge(goalId as GoalId, {
    ...(capturedPng ? { freshCapturedPng: capturedPng } : {}),
    design: JSON.stringify(currentDesign),
    enabled: stage === "baking" && capturedPng !== undefined,
  });

  const displayStatus: FinishBakingStatus = captureError
    ? "error"
    : mapBakeStatus(hookStatus);

  // Success holds briefly, then advances. Stage-gated so a status that is
  // already "done" on entry (re-visiting a goal that has a badge) can't yank
  // the user off celebrate or design before they've acted.
  useEffect(() => {
    if (stage !== "baking" || displayStatus !== "success") return;
    const timer = setTimeout(() => setStage("reveal"), SUCCESS_HOLD_MS);
    return () => clearTimeout(timer);
  }, [stage, displayStatus]);

  // The closing note saves on blur, which can fire repeatedly for the same
  // text. Remembering what was written keeps a re-blur from appending a
  // duplicate evidence row.
  const savedNoteRef = useRef<string | null>(null);
  const handleSaveClosingNote = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || savedNoteRef.current === trimmed) return;
      try {
        createEvidence({
          goalId: goalId as GoalId,
          type: EvidenceType.text,
          uri: `${TEXT_EVIDENCE_PREFIX}${trimmed}`,
          description: undefined,
        });
        savedNoteRef.current = trimmed;
      } catch (error) {
        logger.error("Failed to save closing note", { goalId, error });
        reportError(error, { area: "completion.flow" });
      }
    },
    [goalId],
  );

  // Capture resolves *before* the stage flips: leaving the design stage
  // unmounts the preview Svg, and an unmounted view mid-toDataURL is exactly
  // the dropped-callback race from #93. Both outcomes land on baking — a
  // failure just arrives there already in the error sub-state.
  const handleBake = () => {
    if (capturingRef.current) return;
    capturingRef.current = true;
    const dimensions = getCaptureDimensions(
      currentDesign,
      DESIGN_PREVIEW_SIZE,
      getRendererLayoutOptions(theme),
    );
    captureBadge(previewRef, dimensions)
      .then((png) => {
        setCapturedPng(png);
        setCaptureError(null);
      })
      .catch((err) => {
        logger.error("Bake-time capture failed", { goalId, error: err });
        reportError(err, { area: "badge.create", kind: "bake" });
        setCaptureError(
          err instanceof Error ? err.message : "Badge capture failed",
        );
      })
      .finally(() => {
        capturingRef.current = false;
        setStage("baking");
      });
  };

  const handleRetry = () => {
    if (captureError) {
      // Nothing to re-capture from here — the preview only exists on the
      // design stage, so send the user back to press Bake again.
      setCaptureError(null);
      setStage("design");
      return;
    }
    retryBake();
  };

  // Both exits land on the goals list: the prototype's own backToGoals handler
  // empties the stack rather than returning to the goal, and the no-key escape
  // has no better destination — no badge was created either way, and there is
  // no "reopen the goal so it can retry key generation" flow to send them to.
  const handleBackToGoals = useCallback(() => {
    navigation.popToTop();
  }, [navigation]);

  const handleViewBadge = useCallback(() => {
    if (!badgeRow) {
      // Only reachable if the badge row hasn't arrived from Evolu yet — the
      // reveal stage is gated on a successful bake, so this is a sync lag, not
      // a missing badge. Log rather than dead-ending in silence.
      logger.warn("View badge pressed before the badge row was queryable", {
        goalId,
      });
      return;
    }
    const parentNav = navigation.getParent<NavigationProp<RootTabParamList>>();
    if (!parentNav) {
      logger.warn(
        "Could not navigate to badge detail — parent tab navigator not found",
      );
      return;
    }
    // Dismiss the finish modal FIRST. It is presented on GoalsStack, and an
    // iOS native-stack modal covers the whole screen — switching the tab
    // underneath it leaves BadgeDetail rendering invisibly behind the modal,
    // which reads to the user as "View badge does nothing". popToTop removes
    // CompletionFlow from the stack, dismissing the presentation.
    navigation.popToTop();
    parentNav.navigate("BadgesTab", {
      screen: "BadgeDetail",
      params: { badgeId: String(badgeRow.id) },
      // initial: false seeds the stack's initialRouteName (Badges) beneath
      // BadgeDetail so back / the Badges tab reach the list even on a cold,
      // never-opened BadgesTab. Without it the stack is just [BadgeDetail]
      // and there's nothing to pop to (#325).
      initial: false,
    });
  }, [badgeRow, goalId, navigation]);

  if (!goal) {
    return (
      <View style={styles.centered}>
        <Text variant="body">{t("completion:errors.goalNotFound")}</Text>
      </View>
    );
  }

  if (stage === "celebrate") {
    return (
      <FinishCelebrateStage
        {...celebrateCopy(t, { title: goalTitle, stepCount: stepRows.length })}
        closingNoteValue={closingNote}
        onClosingNoteChange={setClosingNote}
        onSaveClosingNote={handleSaveClosingNote}
        onDesignBadge={() => setStage("design")}
      />
    );
  }

  if (stage === "design") {
    return (
      <FinishDesignStage
        {...designCopy(t, { stepsMissingEvidence })}
        design={currentDesign}
        onDesignChange={setDesign}
        goalColor={goalColor}
        goalTitle={goalTitle}
        frameParams={frameParams}
        badgeSize={DESIGN_PREVIEW_SIZE}
        previewRef={previewRef}
        onBack={() => setStage("celebrate")}
        onBake={handleBake}
        canBake={canBake}
      />
    );
  }

  if (stage === "baking") {
    return (
      <FinishBakingStage
        {...bakingCopy(t, { errorDetail: captureError ?? hookError ?? "" })}
        badgeDesign={currentDesign}
        status={displayStatus}
        onExitWithoutBadge={handleBackToGoals}
        onRetry={handleRetry}
      />
    );
  }

  return (
    <FinishRevealStage
      {...revealCopy(t)}
      badgeDesign={currentDesign}
      goalTitle={goalTitle}
      earnedDateLabel={formatDate(
        (goal.completedAt ?? goal.createdAt) as string | null,
        i18n.language,
      )}
      onViewBadge={handleViewBadge}
      onBackToGoals={handleBackToGoals}
      animationPref={animationPref}
    />
  );
}

/**
 * The `finish` route: celebrate → design → baking → reveal, wired to the real
 * `useCreateBadge` pipeline and real navigation.
 *
 * Each stage is a self-contained full-bleed component (#470–#472, #499) — the
 * screen owns only the stage machine, the badge design threaded through it, the
 * bake-time capture, and the exits. It deliberately renders no `ModeIndicator`,
 * `ScreenSubHeader`, or `Confetti`: every redesigned full-screen flow in this
 * epic drops that legacy chrome, and #470 D4 already ruled confetti out of the
 * finish route. Presented as a stack modal so the tab bar stays hidden (D1).
 */
export function CompletionFlowScreen({ route }: CompletionFlowScreenProps) {
  const { goalId } = route.params;

  return (
    <View style={styles.container}>
      <ErrorBoundary>
        <Suspense
          fallback={
            <ActivityIndicator style={styles.loadingIndicator} size="large" />
          }
        >
          <FinishFlowContent goalId={goalId} />
        </Suspense>
      </ErrorBoundary>
    </View>
  );
}
