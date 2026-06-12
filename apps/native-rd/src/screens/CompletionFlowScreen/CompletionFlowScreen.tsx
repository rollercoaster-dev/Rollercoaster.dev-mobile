import {
  Suspense,
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import {
  View,
  ScrollView,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  AccessibilityInfo,
} from "react-native";
import { Buffer } from "buffer";
import {
  useNavigation,
  useFocusEffect,
  type NavigationProp,
} from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery } from "@evolu/react";
import { useUnistyles } from "react-native-unistyles";
import { useTranslation } from "react-i18next";
import { Text } from "../../components/Text";
import { ErrorBoundary } from "../../components/ErrorBoundary";
import { Button } from "../../components/Button";
import { ScreenSubHeader } from "../../components/ScreenHeader";
import { Confetti } from "../../components/Confetti";
import { ModeIndicator } from "../../components/ModeIndicator";
import { BadgeEarnedModal } from "../BadgeEarnedModal";
import {
  BadgeRenderer,
  getRendererLayoutOptions,
  type BadgeRendererHandle,
} from "../../badges/BadgeRenderer";
import { captureBadge, getCaptureDimensions } from "../../badges/captureBadge";
import { createDefaultBadgeDesign, parseBadgeDesign } from "../../badges/types";
import type { BadgeDesign } from "../../badges/types";
import {
  goalsQuery,
  stepsByGoalQuery,
  evidenceByGoalQuery,
  badgeByGoalQuery,
  badgesQuery,
  uncompleteGoal,
  createEvidence,
  EvidenceType,
  TEXT_EVIDENCE_PREFIX,
  GoalStatus,
} from "../../db";
import type { GoalId } from "../../db";
import {
  useCreateBadge,
  PLACEHOLDER_IMAGE_URI,
} from "../../hooks/useCreateBadge";
import type {
  GoalsStackParamList,
  RootTabParamList,
  CompletionFlowScreenProps,
  CaptureScreenName,
} from "../../navigation/types";
import {
  EVIDENCE_OPTIONS,
  validateEvidenceType,
  type EvidenceTypeValue,
} from "../../types/evidence";
import { evidenceLabel } from "../../i18n/labels";
import { EVIDENCE_TYPE_ICONS } from "../../constants/evidenceIcons";
import { pendingDesignStore } from "../../stores/pendingDesignStore";
import { Logger } from "../../shims/rd-logger";
import { reportError } from "../../services/sentry-report";
import { KEYBOARD_AVOIDING_PROPS } from "../../utils/keyboard";
import { styles } from "./CompletionFlowScreen.styles";

const logger = new Logger("CompletionFlowScreen");

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

/** Max chars for inline text note (matches CaptureTextNote constraint) */
const MAX_NOTE_LENGTH = 1000;

type CompletionPhase = "evidence-prompt" | "celebration";

function CompletionContent({
  goalId,
  pendingDesignJson,
  pendingCapturedPng,
}: {
  goalId: string;
  pendingDesignJson: string | undefined;
  pendingCapturedPng: Buffer | undefined;
}) {
  const navigation =
    useNavigation<NativeStackNavigationProp<GoalsStackParamList>>();
  const { theme } = useUnistyles();
  // "common" is declared alongside "completion" so the retry button can use the
  // shared common:actions.retry label (#39). react-i18next's types bind the key
  // union to the namespaces passed here, so the namespace must be listed even
  // though it is loaded globally and the key stays fully prefixed at the call site.
  const { t: tCompletion } = useTranslation(["completion", "common"]);
  const rows = useQuery(goalsQuery);
  const goal = rows.find((r) => r.id === goalId);
  const stepRows = useQuery(stepsByGoalQuery(goalId as GoalId));
  const goalEvidenceRows = useQuery(evidenceByGoalQuery(goalId as GoalId));

  const badgeRows = useQuery(badgeByGoalQuery(goalId as GoalId));
  const badgeRow = badgeRows[0] ?? null;
  const allBadges = useQuery(badgesQuery);

  const hasGoalEvidence = goalEvidenceRows.length > 0;

  const isReCompletion =
    Boolean(badgeRow) && goal?.status !== GoalStatus.completed;

  // Re-completion only advances on evidence added *this session* — the
  // persisted rows are the previous bake's snapshot, not fresh proof.
  const initialEvidenceCount = useRef(goalEvidenceRows.length);
  const hasFreshEvidence =
    goalEvidenceRows.length > initialEvidenceCount.current;

  const [phase, setPhase] = useState<CompletionPhase>(() => {
    if (isReCompletion) return "evidence-prompt";
    return hasGoalEvidence ? "celebration" : "evidence-prompt";
  });

  useEffect(() => {
    if (phase !== "evidence-prompt") return;
    const shouldAdvance = isReCompletion ? hasFreshEvidence : hasGoalEvidence;
    if (!shouldAdvance) return;
    setPhase("celebration");
    AccessibilityInfo.announceForAccessibility(
      tCompletion("completion:evidencePhase.evidenceAddedA11y"),
    );
  }, [phase, isReCompletion, hasFreshEvidence, hasGoalEvidence, tCompletion]);

  // First-completion-only fallback: re-completion reuses the existing
  // on-disk PNG via readBadgePNG.
  //
  // Hydration precedence when there's no warm pendingCapturedPng:
  //   1. goal.design — persisted source; survives cold start and Evolu sync,
  //      unlike the in-memory pendingDesignStore.
  //   2. createDefaultBadgeDesign — synthesized default (true last resort).
  const goalTitleForDefault = (goal?.title as string | null) ?? "";
  const goalColorForDefault = (goal?.color as string | null) ?? null;
  const goalDesignJsonForFallback = (goal?.design as string | null) ?? null;
  // Canonical "we have a usable baked image" check. Hoisted so the fallback
  // gate below can reuse it — a placeholder badge row counts as "no image"
  // and must not block recovery.
  const hasExistingBadgeImage = Boolean(
    badgeRow?.imageUri && badgeRow.imageUri !== PLACEHOLDER_IMAGE_URI,
  );
  // Memoized so the effect below — and the pinnedHostDesignRef capture path —
  // see a stable identity across re-renders. Parsing the JSON inline on every
  // render produced a fresh object each time, which made the capture effect's
  // dep array see spurious "changes" and cancel its own in-flight capture.
  //
  // Gate on `!hasExistingBadgeImage` rather than `!badgeRow`: a row created
  // with PLACEHOLDER_IMAGE_URI by a previous failed bake attempt would
  // otherwise lock the fallback capture path forever, leaving the user with
  // a permanently disabled Bake button and no recovery path.
  const shouldComputeFallbackDesign =
    !pendingCapturedPng && Boolean(goal) && !hasExistingBadgeImage;
  const fallbackDesign = useMemo<BadgeDesign | null>(() => {
    if (!shouldComputeFallbackDesign) return null;
    return (
      parseBadgeDesign(goalDesignJsonForFallback) ??
      createDefaultBadgeDesign(goalTitleForDefault, goalColorForDefault)
    );
  }, [
    shouldComputeFallbackDesign,
    goalDesignJsonForFallback,
    goalTitleForDefault,
    goalColorForDefault,
  ]);
  const fallbackRef = useRef<BadgeRendererHandle | null>(null);
  const [fallbackPng, setFallbackPng] = useState<Buffer | null>(null);
  const [captureInFlight, setCaptureInFlight] = useState(false);
  // In-flight guard as a ref so the re-entry check doesn't itself trigger
  // re-renders. The `captureInFlight` state above stays for UI (hostDesign
  // switch) only — keeping it out of the effect's deps prevents the effect
  // from cancelling the very capture it just kicked off, AND prevents the
  // infinite-retry loop that would otherwise fire when .finally clears the
  // flag and the effect re-runs with fallbackPng still null.
  const captureInFlightRef = useRef(false);
  // Pin the design driving an in-flight capture so reactive flips of
  // fallbackDesign (badgeRow arriving via Evolu sync, pendingCapturedPng
  // arriving via useFocusEffect) cannot unmount the offscreen <Svg> while
  // the native toDataURL bridge call is still pending. Without this pin
  // the view drops from the React tree → RCTViewRegistry returns nil →
  // RNSVGSvgViewModule logs "Invalid svg returned from registry, expecting
  // RNSVGSvgView, got: (null)" and never invokes the callback → JS hits
  // the 5000ms timeout. See issue #93 / Sentry NATIVE-RD-B.
  const pinnedHostDesignRef = useRef<BadgeDesign | null>(null);

  useEffect(() => {
    if (pendingCapturedPng || !fallbackDesign || fallbackPng) return;
    if (!fallbackRef.current) return; // wait for BadgeRenderer to attach the handle
    if (captureInFlightRef.current) return;

    let cancelled = false;
    let raf1: number | null = null;
    let raf2: number | null = null;

    pinnedHostDesignRef.current = fallbackDesign;
    captureInFlightRef.current = true;
    setCaptureInFlight(true);
    // Capture-time BadgeRenderer is mounted with showShadow={false} (see
    // fallbackHost below). Pass the same override here so getCaptureDimensions
    // doesn't pad for a shadow the rendered SVG won't draw — otherwise iOS
    // toDataURL canvas dimensions exceed the painted content by the shadow
    // offset.
    const dimensions = getCaptureDimensions(
      fallbackDesign,
      undefined,
      getRendererLayoutOptions(theme, false),
    );
    // Two animation frames let iOS run a layout pass and commit the view
    // tree before the bridge dispatches toDataURL. JS ref attachment
    // happens before the native view is registered in RCTViewRegistry on
    // the same tick — dispatching synchronously races the registration.
    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        if (cancelled) return;
        captureBadge(fallbackRef, dimensions)
          .then((buf) => {
            if (cancelled) return;
            setFallbackPng(buf);
          })
          .catch((err) => {
            logger.error("Default-design capture failed", {
              goalId,
              error: err,
            });
            reportError(err, { area: "badge.create", kind: "bake" });
          })
          .finally(() => {
            captureInFlightRef.current = false;
            pinnedHostDesignRef.current = null;
            if (cancelled) return;
            setCaptureInFlight(false);
          });
      });
    });

    return () => {
      cancelled = true;
      if (raf1 != null) cancelAnimationFrame(raf1);
      if (raf2 != null) cancelAnimationFrame(raf2);
    };
  }, [pendingCapturedPng, fallbackDesign, fallbackPng, theme, goalId]);

  const designJsonForBake =
    pendingDesignJson ??
    (fallbackDesign && fallbackPng
      ? JSON.stringify(fallbackDesign)
      : undefined);

  // Bake never auto-fires — the user always taps Bake It explicitly, even
  // when a fresh designer PNG is already in hand.
  const [userConfirmedBake, setUserConfirmedBake] = useState(false);

  const hasAnyBakeSource =
    pendingCapturedPng !== undefined ||
    fallbackPng !== null ||
    hasExistingBadgeImage;

  const {
    status: badgeStatus,
    error: badgeError,
    retryBake,
  } = useCreateBadge(goalId as GoalId, {
    ...(designJsonForBake ? { design: designJsonForBake } : {}),
    ...(pendingCapturedPng ? { freshCapturedPng: pendingCapturedPng } : {}),
    ...(fallbackPng ? { capturedPng: fallbackPng } : {}),
    enabled: phase === "celebration" && hasAnyBakeSource && userConfirmedBake,
  });
  const isBadgeCreating =
    badgeStatus === "building" ||
    badgeStatus === "signing" ||
    badgeStatus === "storing" ||
    badgeStatus === "baking";

  const [showConfetti, setShowConfetti] = useState(false);
  const [showBadgeModal, setShowBadgeModal] = useState(false);
  const hasShownModal = useRef(false);
  const capturedIsFirstBadge = useRef(false);

  useEffect(() => {
    if (phase === "celebration") {
      setShowConfetti(true);
    }
  }, [phase]);

  useEffect(() => {
    if (badgeStatus === "done" && badgeRow && !hasShownModal.current) {
      hasShownModal.current = true;
      capturedIsFirstBadge.current = allBadges.length === 1;
      setShowBadgeModal(true);
    }
  }, [badgeStatus, badgeRow, allBadges.length]);

  // Inline text note state
  const [noteText, setNoteText] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const textInputRef = useRef<TextInput>(null);

  const trimmedNote = noteText.trim();
  const canSaveNote =
    trimmedNote.length > 0 && trimmedNote.length <= MAX_NOTE_LENGTH;

  const badgeDesignJson = (badgeRow?.design as string | null) ?? null;
  const goalDesignJson = (goal?.design as string | null) ?? null;
  const previewDesign = useMemo<BadgeDesign | null>(() => {
    if (pendingDesignJson) {
      const parsed = parseBadgeDesign(pendingDesignJson);
      if (parsed) return parsed;
    }
    // goal.design sits between warm pending and post-bake badge tiers:
    // pre-bake the badge row doesn't exist yet, so goal.design is the only
    // configured-design source after cold start. Post-bake, the badge row
    // wins because it holds the bake-time snapshot.
    if (goalDesignJson) {
      const parsed = parseBadgeDesign(goalDesignJson);
      if (parsed) return parsed;
    }
    if (badgeDesignJson) {
      const parsed = parseBadgeDesign(badgeDesignJson);
      if (parsed) return parsed;
    }
    if (!goal) return null;
    return createDefaultBadgeDesign(goalTitleForDefault, goalColorForDefault);
  }, [
    pendingDesignJson,
    goalDesignJson,
    badgeDesignJson,
    goal,
    goalTitleForDefault,
    goalColorForDefault,
  ]);

  const handleSaveInlineNote = useCallback(() => {
    if (!canSaveNote || savingNote) return;

    setSavingNote(true);
    try {
      createEvidence({
        goalId: goalId as GoalId,
        type: EvidenceType.text,
        uri: `${TEXT_EVIDENCE_PREFIX}${trimmedNote}`,
        description: undefined,
      });
      AccessibilityInfo.announceForAccessibility(
        tCompletion("completion:evidencePhase.noteSavedA11y"),
      );
    } catch (error) {
      logger.error("Failed to save inline text note", { goalId, error });
      reportError(error, { area: "completion.flow" });
    } finally {
      setSavingNote(false);
    }
  }, [canSaveNote, savingNote, goalId, trimmedNote, tCompletion]);

  if (!goal) {
    return (
      <View style={styles.centered}>
        <Text variant="body">
          {tCompletion("completion:errors.goalNotFound")}
        </Text>
      </View>
    );
  }

  const handleAddEvidence = () => {
    const routeName = EVIDENCE_ROUTE_MAP[EvidenceType.photo];
    if (!routeName) return;
    navigation.navigate(routeName, { goalId });
  };

  const handleEvidenceTypePress = (evType: EvidenceTypeValue) => {
    const routeName = EVIDENCE_ROUTE_MAP[evType];
    if (!routeName) return;
    navigation.navigate(routeName, { goalId });
  };

  const handleViewJourney = () => {
    navigation.navigate("TimelineJourney", { goalId });
  };

  const handleBakeIt = () => setUserConfirmedBake(true);

  const handleRedesignFirst = () => {
    if (badgeRow) {
      navigation.navigate("BadgeDesigner", {
        mode: "redesign",
        badgeId: String(badgeRow.id),
      });
      return;
    }
    // Re-stash the consumed design so the designer pre-loads it on return.
    if (pendingDesignJson && pendingCapturedPng) {
      pendingDesignStore.set(goalId, {
        designJson: pendingDesignJson,
        pngBase64: pendingCapturedPng.toString("base64"),
      });
    }
    navigation.navigate("BadgeDesigner", {
      mode: "new-goal",
      goalId,
      returnVia: "back",
    });
  };

  const isCompleted = goal?.status === GoalStatus.completed;
  const showBakeChoice = !userConfirmedBake && !isCompleted;

  const handleReopenGoal = () => {
    uncompleteGoal(goalId as GoalId);
    // replace, not navigate — back to the celebration screen would re-show BadgeEarnedModal.
    navigation.replace("FocusMode", { goalId });
  };

  const handleViewBadge = () => {
    setShowBadgeModal(false);
    if (!badgeRow) return;
    const parentNav = navigation.getParent<NavigationProp<RootTabParamList>>();
    if (parentNav) {
      parentNav.navigate("BadgesTab", {
        screen: "BadgeDetail",
        params: { badgeId: String(badgeRow.id) },
      });
    } else {
      logger.warn(
        "Could not navigate to badge detail — parent tab navigator not found",
      );
    }
  };

  const handleDismissBadgeModal = () => {
    setShowBadgeModal(false);
  };

  // Mounted in both phases so the PNG is ready before the user reaches celebration.
  // The wrapper is purely an offscreen positioning host now — capture goes through
  // the BadgeRenderer's imperative handle (Svg.toDataURL), not the view buffer.
  //
  // While captureInFlight is true, we render with the pinned design even if the
  // live fallbackDesign has gone null — see pinnedHostDesignRef.
  const hostDesign = captureInFlight
    ? pinnedHostDesignRef.current
    : fallbackDesign;
  const fallbackHost = hostDesign ? (
    <View
      collapsable={false}
      style={styles.fallbackCaptureHost}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      testID="completion-fallback-capture-host"
    >
      <BadgeRenderer
        ref={fallbackRef}
        design={hostDesign}
        size={160}
        showShadow={false}
      />
    </View>
  ) : null;

  if (phase === "evidence-prompt") {
    return (
      <KeyboardAvoidingView style={{ flex: 1 }} {...KEYBOARD_AVOIDING_PROPS}>
        {fallbackHost}
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View
            style={styles.card}
            accessible={false}
            accessibilityRole="summary"
            accessibilityLabel={tCompletion(
              "completion:evidencePhase.summaryA11y",
              {
                title: goal.title,
              },
            )}
          >
            <View style={styles.iconContainer} accessibilityElementsHidden>
              <Text style={styles.iconEmoji}>{"\u{1F3C6}"}</Text>
            </View>
            <Text
              variant="headline"
              style={styles.headline}
              accessibilityRole="header"
            >
              {tCompletion("completion:evidencePhase.title")}
            </Text>
            <Text variant="body" style={styles.summary}>
              {tCompletion("completion:evidencePhase.summary", {
                title: goal.title,
              })}
            </Text>

            {/* Inline text input — one-tap accessible */}
            <View style={styles.inlineNoteContainer} accessible={false}>
              <Text variant="label" style={styles.inlineNoteLabel}>
                {tCompletion("completion:evidencePhase.noteLabel")}
              </Text>
              <TextInput
                ref={textInputRef}
                style={styles.inlineNoteInput}
                placeholder={tCompletion(
                  "completion:evidencePhase.notePlaceholder",
                )}
                placeholderTextColor={theme.colors.textMuted}
                value={noteText}
                onChangeText={setNoteText}
                multiline
                textAlignVertical="top"
                maxLength={MAX_NOTE_LENGTH}
                testID="completion-note-input"
                accessible
                accessibilityLabel={tCompletion(
                  "completion:evidencePhase.noteA11yLabel",
                )}
                accessibilityHint={tCompletion(
                  "completion:evidencePhase.noteA11yHint",
                )}
              />
              <Button
                label={tCompletion("completion:evidencePhase.saveNote")}
                onPress={handleSaveInlineNote}
                disabled={!canSaveNote}
                loading={savingNote}
                variant="primary"
                testID="completion-save-note-button"
              />
            </View>

            {/* Evidence type chips for other capture methods */}
            <View style={styles.evidenceChips}>
              <Text variant="label" style={styles.evidenceChipsLabel}>
                {tCompletion("completion:evidencePhase.otherWays")}
              </Text>
              <View style={styles.evidenceChipRow}>
                {EVIDENCE_OPTIONS.filter(
                  (opt) => opt.type !== EvidenceType.text,
                ).map((opt) => (
                  <Button
                    key={opt.type}
                    icon={opt.icon}
                    label={evidenceLabel(tCompletion, opt.type)}
                    onPress={() => handleEvidenceTypePress(opt.type)}
                    variant="secondary"
                    size="sm"
                  />
                ))}
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {fallbackHost}
      <Confetti
        visible={showConfetti}
        onComplete={() => setShowConfetti(false)}
      />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View
          style={styles.card}
          accessible={false}
          accessibilityRole="summary"
          accessibilityLabel={
            stepRows.length === 0
              ? tCompletion("completion:celebration.summaryA11yNoSteps", {
                  title: goal.title,
                })
              : tCompletion("completion:celebration.summaryA11y", {
                  count: stepRows.length,
                  title: goal.title,
                })
          }
        >
          <View style={styles.iconContainer} accessibilityElementsHidden>
            <Text style={styles.iconEmoji}>{"\u{1F3AF}"}</Text>
          </View>
          <Text
            variant="headline"
            style={styles.headline}
            accessibilityRole="header"
          >
            {tCompletion("completion:celebration.title")}
          </Text>
          <Text variant="body" style={styles.summary}>
            {stepRows.length === 0
              ? tCompletion("completion:celebration.summaryNoSteps", {
                  title: goal.title,
                })
              : tCompletion("completion:celebration.summary", {
                  count: stepRows.length,
                  title: goal.title,
                })}
          </Text>

          {showBakeChoice && previewDesign && (
            <View
              style={styles.previewContainer}
              accessible
              accessibilityRole="image"
              accessibilityLabel={tCompletion(
                "completion:celebration.previewA11y",
              )}
              testID="completion-bake-preview"
            >
              <BadgeRenderer
                design={previewDesign}
                size={160}
                showShadow={false}
              />
            </View>
          )}

          {showBakeChoice ? (
            <View style={styles.actions}>
              <Button
                label={tCompletion("completion:celebration.bakeIt")}
                onPress={handleBakeIt}
                variant="primary"
                testID="completion-bake-it-button"
                // Prevents userConfirmedBake from flipping without a usable
                // source: the choice UI would disappear and post-bake actions
                // would render even though useCreateBadge is still disabled
                // (no PNG → enabled=false), letting the user navigate away
                // before the bake fires.
                disabled={!hasAnyBakeSource}
              />
              <Button
                label={tCompletion("completion:celebration.redesignFirst")}
                onPress={handleRedesignFirst}
                variant="secondary"
                testID="completion-redesign-first-button"
              />
            </View>
          ) : (
            <View style={styles.actions}>
              <Button
                label={tCompletion("completion:celebration.addFinalEvidence")}
                onPress={handleAddEvidence}
                variant={hasGoalEvidence ? "secondary" : "primary"}
              />
              <Button
                label={tCompletion("completion:celebration.viewJourney")}
                onPress={handleViewJourney}
                variant={hasGoalEvidence ? "primary" : "secondary"}
              />
              {isCompleted && (
                <Button
                  label={tCompletion("completion:celebration.reopenGoal")}
                  onPress={handleReopenGoal}
                  variant="secondary"
                />
              )}
            </View>
          )}

          {isBadgeCreating && (
            <View
              style={styles.badgeStatus}
              accessible
              accessibilityRole="none"
              accessibilityLiveRegion="polite"
              accessibilityLabel={tCompletion("completion:badge.creatingA11y")}
            >
              <ActivityIndicator size="small" />
              <Text variant="label" style={styles.badgeStatusText}>
                {tCompletion("completion:badge.creating")}
              </Text>
            </View>
          )}

          {badgeStatus === "no-key" && (
            <View
              style={styles.badgeStatus}
              accessible
              accessibilityRole="alert"
              accessibilityLabel={tCompletion("completion:badge.noKeyA11y")}
            >
              <Text variant="label" style={styles.badgeStatusText}>
                {tCompletion("completion:badge.noKeyMessage")}
              </Text>
            </View>
          )}

          {badgeStatus === "error" && badgeError && (
            <View style={styles.badgeErrorContainer}>
              <View
                style={styles.badgeStatus}
                accessible
                accessibilityRole="alert"
                accessibilityLabel={tCompletion("completion:badge.errorA11y", {
                  message: badgeError,
                })}
              >
                <Text variant="label" style={styles.badgeStatusText}>
                  {tCompletion("completion:badge.errorMessage", {
                    message: badgeError,
                  })}
                </Text>
              </View>
              {/* Recovery from the terminal error state (#39): re-arms the
                  bake pipeline in place without leaving the celebration. */}
              <Button
                label={tCompletion("common:actions.retry")}
                onPress={retryBake}
                variant="secondary"
                testID="completion-retry-bake-button"
              />
            </View>
          )}

          {hasGoalEvidence && (
            <View style={styles.evidenceSection}>
              <Text variant="label" style={styles.evidenceSectionTitle}>
                {tCompletion("completion:celebration.evidenceListTitle")}
              </Text>
              {goalEvidenceRows.map((ev) => {
                const evType = validateEvidenceType(ev.type ?? "file");
                const icon = EVIDENCE_TYPE_ICONS[evType] ?? "\u{1F4C4}";
                return (
                  <View
                    key={ev.id}
                    style={styles.evidenceItem}
                    accessible
                    accessibilityRole="text"
                    accessibilityLabel={tCompletion(
                      "celebration.evidenceItemA11y",
                      {
                        type: ev.type ?? "file",
                        description: ev.description ?? ev.type ?? "",
                      },
                    )}
                  >
                    <Text style={styles.evidenceIcon}>{icon}</Text>
                    <Text
                      variant="body"
                      style={styles.evidenceLabel}
                      numberOfLines={1}
                    >
                      {ev.description ??
                        ev.type ??
                        tCompletion("completion:celebration.evidenceFallback")}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
      {badgeRow && (
        <BadgeEarnedModal
          visible={showBadgeModal}
          imageUri={badgeRow.imageUri ?? PLACEHOLDER_IMAGE_URI}
          isFirstBadge={capturedIsFirstBadge.current}
          onViewBadge={handleViewBadge}
          onContinue={handleDismissBadgeModal}
        />
      )}
    </View>
  );
}

export function CompletionFlowScreen({ route }: CompletionFlowScreenProps) {
  const navigation = useNavigation();
  const { t } = useTranslation(["completion"]);
  const { goalId } = route.params;

  // Consume outside the inner Suspense boundary so the entry survives
  // Evolu-triggered remounts (inner consume() ate the entry on first remount
  // before the bake-firing mount could see it). State, not ref, so a fresh
  // BadgeDesigner save during the same stack visit can flow through.
  const [pendingDesign, setPendingDesign] = useState(() =>
    pendingDesignStore.consume(goalId),
  );
  const [pendingCapturedPng, setPendingCapturedPng] = useState<
    Buffer | undefined
  >(() =>
    pendingDesign ? Buffer.from(pendingDesign.pngBase64, "base64") : undefined,
  );

  useFocusEffect(
    useCallback(() => {
      const fresh = pendingDesignStore.consume(goalId);
      if (!fresh) return;
      setPendingDesign(fresh);
      setPendingCapturedPng(Buffer.from(fresh.pngBase64, "base64"));
    }, [goalId]),
  );

  return (
    <View style={styles.container}>
      <ScreenSubHeader
        label={t("completion:title")}
        onBack={() => navigation.goBack()}
      />
      <ErrorBoundary>
        <Suspense
          fallback={
            <ActivityIndicator style={styles.loadingIndicator} size="large" />
          }
        >
          <CompletionContent
            goalId={goalId}
            pendingDesignJson={pendingDesign?.designJson}
            pendingCapturedPng={pendingCapturedPng}
          />
        </Suspense>
      </ErrorBoundary>
      <ModeIndicator mode="complete" />
    </View>
  );
}
