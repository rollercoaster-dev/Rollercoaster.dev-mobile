/**
 * EditGoalSubStepRow — one sub-step nested under a parent step inside
 * EditGoalView (D12). Rendered inside the parent card's mint-rail block.
 *
 * A leaf row: a functional `≡` drag handle + tap-to-edit title (D10) + a
 * planned-evidence chip (reused EvidenceTypePicker `compact`, one pill per
 * planned type — D4; opens the type picker on tap — D8) + a × delete button.
 *
 * Reorder-within-parent (#459) reuses the exact LongPress + Pan gesture shape
 * as EditGoalStepRow, stripped of all nesting/dwell state — the parent
 * (EditGoalSubStepList) owns reorder math and auto-scroll via useEditGoalDrag,
 * scoped to a single parent's siblings. The `≡` handle is hidden from screen
 * readers; a visible ↑/↓ fallback appears when a screen reader is active or
 * motion is off, so keyboard/VoiceOver users are never drag-only. A parent with
 * one sub-step renders the row static (`canDrag={false}`), no ↑/↓ buttons.
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
import type { EditGoalSubStep } from "./EditGoalView";

export interface EditGoalSubStepRowProps {
  subStep: EditGoalSubStep;
  index: number;
  isBeingDragged: boolean;
  /** Whether this sub-row's title is in inline-edit mode (state lives in the view). */
  isEditing: boolean;
  editText: string;
  onEditTextChange: (text: string) => void;
  onStartEditing: () => void;
  onCommitEditing: () => void;
  /** Opens the evidence-type picker for this sub-step (D8/D12). */
  onEvidenceChipPress: () => void;
  onDelete: () => void;
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
  /** When false, the row renders static (single sibling, or a title is being edited). */
  canDrag: boolean;

  // --- Copy (i18n-free per D9; English defaults; [Integrate] passes t()). ---
  /** a11y label for the inline title-edit field. */
  editSubStepA11yLabel?: (subStepTitle: string) => string;
  /** a11y hint on the tap-to-edit title. */
  tapToEditHint?: string;
  /** a11y label for the evidence chip (opens the type picker). */
  editEvidenceLabel?: string;
  /** a11y label for the × delete affordance. */
  deleteSubStepLabel?: (subStepTitle: string) => string;
  /** a11y label for the ↑ reorder-up fallback button. */
  moveSubStepUpLabel?: (subStepTitle: string) => string;
  /** a11y label for the ↓ reorder-down fallback button. */
  moveSubStepDownLabel?: (subStepTitle: string) => string;
}

export function EditGoalSubStepRow({
  subStep,
  index,
  isBeingDragged,
  isEditing,
  editText,
  onEditTextChange,
  onStartEditing,
  onCommitEditing,
  onEvidenceChipPress,
  onDelete,
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
  editSubStepA11yLabel = (subStepTitle) => `Edit sub-step: ${subStepTitle}`,
  tapToEditHint = "Tap to edit sub-step title",
  editEvidenceLabel = "Edit planned evidence",
  deleteSubStepLabel = (subStepTitle) => `Delete sub-step: ${subStepTitle}`,
  moveSubStepUpLabel = (subStepTitle) => `Move "${subStepTitle}" up`,
  moveSubStepDownLabel = (subStepTitle) => `Move "${subStepTitle}" down`,
}: EditGoalSubStepRowProps) {
  const { theme } = useUnistyles();
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const isDragging = useSharedValue(false);

  const timingQuick = getTimingConfig(animationPref, "quick");
  const timingNormal = getTimingConfig(animationPref, "normal");
  const noAnimation = animationPref === "none";

  const marker = (
    <RNText
      style={styles.subStepMarker}
      accessibilityElementsHidden
      importantForAccessibility="no"
    >
      {"≡"}
    </RNText>
  );

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

  if (isEditing) {
    return (
      <View style={styles.subStepRow}>
        {marker}
        <TextInput
          style={styles.subStepEditInput}
          value={editText}
          onChangeText={onEditTextChange}
          onSubmitEditing={onCommitEditing}
          onBlur={onCommitEditing}
          autoFocus
          returnKeyType="done"
          selectTextOnFocus
          placeholderTextColor={theme.colors.textMuted}
          testID={`edit-goal-substep-edit-${subStep.id}`}
          accessibilityLabel={editSubStepA11yLabel(subStep.title)}
        />
      </View>
    );
  }

  const body = (
    <>
      {marker}
      <Pressable
        style={styles.subStepTitlePress}
        onPress={onStartEditing}
        accessibilityRole="button"
        accessibilityLabel={subStep.title}
        accessibilityHint={tapToEditHint}
        testID={`edit-goal-substep-title-${subStep.id}`}
      >
        <RNText style={styles.subStepTitleText}>{subStep.title}</RNText>
      </Pressable>
      <Pressable
        style={styles.evidenceChip}
        onPress={onEvidenceChipPress}
        accessibilityRole="button"
        accessibilityLabel={editEvidenceLabel}
        hitSlop={8}
        testID={`edit-goal-substep-evidence-${subStep.id}`}
      >
        <EvidenceTypePicker
          selectedTypes={subStep.plannedEvidenceTypes}
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
              accessibilityLabel={moveSubStepUpLabel(subStep.title)}
              testID={`edit-goal-substep-up-${subStep.id}`}
            />
          )}
          {onMoveDown && !isLast && (
            <IconButton
              icon={<ArrowDown size={18} weight="bold" />}
              onPress={onMoveDown}
              size="sm"
              accessibilityLabel={moveSubStepDownLabel(subStep.title)}
              testID={`edit-goal-substep-down-${subStep.id}`}
            />
          )}
        </View>
      )}
      <Pressable
        style={styles.subStepDelete}
        onPress={onDelete}
        accessibilityRole="button"
        accessibilityLabel={deleteSubStepLabel(subStep.title)}
        hitSlop={8}
        testID={`edit-goal-substep-delete-${subStep.id}`}
      >
        <RNText style={styles.subStepDeleteGlyph}>{"×"}</RNText>
      </Pressable>
    </>
  );

  if (!canDrag) {
    return <View style={styles.subStepRow}>{body}</View>;
  }

  return (
    <GestureDetector gesture={composed}>
      <Animated.View
        style={[
          styles.subStepRow,
          isBeingDragged && styles.subStepRowDragging,
          animatedStyle,
        ]}
      >
        {body}
      </Animated.View>
    </GestureDetector>
  );
}
