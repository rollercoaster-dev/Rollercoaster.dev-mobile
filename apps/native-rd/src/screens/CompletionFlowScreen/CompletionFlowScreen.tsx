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
  Image,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  AccessibilityInfo,
} from "react-native";
import type { ImageSourcePropType } from "react-native";
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

/**
 * Optional image override for the completion icon.
 * Set to an image source (e.g. require('../../../assets/icon.png')) to use an image,
 * or leave as undefined to use the default emoji.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const COMPLETION_ICON: ImageSourcePropType | undefined = undefined;

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

  // Re-completion = the user already has a badge for this goal and reopened
  // it (status flipped back to active). Distinct from first completion in
  // three ways: (1) the bake writes via updateBadge, not createBadge;
  // (2) the evidence-prompt phase shows even when prior evidence exists,
  // because the persisted rows are the previous bake's; (3) the celebration
  // preview seeds from the existing badge's design.
  const isReCompletion =
    Boolean(badgeRow) && goal?.status !== GoalStatus.completed;

  // Anchor for re-completion's count-based evidence-prompt advance: capture
  // the evidence count at mount so we can detect "the user added something
  // new this session" without depending on whether old evidence exists.
  const initialEvidenceCount = useRef(goalEvidenceRows.length);
  const hasFreshEvidence =
    goalEvidenceRows.length > initialEvidenceCount.current;

  // Phase: first completion uses hasGoalEvidence (existing rule).
  // Re-completion always lands on evidence-prompt and only advances after
  // fresh evidence is added — old rows are the previous bake's snapshot.
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

  // Default-design fallback for FIRST completion only — re-completion uses
  // the existing on-disk PNG via useCreateBadge's readBadgePNG path, so we
  // skip the offscreen capture host entirely (and dodge its known
  // transparent-snapshot race). Render an offscreen BadgeRenderer with the
  // design-system default (rounded-rectangle + first-letter monogram),
  // capture once, and feed the PNG into useCreateBadge.
  const goalTitleForDefault = (goal?.title as string | null) ?? "";
  const goalColorForDefault = (goal?.color as string | null) ?? null;
  const fallbackDesign: BadgeDesign | null =
    !pendingCapturedPng && goal && !badgeRow
      ? createDefaultBadgeDesign(goalTitleForDefault, goalColorForDefault)
      : null;
  const fallbackRef = useRef<View | null>(null);
  const [fallbackPng, setFallbackPng] = useState<Buffer | null>(null);
  const [fallbackHostLaidOut, setFallbackHostLaidOut] = useState(false);
  const fallbackCaptureStarted = useRef(false);

  useEffect(() => {
    if (pendingCapturedPng || !fallbackDesign || fallbackPng) return;
    if (!fallbackHostLaidOut) return; // wait for the offscreen view to be attached + measured
    if (fallbackCaptureStarted.current) return;
    fallbackCaptureStarted.current = true;
    const dimensions = getCaptureDimensions(
      fallbackDesign,
      undefined,
      getRendererLayoutOptions(theme),
    );
    captureBadge(fallbackRef, dimensions)
      .then((buf) => setFallbackPng(buf))
      .catch((err) => {
        logger.error("Default-design capture failed", { goalId, error: err });
        reportError(err, { area: "badge.create", kind: "bake" });
        fallbackCaptureStarted.current = false;
      });
  }, [
    pendingCapturedPng,
    fallbackDesign,
    fallbackPng,
    fallbackHostLaidOut,
    theme,
    goalId,
  ]);

  const designJsonForBake =
    pendingDesignJson ??
    (fallbackDesign && fallbackPng
      ? JSON.stringify(fallbackDesign)
      : undefined);

  // Tracks the user's explicit pre-bake confirmation. The bake never fires
  // automatically — it waits for either an explicit Bake It tap or for the
  // outer screen to deliver a fresh PNG from BadgeDesigner (Redesign First
  // round-trip, treated as implicit confirmation since the user already
  // committed to this design via Save).
  const [userConfirmedBake, setUserConfirmedBake] = useState(false);
  useEffect(() => {
    if (pendingCapturedPng) setUserConfirmedBake(true);
  }, [pendingCapturedPng]);

  // Source of truth for "is there anything to bake into?"
  //   - Fresh capture from the designer wins.
  //   - The offscreen-host fallback covers first completion default-design.
  //   - On re-completion, the hook's readBadgePNG path uses the existing
  //     on-disk image, so an existing imageUri also counts as a bake source.
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

  // Start confetti when entering celebration phase
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

  // Preview design for the celebration phase. Always a real design — never
  // a placeholder. Source order:
  //   1. Pending design just saved from BadgeDesigner (wins).
  //   2. Existing badge's stored design (re-completion).
  //   3. Default design from goal title + color (first completion without
  //      a designer visit).
  const previewDesign = useMemo<BadgeDesign | null>(() => {
    if (pendingDesignJson) {
      const parsed = parseBadgeDesign(pendingDesignJson);
      if (parsed) return parsed;
    }
    if (badgeRow?.design) {
      const parsed = parseBadgeDesign(badgeRow.design as string);
      if (parsed) return parsed;
    }
    if (!goal) return null;
    return createDefaultBadgeDesign(goalTitleForDefault, goalColorForDefault);
  }, [
    pendingDesignJson,
    badgeRow,
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
    navigation.navigate("BadgeDesigner", { mode: "new-goal", goalId });
  };

  const isCompleted = goal?.status === GoalStatus.completed;
  const showBakeChoice = !userConfirmedBake && !isCompleted;

  const handleReopenGoal = () => {
    uncompleteGoal(goalId as GoalId);
    // replace so a back gesture doesn't drop the user back into the
    // just-left celebration screen (which would re-show BadgeEarnedModal).
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

  const handleCustomizeBadge = () => {
    setShowBadgeModal(false);
    if (!badgeRow) {
      logger.warn(
        "handleCustomizeBadge: badgeRow is null — cannot navigate to designer",
      );
      return;
    }
    navigation.navigate("BadgeDesigner", {
      mode: "redesign",
      badgeId: String(badgeRow.id),
    });
  };

  const handleDismissBadgeModal = () => {
    setShowBadgeModal(false);
  };

  // Offscreen host for the default-design capture. Rendered in both phases
  // so the PNG is ready by the time the user transitions to celebration.
  const fallbackHost = fallbackDesign ? (
    <View
      ref={fallbackRef}
      collapsable={false}
      style={styles.fallbackCaptureHost}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      testID="completion-fallback-capture-host"
      onLayout={(e) => {
        if (e.nativeEvent.layout.width > 0 && !fallbackHostLaidOut) {
          setFallbackHostLaidOut(true);
        }
      }}
    >
      <BadgeRenderer design={fallbackDesign} size={160} showShadow={false} />
    </View>
  ) : null;

  // Evidence prompt phase — capture evidence before celebration
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

  // Celebration phase — evidence exists, badge being created
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
            {COMPLETION_ICON ? (
              <Image
                source={COMPLETION_ICON}
                style={styles.iconImage}
                resizeMode="contain"
              />
            ) : (
              <Text style={styles.iconEmoji}>{"\u{1F3AF}"}</Text>
            )}
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

          {/*
            Pre-bake choice gate. The bake never fires automatically — the
            user picks Bake It or Redesign First. Skipped when the goal is
            already completed (a completed goal means the bake already
            landed, so the celebration is a view-only state).
          */}
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
          onCustomize={handleCustomizeBadge}
          onContinue={handleDismissBadgeModal}
        />
      )}
    </View>
  );
}

export function CompletionFlowScreen({ route }: CompletionFlowScreenProps) {
  const navigation = useNavigation();
  const { goalId } = route.params;

  // Consume the pending design at this level — outside the inner Suspense
  // boundary so the entry survives inner remounts when Evolu queries
  // resolve. (An inner useRef inside CompletionContent re-ran consume() on
  // every Suspense-triggered remount; the first remount ate the entry and
  // the later mount that actually fired the bake saw nothing.)
  //
  // We use state instead of a ref so a fresh entry from a later
  // BadgeDesigner save (Redesign First round-trip) — delivered while this
  // screen is still in the stack — can flow into the inner content.
  // useFocusEffect re-consumes on every focus return.
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
