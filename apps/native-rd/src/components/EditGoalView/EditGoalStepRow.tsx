/**
 * EditGoalStepRow — one step row inside EditGoalView (issue #445).
 *
 * One parent step: drag handle + step number + tap-to-edit title (D10) + a
 * planned-evidence chip (reused EvidenceTypePicker `compact`, one pill per
 * planned type — D4) that opens the type picker on tap (D8), plus an optional
 * display-only date/dependency chip row (D5, rendered only when present).
 *
 * The optional `children` slot renders inside the card, below the row — the
 * parent (EditGoalView) passes the one-level sub-steps block there (D12)
 * so it drags with the parent card. This row owns none of the sub-step state.
 *
 * Drag reuses the same LongPress + Pan gesture shape as StepList's
 * DraggableStepItem, stripped of all nesting/dwell state — the parent
 * (EditGoalView) owns reorder math and auto-scroll. A visible ↑/↓ fallback
 * appears when a screen reader is active or motion is off, so keyboard/VoiceOver
 * users are never drag-only.
 */
import React from "react";
import { View, Text as RNText, TextInput, Pressable } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useUnistyles } from "react-native-unistyles";
import Animated, {
  type SharedValue,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import { ArrowUp, ArrowDown } from "phosphor-react-native";
import type { AnimationPref } from "../../hooks/useAnimationPref";
import { getTimingConfig } from "../../utils/animation";
import { IconButton } from "../IconButton";
import { EvidenceTypePicker } from "../EvidenceTypePicker";
import { styles } from "./EditGoalView.styles";
import type { EditGoalChipTone, EditGoalStep } from "./EditGoalView";

// Date/dependency chip glyphs, transcribed from the App Shell prototype's
// `edit` route (subOf/editSteps): after ↩ / waiting ⏳ / due ▦.
const CHIP_GLYPH: Record<EditGoalChipTone, string> = {
  after: "↩",
  waiting: "⏳",
  due: "▦",
};

export interface EditGoalStepRowProps {
  step: EditGoalStep;
  index: number;
  /** 1-based display number shown before the title. */
  stepNumber: number;
  isBeingDragged: boolean;
  /** Whether this row's title is in inline-edit mode (D10; state lives in the view). */
  isEditing: boolean;
  editText: string;
  onEditTextChange: (text: string) => void;
  onStartEditing: () => void;
  onCommitEditing: () => void;
  /** Opens the evidence-type picker for this step (D8). */
  onEvidenceChipPress: () => void;
  onDragStart: (index: number) => void;
  onDragMove: (translationY: number, absoluteY: number) => void;
  onDragEnd: () => void;
  dragScrollCompensation?: SharedValue<number>;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  showAccessibleControls: boolean;
  animationPref: AnimationPref;
  isFirst: boolean;
  isLast: boolean;
  /** When false, the row renders static (single step, or a title is being edited). */
  canDrag: boolean;
  /** Signal intent to delete this step (D1) — opens the confirm modal in the view. */
  onDelete: () => void;
  /** Rendered inside the card below the row — the sub-steps block (D12). */
  children?: React.ReactNode;

  // --- Copy (i18n-free per D9; English defaults; [Integrate] passes t()). ---
  /** a11y label for the inline title-edit field. */
  editStepA11yLabel?: (stepTitle: string) => string;
  /** a11y hint on the tap-to-edit title. */
  tapToEditHint?: string;
  /** a11y label for the evidence chip (opens the type picker). */
  editEvidenceLabel?: string;
  /** a11y label for the ↑ reorder-up fallback button. */
  moveUpLabel?: (stepTitle: string) => string;
  /** a11y label for the ↓ reorder-down fallback button. */
  moveDownLabel?: (stepTitle: string) => string;
  /** a11y label for the × delete affordance. */
  deleteStepLabel?: (stepTitle: string) => string;
}

export function EditGoalStepRow({
  step,
  index,
  stepNumber,
  isBeingDragged,
  isEditing,
  editText,
  onEditTextChange,
  onStartEditing,
  onCommitEditing,
  onEvidenceChipPress,
  onDragStart,
  onDragMove,
  onDragEnd,
  dragScrollCompensation,
  onMoveUp,
  onMoveDown,
  showAccessibleControls,
  animationPref,
  isFirst,
  isLast,
  canDrag,
  onDelete,
  children,
  editStepA11yLabel = (stepTitle) => `Edit step: ${stepTitle}`,
  tapToEditHint = "Tap to edit step title",
  editEvidenceLabel = "Edit planned evidence",
  moveUpLabel = (stepTitle) => `Move "${stepTitle}" up`,
  moveDownLabel = (stepTitle) => `Move "${stepTitle}" down`,
  deleteStepLabel = (stepTitle) => `Delete step: ${stepTitle}`,
}: EditGoalStepRowProps) {
  const { theme } = useUnistyles();
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const isDragging = useSharedValue(false);

  const timingQuick = getTimingConfig(animationPref, "quick");
  const timingNormal = getTimingConfig(animationPref, "normal");
  const noAnimation = animationPref === "none";

  const chipColor: Record<EditGoalChipTone, string> = {
    after: theme.colors.success,
    waiting: theme.colors.warning,
    due: theme.colors.textSecondary,
  };

  function resetDragState() {
    "worklet";
    const wasDragging = isDragging.value;
    translateY.value = noAnimation ? 0 : withTiming(0, timingNormal);
    scale.value = noAnimation ? 1 : withTiming(1, timingQuick);
    isDragging.value = false;
    if (wasDragging) runOnJS(onDragEnd)();
  }

  const longPress = Gesture.LongPress()
    .minDuration(400)
    .onStart(() => {
      isDragging.value = true;
      scale.value = noAnimation ? 1.02 : withTiming(1.02, timingQuick);
      runOnJS(onDragStart)(index);
    });

  const pan = Gesture.Pan()
    .manualActivation(true)
    .onTouchesMove((_e, stateManager) => {
      if (isDragging.value) {
        stateManager.activate();
      } else {
        stateManager.fail();
      }
    })
    .onUpdate((e) => {
      translateY.value = e.translationY;
      runOnJS(onDragMove)(e.translationY, e.absoluteY);
    })
    .onFinalize(resetDragState);

  const composed = Gesture.Simultaneous(longPress, pan);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value + (dragScrollCompensation?.value ?? 0) },
      { scale: scale.value },
    ],
    zIndex: isDragging.value ? 100 : 0,
  }));

  const body = isEditing ? (
    <View style={styles.rowMain}>
      <RNText
        style={styles.dragHandle}
        accessibilityElementsHidden
        importantForAccessibility="no"
      >
        {"≡"}
      </RNText>
      <TextInput
        style={styles.editInput}
        value={editText}
        onChangeText={onEditTextChange}
        onSubmitEditing={onCommitEditing}
        onBlur={onCommitEditing}
        autoFocus
        returnKeyType="done"
        selectTextOnFocus
        placeholderTextColor={theme.colors.textMuted}
        testID={`edit-goal-step-edit-${step.id}`}
        accessibilityLabel={editStepA11yLabel(step.title)}
      />
    </View>
  ) : (
    <>
      <View style={styles.rowMain}>
        <View style={styles.rowLead}>
          <RNText
            style={styles.dragHandle}
            accessibilityElementsHidden
            importantForAccessibility="no"
          >
            {"≡"}
          </RNText>
          <RNText style={styles.stepNumber}>{stepNumber}</RNText>
          <Pressable
            style={styles.rowTitlePress}
            onPress={onStartEditing}
            accessibilityRole="button"
            accessibilityLabel={step.title}
            accessibilityHint={tapToEditHint}
            testID={`edit-goal-step-title-${step.id}`}
          >
            <RNText style={styles.rowTitleText}>{step.title}</RNText>
          </Pressable>
        </View>
        <View style={styles.rowControls}>
          <Pressable
            style={styles.evidenceChip}
            onPress={onEvidenceChipPress}
            accessibilityRole="button"
            accessibilityLabel={editEvidenceLabel}
            hitSlop={8}
            testID={`edit-goal-step-evidence-${step.id}`}
          >
            <EvidenceTypePicker
              selectedTypes={step.plannedEvidenceTypes}
              compact
            />
          </Pressable>
          {showAccessibleControls && (
            <View style={styles.reorderButtons}>
              {onMoveUp && !isFirst && (
                <IconButton
                  icon={<ArrowUp size={18} weight="bold" />}
                  onPress={onMoveUp}
                  size="sm"
                  tone="ghost"
                  accessibilityLabel={moveUpLabel(step.title)}
                  testID={`edit-goal-step-up-${step.id}`}
                />
              )}
              {onMoveDown && !isLast && (
                <IconButton
                  icon={<ArrowDown size={18} weight="bold" />}
                  onPress={onMoveDown}
                  size="sm"
                  tone="ghost"
                  accessibilityLabel={moveDownLabel(step.title)}
                  testID={`edit-goal-step-down-${step.id}`}
                />
              )}
            </View>
          )}
          <Pressable
            style={styles.stepDelete}
            onPress={onDelete}
            accessibilityRole="button"
            accessibilityLabel={deleteStepLabel(step.title)}
            hitSlop={8}
            testID={`edit-goal-step-delete-${step.id}`}
          >
            <RNText style={styles.stepDeleteGlyph}>{"×"}</RNText>
          </Pressable>
        </View>
      </View>
      {step.dateDepChips && step.dateDepChips.length > 0 && (
        <View style={styles.chipRow}>
          {step.dateDepChips.map((chip, i) => (
            <View key={i} style={styles.dateDepChip}>
              <RNText
                style={[
                  styles.dateDepChipGlyph,
                  { color: chipColor[chip.tone] },
                ]}
                accessibilityElementsHidden
                importantForAccessibility="no"
              >
                {CHIP_GLYPH[chip.tone]}
              </RNText>
              <RNText
                style={[
                  styles.dateDepChipText,
                  { color: chipColor[chip.tone] },
                ]}
              >
                {chip.text}
              </RNText>
            </View>
          ))}
        </View>
      )}
    </>
  );

  if (!canDrag) {
    return (
      <View style={styles.rowCard}>
        {body}
        {children}
      </View>
    );
  }

  // The GestureDetector wraps only the row body — the `children` slot (the
  // sub-step block, #459) stays inside the transformed Animated.View but
  // outside the detector, so the whole card still lifts/scales together while
  // dragging, yet a nested per-sub-step LongPress/Pan never double-fires this
  // row's drag (RNGH dispatches a touch to every detector whose view contains
  // it, with no implicit parent/child priority — D1).
  return (
    <Animated.View
      style={[
        styles.rowCard,
        isBeingDragged && styles.rowCardDragging,
        animatedStyle,
      ]}
    >
      <GestureDetector gesture={composed}>
        <View>{body}</View>
      </GestureDetector>
      {children}
    </Animated.View>
  );
}
