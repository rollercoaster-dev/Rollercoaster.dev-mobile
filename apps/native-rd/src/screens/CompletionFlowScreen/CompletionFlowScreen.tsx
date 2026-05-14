import { Suspense, useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  ScrollView,
  Image,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  AccessibilityInfo,
  Alert,
} from "react-native";
import type { ImageSourcePropType } from "react-native";
import { Buffer } from "buffer";
import {
  useNavigation,
  useIsFocused,
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
  returnAction,
}: {
  goalId: string;
  pendingDesignJson: string | undefined;
  pendingCapturedPng: Buffer | undefined;
  /**
   * Set when the user returns from BadgeDesigner via the rebake "Redesign
   * first" path. Consumed once on focus → flips `rebakeConfirmed` and is
   * then cleared via `navigation.setParams` so a later remount doesn't
   * auto-rebake again.
   */
  returnAction?: "rebake";
}) {
  const navigation =
    useNavigation<NativeStackNavigationProp<GoalsStackParamList>>();
  const isFocused = useIsFocused();
  const { theme } = useUnistyles();
  const rows = useQuery(goalsQuery);
  const goal = rows.find((r) => r.id === goalId);
  const stepRows = useQuery(stepsByGoalQuery(goalId as GoalId));
  const goalEvidenceRows = useQuery(evidenceByGoalQuery(goalId as GoalId));

  const badgeRows = useQuery(badgeByGoalQuery(goalId as GoalId));
  const badgeRow = badgeRows[0] ?? null;
  const allBadges = useQuery(badgesQuery);

  const hasGoalEvidence = goalEvidenceRows.length > 0;

  // Phase: start in celebration if evidence already exists, otherwise show prompt
  const [phase, setPhase] = useState<CompletionPhase>(
    hasGoalEvidence ? "celebration" : "evidence-prompt",
  );

  // Transition to celebration when evidence appears (e.g. after inline save or returning from capture screen)
  useEffect(() => {
    if (hasGoalEvidence && phase === "evidence-prompt") {
      setPhase("celebration");
      AccessibilityInfo.announceForAccessibility(
        "Evidence added! Generating your badge.",
      );
    }
  }, [hasGoalEvidence, phase]);

  // Offscreen capture host for either:
  //   (a) first completion without a pending design → fall back to the
  //       design-system default (rounded-rectangle + first-letter monogram), or
  //   (b) re-completion that needs a rebake → reuse the existing badge's
  //       persisted design (or default if the existing record has none).
  // Either way the captured PNG flows into useCreateBadge.capturedPng.
  const goalTitleForDefault = (goal?.title as string | null) ?? "";
  const goalColorForDefault = (goal?.color as string | null) ?? null;
  const existingDesignParsed: BadgeDesign | null = badgeRow?.design
    ? parseBadgeDesign(badgeRow.design as string)
    : null;
  const fallbackDesign: BadgeDesign | null =
    !pendingCapturedPng && goal
      ? (existingDesignParsed ??
        createDefaultBadgeDesign(goalTitleForDefault, goalColorForDefault))
      : null;
  const fallbackRef = useRef<View | null>(null);
  const [fallbackPng, setFallbackPng] = useState<Buffer | null>(null);
  const [fallbackHostLaidOut, setFallbackHostLaidOut] = useState(false);
  const fallbackCaptureStarted = useRef(false);
  // Track which design produced the cached PNG so a reactive design swap
  // (e.g. the user saved a fresh design via the Redesign-first flow) forces
  // a recapture rather than baking the stale image.
  const lastCapturedDesignKeyRef = useRef<string | null>(null);
  const fallbackDesignKey = fallbackDesign
    ? JSON.stringify(fallbackDesign)
    : null;

  useEffect(() => {
    if (
      fallbackDesignKey &&
      fallbackDesignKey !== lastCapturedDesignKeyRef.current
    ) {
      // Design changed since the last capture — invalidate so the capture
      // effect below re-fires with the new design.
      setFallbackPng(null);
      fallbackCaptureStarted.current = false;
    }
  }, [fallbackDesignKey]);

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
    const capturedKey = fallbackDesignKey;
    captureBadge(fallbackRef, dimensions)
      .then((buf) => {
        lastCapturedDesignKeyRef.current = capturedKey;
        setFallbackPng(buf);
      })
      .catch((err) => {
        logger.error("Default-design capture failed", { goalId, error: err });
        reportError(err, { area: "badge.create", kind: "bake" });
        fallbackCaptureStarted.current = false;
      });
  }, [
    pendingCapturedPng,
    fallbackDesign,
    fallbackDesignKey,
    fallbackPng,
    fallbackHostLaidOut,
    theme,
    goalId,
  ]);

  // The pending design store is the deliberate "I just designed this" path —
  // its PNG is authoritative. The offscreen-host PNG is opportunistic and
  // should only feed the bake when nothing better exists.
  const designJsonForBake =
    pendingDesignJson ??
    (fallbackDesign && fallbackPng
      ? JSON.stringify(fallbackDesign)
      : undefined);
  const hasReadableExistingPng = Boolean(
    badgeRow?.imageUri && badgeRow.imageUri !== PLACEHOLDER_IMAGE_URI,
  );
  const hasAnyPngForBake =
    pendingCapturedPng !== undefined ||
    fallbackPng !== null ||
    hasReadableExistingPng;

  // Tracks whether the user has approved a rebake via the Alert (either
  // "Rebake" outright, or after returning from BadgeDesigner via "Redesign
  // first"). Passed through to useCreateBadge so it can move from
  // `rebake-required` to actually rebaking.
  const [rebakeConfirmed, setRebakeConfirmed] = useState(false);

  // Only create badge when evidence exists AND we have something to bake into.
  const { status: badgeStatus, error: badgeError } = useCreateBadge(
    goalId as GoalId,
    {
      ...(designJsonForBake ? { design: designJsonForBake } : {}),
      ...(pendingCapturedPng ? { freshCapturedPng: pendingCapturedPng } : {}),
      ...(fallbackPng ? { capturedPng: fallbackPng } : {}),
      enabled: phase === "celebration" && hasAnyPngForBake,
      confirmRebake: rebakeConfirmed,
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
  // Latched true once the hook has reported `rebake-required` this session,
  // so when status flips to `done` the modal can pick the rebake variant.
  // Survives the post-bake reactive `existingBadge` update.
  const [didRebake, setDidRebake] = useState(false);

  // Start confetti when entering celebration phase
  useEffect(() => {
    if (phase === "celebration") {
      setShowConfetti(true);
    }
  }, [phase]);

  useEffect(() => {
    if (badgeStatus === "rebake-required") {
      setDidRebake(true);
    }
  }, [badgeStatus]);

  useEffect(() => {
    if (badgeStatus === "done" && badgeRow && !hasShownModal.current) {
      hasShownModal.current = true;
      capturedIsFirstBadge.current = allBadges.length === 1;
      setShowBadgeModal(true);
    }
  }, [badgeStatus, badgeRow, allBadges.length]);

  // Consume the rebake-return signal once on focus: flip `rebakeConfirmed`
  // (so useCreateBadge advances out of `rebake-required`) and immediately
  // clear the route param so a later focus / remount doesn't re-trigger.
  useEffect(() => {
    if (!isFocused || returnAction !== "rebake") return;
    setRebakeConfirmed(true);
    navigation.setParams({ returnAction: undefined });
  }, [isFocused, returnAction, navigation]);

  // Alert dispatch — one per focus session, re-fired when the screen
  // regains focus (e.g. user backed out of the designer without saving).
  const alertShownThisFocusRef = useRef(false);
  useEffect(() => {
    if (!isFocused) {
      alertShownThisFocusRef.current = false;
      return;
    }
    if (badgeStatus !== "rebake-required") return;
    if (rebakeConfirmed) return;
    if (alertShownThisFocusRef.current) return;
    if (!badgeRow) return;
    alertShownThisFocusRef.current = true;
    const badgeId = String(badgeRow.id);
    Alert.alert(
      "Rebake your badge?",
      "Things changed since you last earned this. Rebake replaces the original.",
      [
        {
          text: "Cancel",
          style: "cancel",
          onPress: () => navigation.goBack(),
        },
        {
          text: "Rebake",
          onPress: () => setRebakeConfirmed(true),
        },
        {
          text: "Redesign first",
          onPress: () =>
            navigation.navigate("BadgeDesigner", {
              mode: "redesign",
              badgeId,
              returnAction: "rebake",
            }),
        },
      ],
    );
  }, [isFocused, badgeStatus, rebakeConfirmed, badgeRow, navigation]);

  // Inline text note state
  const [noteText, setNoteText] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const textInputRef = useRef<TextInput>(null);

  const trimmedNote = noteText.trim();
  const canSaveNote =
    trimmedNote.length > 0 && trimmedNote.length <= MAX_NOTE_LENGTH;

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

  const isCompleted = goal?.status === GoalStatus.completed;

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
          isRebake={didRebake}
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
  const { goalId, returnAction } = route.params;

  // Consume the pending design ONCE at this level — outside the inner Suspense
  // boundary so the ref survives inner remounts when Evolu queries resolve.
  // (An inner useRef inside CompletionContent was re-running consume() on every
  // Suspense-triggered remount; the first remount ate the entry and the
  // later mount whose useCreateBadge effect actually fires saw nothing.)
  const pendingDesignRef = useRef(pendingDesignStore.consume(goalId));
  const pendingDesign = pendingDesignRef.current;
  const pendingCapturedPngRef = useRef(
    pendingDesign ? Buffer.from(pendingDesign.pngBase64, "base64") : undefined,
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
            pendingCapturedPng={pendingCapturedPngRef.current}
            returnAction={returnAction}
          />
        </Suspense>
      </ErrorBoundary>
      <ModeIndicator mode="complete" />
    </View>
  );
}
