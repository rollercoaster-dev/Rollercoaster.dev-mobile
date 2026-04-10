import { Suspense, useState, useRef, useEffect, useCallback } from "react";
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
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, type NavigationProp } from "@react-navigation/native";
import { useQuery } from "@evolu/react";
import { useUnistyles } from "react-native-unistyles";
import { Text } from "../../components/Text";
import { ErrorBoundary } from "../../components/ErrorBoundary";
import { Button } from "../../components/Button";
import { IconButton } from "../../components/IconButton";
import { Confetti } from "../../components/Confetti";
import { ModeIndicator } from "../../components/ModeIndicator";
import { BadgeEarnedModal } from "../BadgeEarnedModal";
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

function CompletionContent({ goalId }: { goalId: string }) {
  const navigation = useNavigation<NavigationProp<GoalsStackParamList>>();
  const rows = useQuery(goalsQuery);
  const goal = rows.find((r) => r.id === goalId);
  const stepRows = useQuery(stepsByGoalQuery(goalId as GoalId));
  const goalEvidenceRows = useQuery(evidenceByGoalQuery(goalId as GoalId));

  const badgeRows = useQuery(badgeByGoalQuery(goalId as GoalId));
  const badgeRow = badgeRows[0] ?? null;
  const allBadges = useQuery(badgesQuery);

  // consume() reads and deletes — prevents accumulation in the in-memory Map
  const pendingDesignRef = useRef(pendingDesignStore.consume(goalId));
  const pendingDesign = pendingDesignRef.current;

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

  // Only create badge when in celebration phase (evidence exists)
  const { status: badgeStatus, error: badgeError } = useCreateBadge(
    goalId as GoalId,
    {
      ...(pendingDesign ? { design: pendingDesign } : {}),
      enabled: phase === "celebration",
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
    navigation.navigate("FocusMode", { goalId });
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

  // Evidence prompt phase — capture evidence before celebration
  if (phase === "evidence-prompt") {
    return (
      <KeyboardAvoidingView style={{ flex: 1 }} {...KEYBOARD_AVOIDING_PROPS}>
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
  const { theme } = useUnistyles();

  return (
    <SafeAreaView
      edges={["top"]}
      style={{ flex: 1, backgroundColor: theme.colors.background }}
    >
      <View style={styles.topBar}>
        <IconButton
          icon={
            <Text variant="body" style={styles.backIcon}>
              {"<"}
            </Text>
          }
          onPress={() => navigation.goBack()}
          accessibilityLabel="Go back"
          size="sm"
        />
        <Text variant="label">Complete</Text>
        <View style={styles.spacer} />
      </View>
      <ErrorBoundary>
        <Suspense
          fallback={
            <ActivityIndicator style={styles.loadingIndicator} size="large" />
          }
        >
          <CompletionContent goalId={route.params.goalId} />
        </Suspense>
      </ErrorBoundary>
      <ModeIndicator mode="complete" />
    </SafeAreaView>
  );
}
