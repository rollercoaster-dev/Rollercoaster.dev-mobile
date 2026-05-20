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
      "Evidence added! Generating your badge.",
    );
  }, [phase, isReCompletion, hasFreshEvidence, hasGoalEvidence]);

  // First-completion-only fallback: re-completion reuses the existing
  // on-disk PNG via readBadgePNG.
  //
  // Hydration precedence when there's no warm pendingCapturedPng:
  //   1. goal.design — persisted source; survives cold start and Evolu sync,
  //      unlike the in-memory pendingDesignStore.
  //   2. createDefaultBadgeDesign — synthesized default (true last resort).
  const goalTitleForDefault = (goal?.title as string | null) ?? "";
  const goalColorForDefault = (goal?.color as string | null) ?? null;
  const persistedGoalDesign = parseBadgeDesign(
    (goal?.design as string | null) ?? null,
  );
  const fallbackDesign: BadgeDesign | null =
    !pendingCapturedPng && goal && !badgeRow
      ? (persistedGoalDesign ??
        createDefaultBadgeDesign(goalTitleForDefault, goalColorForDefault))
      : null;
  const fallbackRef = useRef<BadgeRendererHandle | null>(null);
  const [fallbackPng, setFallbackPng] = useState<Buffer | null>(null);
  const [captureInFlight, setCaptureInFlight] = useState(false);
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
    if (captureInFlight) return;
    pinnedHostDesignRef.current = fallbackDesign;
    setCaptureInFlight(true);
    const dimensions = getCaptureDimensions(
      fallbackDesign,
      undefined,
      getRendererLayoutOptions(theme),
    );
    // Two animation frames let iOS run a layout pass and commit the view
    // tree before the bridge dispatches toDataURL. JS ref attachment
    // happens before the native view is registered in RCTViewRegistry on
    // the same tick — dispatching synchronously races the registration.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        captureBadge(fallbackRef, dimensions)
          .then((buf) => setFallbackPng(buf))
          .catch((err) => {
            logger.error("Default-design capture failed", {
              goalId,
              error: err,
            });
            reportError(err, { area: "badge.create", kind: "bake" });
          })
          .finally(() => {
            setCaptureInFlight(false);
            pinnedHostDesignRef.current = null;
          });
      });
    });
  }, [
    pendingCapturedPng,
    fallbackDesign,
    fallbackPng,
    theme,
    goalId,
    captureInFlight,
  ]);

  const designJsonForBake =
    pendingDesignJson ??
    (fallbackDesign && fallbackPng
      ? JSON.stringify(fallbackDesign)
      : undefined);

  // Bake never auto-fires — the user always taps Bake It explicitly, even
  // when a fresh designer PNG is already in hand.
  const [userConfirmedBake, setUserConfirmedBake] = useState(false);

  const hasExistingBadgeImage = Boolean(
    badgeRow?.imageUri && badgeRow.imageUri !== PLACEHOLDER_IMAGE_URI,
  );
  const hasAnyBakeSource =
    pendingCapturedPng !== undefined ||
    fallbackPng !== null ||
    hasExistingBadgeImage;

  const { status: badgeStatus, error: badgeError } = useCreateBadge(
    goalId as GoalId,
    {
      ...(designJsonForBake ? { design: designJsonForBake } : {}),
      ...(pendingCapturedPng ? { freshCapturedPng: pendingCapturedPng } : {}),
      ...(fallbackPng ? { capturedPng: fallbackPng } : {}),
      enabled: phase === "celebration" && hasAnyBakeSource && userConfirmedBake,
    },
  );
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
      AccessibilityInfo.announceForAccessibility("Text note saved");
    } catch (error) {
      logger.error("Failed to save inline text note", { goalId, error });
      reportError(error, { area: "completion.flow" });
    } finally {
      setSavingNote(false);
    }
  }, [canSaveNote, savingNote, goalId, trimmedNote]);

  if (!goal) {
    return (
      <View style={styles.centered}>
        <Text variant="body">Goal not found.</Text>
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
            accessibilityLabel={`Almost there! Capture evidence for ${goal.title}`}
          >
            <View style={styles.iconContainer} accessibilityElementsHidden>
              <Text style={styles.iconEmoji}>{"\u{1F3C6}"}</Text>
            </View>
            <Text
              variant="headline"
              style={styles.headline}
              accessibilityRole="header"
            >
              One last thing!
            </Text>
            <Text variant="body" style={styles.summary}>
              Capture your achievement for {goal.title}
            </Text>

            {/* Inline text input — one-tap accessible */}
            <View style={styles.inlineNoteContainer} accessible={false}>
              <Text variant="label" style={styles.inlineNoteLabel}>
                Write about what you accomplished
              </Text>
              <TextInput
                ref={textInputRef}
                style={styles.inlineNoteInput}
                placeholder="What did you accomplish?"
                value={noteText}
                onChangeText={setNoteText}
                multiline
                textAlignVertical="top"
                maxLength={MAX_NOTE_LENGTH}
                testID="completion-note-input"
                accessible
                accessibilityLabel="Write about your achievement"
                accessibilityHint="Type a reflection about what you accomplished"
              />
              <Button
                label="Save Note"
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
                Or capture another way
              </Text>
              <View style={styles.evidenceChipRow}>
                {EVIDENCE_OPTIONS.filter(
                  (opt) => opt.type !== EvidenceType.text,
                ).map((opt) => (
                  <Button
                    key={opt.type}
                    label={`${opt.icon} ${opt.label}`}
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
          accessibilityLabel={`Congratulations! All ${stepRows.length} steps completed for ${goal.title}`}
        >
          <View style={styles.iconContainer} accessibilityElementsHidden>
            <Text style={styles.iconEmoji}>{"\u{1F3AF}"}</Text>
          </View>
          <Text
            variant="headline"
            style={styles.headline}
            accessibilityRole="header"
          >
            You did it!
          </Text>
          <Text variant="body" style={styles.summary}>
            All {stepRows.length} steps completed for {goal.title}
          </Text>

          {showBakeChoice && previewDesign && (
            <View
              style={styles.previewContainer}
              accessible
              accessibilityRole="image"
              accessibilityLabel="Badge preview before baking"
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
                label="Bake It"
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
                label="Redesign First"
                onPress={handleRedesignFirst}
                variant="secondary"
                testID="completion-redesign-first-button"
              />
            </View>
          ) : (
            <View style={styles.actions}>
              <Button
                label="Add Final Evidence"
                onPress={handleAddEvidence}
                variant={hasGoalEvidence ? "secondary" : "primary"}
              />
              <Button
                label="View Your Journey →"
                onPress={handleViewJourney}
                variant={hasGoalEvidence ? "primary" : "secondary"}
              />
              {isCompleted && (
                <Button
                  label="Reopen Goal"
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
              accessibilityLabel="Creating your badge..."
            >
              <ActivityIndicator size="small" />
              <Text variant="label" style={styles.badgeStatusText}>
                Creating your badge…
              </Text>
            </View>
          )}

          {badgeStatus === "no-key" && (
            <View
              style={styles.badgeStatus}
              accessible
              accessibilityRole="alert"
              accessibilityLabel="Badge could not be created: signing key unavailable"
            >
              <Text variant="label" style={styles.badgeStatusText}>
                Badge signing key unavailable
              </Text>
            </View>
          )}

          {badgeStatus === "error" && badgeError && (
            <View
              style={styles.badgeStatus}
              accessible
              accessibilityRole="alert"
              accessibilityLabel={`Badge creation failed: ${badgeError}`}
            >
              <Text variant="label" style={styles.badgeStatusText}>
                Badge creation failed: {badgeError}
              </Text>
            </View>
          )}

          {hasGoalEvidence && (
            <View style={styles.evidenceSection}>
              <Text variant="label" style={styles.evidenceSectionTitle}>
                Goal Evidence Added
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
                    accessibilityLabel={`${ev.type ?? "file"} evidence: ${ev.description ?? ev.type}`}
                  >
                    <Text style={styles.evidenceIcon}>{icon}</Text>
                    <Text
                      variant="body"
                      style={styles.evidenceLabel}
                      numberOfLines={1}
                    >
                      {ev.description ?? ev.type ?? "Evidence"}
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
      <ScreenSubHeader label="Complete" onBack={() => navigation.goBack()} />
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
