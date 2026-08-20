/**
 * Nested leaf row for EditGoalView. It shares the hierarchy drag coordinator
 * with root rows, while explicit ↑/↓ and Un-nest controls preserve equivalent
 * screen-reader and reduced-motion access.
 *
 * Since #575 it also carries the same single pressable timing line as a root
 * row — sub-steps are full timing participants (D4), so the two row shapes stay
 * symmetric here too, in-row editor included (#576).
 */
import React from "react";
import {
  View,
  Text as RNText,
  TextInput,
  Pressable,
  type GestureResponderEvent,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { XCircle } from "phosphor-react-native";
import { useUnistyles } from "react-native-unistyles";
import Animated, {
  type SharedValue,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import type { AnimationPref } from "../../hooks/useAnimationPref";
import { getTimingConfig } from "../../utils/animation";
import { EvidenceTypePicker } from "../EvidenceTypePicker";
import { styles } from "./EditGoalView.styles";
import type { EditGoalSubStep, EditGoalTimingCopy } from "./EditGoalView";
import type { StepTimingValue } from "../StepTimingEditor";
import { EditGoalRowTiming } from "./EditGoalRowTiming";
import { HierarchyActionRow } from "./HierarchyActionRow";
import type { RowGeometry } from "./useEditGoalHierarchyDragTypes";
import { useRowGeometryRegistration } from "./useRowGeometryRegistration";

export interface EditGoalSubStepRowProps {
  subStep: EditGoalSubStep;
  isBeingDragged: boolean;
  /** Whether this sub-row's title is in inline-edit mode (state lives in the view). */
  isEditing: boolean;
  editText: string;
  onEditTextChange: (text: string) => void;
  onStartEditing: () => void;
  onCommitEditing: () => void;
  /**
   * Opens the evidence-type picker for this sub-step (D8/D12). Receives the
   * press event so the host can capture the chip's native tag and restore
   * screen-reader focus here when the sheet closes (#501).
   */
  onEvidenceChipPress: (event: GestureResponderEvent) => void;
  onDelete: () => void;
  onDragStart: (rowId: string) => void;
  onDragMove: (translationY: number, absoluteY: number) => void;
  onDragEnd: () => void;
  /** Register this sub-step's screen-absolute geometry (R3/R15). */
  registerRowLayout: (rowId: string, geometry: RowGeometry) => void;
  registerRemeasure: (rowId: string, fn: (() => void) | null) => void;
  dragScrollCompensation?: SharedValue<number>;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  showAccessibleControls: boolean;
  animationPref: AnimationPref;
  isFirst: boolean;
  isLast: boolean;
  /** When false, the row renders static (single sibling, or a title is being edited). */
  canDrag: boolean;
  /** Accessible un-nest control (R8) — a sub-step can promote to root. */
  canUnNest?: boolean;
  onUnNest?: () => void;
  /**
   * Opens timing authoring for this sub-step (#575). Omitted → the timing line
   * renders inert (chips when present, nothing otherwise — D7).
   */
  onEditTiming?: () => void;
  /** Whether this sub-step's timing editor is open (#575/D10, #576). */
  isTimingExpanded?: boolean;

  // --- Copy (i18n-free per D9; English defaults; [Integrate] passes t()). ---
  /** a11y label for the inline title-edit field. */
  editSubStepA11yLabel?: (subStepTitle: string) => string;
  /** a11y hint on the tap-to-edit title. */
  tapToEditHint?: string;
  /** a11y label for the evidence chip (opens the type picker). */
  editEvidenceLabel?: string;
  /** a11y label for the × delete affordance. */
  deleteSubStepLabel?: (subStepTitle: string) => string;
  /** a11y label for the clear control that empties the rename field. */
  clearSubStepTitleLabel?: string;
  /** a11y label for the ↑ reorder-up fallback button. */
  moveSubStepUpLabel?: (subStepTitle: string) => string;
  /** a11y label for the ↓ reorder-down fallback button. */
  moveSubStepDownLabel?: (subStepTitle: string) => string;
  /** a11y label for the un-nest button (R8). */
  unNestA11yLabel?: string;
  /** Unset-state timing prompt (#575). */
  whenPromptLabel?: string;
  /** a11y label for the timing line when nothing is set (#575). */
  editTimingUnsetA11yLabel?: (subStepTitle: string) => string;
  /** a11y label for the timing line when timing is set (#575). */
  editTimingSetA11yLabel?: (subStepTitle: string, lines: string[]) => string;
  // --- In-row timing editor (#576), all id-bound by the list layer. ---
  onCommitTiming?: (next: StepTimingValue) => void;
  onClearTiming?: () => void;
  onCollapseTiming?: () => void;
  /** The instant the editor judges "today" against. Required to mount it. */
  timingNow?: Date;
  timingLocale?: string;
  timingCopy?: EditGoalTimingCopy;
}

export function EditGoalSubStepRow({
  subStep,
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
  registerRowLayout,
  registerRemeasure,
  dragScrollCompensation,
  onMoveUp,
  onMoveDown,
  showAccessibleControls,
  animationPref,
  isFirst,
  isLast,
  canDrag,
  canUnNest = false,
  onUnNest,
  onEditTiming,
  isTimingExpanded = false,
  editSubStepA11yLabel = (subStepTitle) => `Edit sub-step: ${subStepTitle}`,
  tapToEditHint = "Tap to edit sub-step title",
  editEvidenceLabel = "Edit planned evidence",
  deleteSubStepLabel = (subStepTitle) => `Delete sub-step: ${subStepTitle}`,
  clearSubStepTitleLabel = "Clear sub-step title",
  moveSubStepUpLabel = (subStepTitle) => `Move "${subStepTitle}" up`,
  moveSubStepDownLabel = (subStepTitle) => `Move "${subStepTitle}" down`,
  unNestA11yLabel = "Promote this step to top level",
  whenPromptLabel,
  editTimingUnsetA11yLabel,
  editTimingSetA11yLabel,
  onCommitTiming,
  onClearTiming,
  onCollapseTiming,
  timingNow,
  timingLocale,
  timingCopy,
}: EditGoalSubStepRowProps) {
  const { theme } = useUnistyles();
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const isDragging = useSharedValue(false);
  const { ref: rowRef, measureAndRegister } = useRowGeometryRegistration(
    subStep.id,
    registerRowLayout,
    registerRemeasure,
  );

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
      runOnJS(onDragStart)(subStep.id);
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
      <View
        ref={rowRef}
        onLayout={measureAndRegister}
        style={styles.subStepRow}
      >
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
        {/* Mirrors EditGoalStepRow's clear control — wipes the field without
            committing or deleting the sub-step. */}
        {editText.length > 0 && (
          <Pressable
            style={styles.editClear}
            onPress={() => onEditTextChange("")}
            accessibilityRole="button"
            accessibilityLabel={clearSubStepTitleLabel}
            hitSlop={8}
            testID={`edit-goal-substep-clear-${subStep.id}`}
          >
            <XCircle
              size={20}
              weight="bold"
              color={theme.colors.textSecondary}
            />
          </Pressable>
        )}
      </View>
    );
  }

  const body = (
    <>
      <View style={styles.rowLead}>
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
      </View>
      <View style={styles.rowControls}>
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
      </View>
    </>
  );

  // Keep non-gesture hierarchy actions on their own line. A sub-step can show
  // up, down, and promote at once; placing that cluster beside evidence made
  // the fixed-width controls overlap the evidence chip on narrow screens.
  const accessibleActions = showAccessibleControls ? (
    <HierarchyActionRow
      testID={`edit-goal-substep-hierarchy-actions-${subStep.id}`}
      onMoveUp={!isFirst ? onMoveUp : undefined}
      onMoveDown={!isLast ? onMoveDown : undefined}
      onReparent={canUnNest ? onUnNest : undefined}
      moveUpLabel={moveSubStepUpLabel(subStep.title)}
      moveDownLabel={moveSubStepDownLabel(subStep.title)}
      reparentLabel={unNestA11yLabel}
      moveUpTestID={`edit-goal-substep-up-${subStep.id}`}
      moveDownTestID={`edit-goal-substep-down-${subStep.id}`}
      reparentTestID={`edit-goal-substep-un-nest-${subStep.id}`}
      reparentDirection="promote"
    />
  ) : null;

  // Measure and highlight the complete primary row band, including both the
  // title and controls. The separate accessible hierarchy actions move with
  // the item but remain outside this row's drag border and hover geometry.
  const primaryRow = (
    <View
      ref={rowRef}
      onLayout={measureAndRegister}
      style={[styles.subStepRow, isBeingDragged && styles.subStepRowDragging]}
    >
      {body}
    </View>
  );

  // One pressable timing target, between the row body and the accessible
  // hierarchy actions (D12) — a quick tap never reaches the row's
  // manual-activation Pan or its 400ms LongPress.
  const timingLine = (
    <EditGoalRowTiming
      chips={subStep.dateDepChips}
      isCompleted={subStep.isCompleted}
      title={subStep.title}
      timing={subStep.timing}
      onEditTiming={onEditTiming}
      isTimingExpanded={isTimingExpanded}
      onCommitTiming={onCommitTiming}
      onClearTiming={onClearTiming}
      onCollapseTiming={onCollapseTiming}
      now={timingNow}
      locale={timingLocale}
      copy={timingCopy}
      testID={`edit-goal-substep-timing-${subStep.id}`}
      whenPromptLabel={whenPromptLabel}
      editTimingUnsetA11yLabel={editTimingUnsetA11yLabel}
      editTimingSetA11yLabel={editTimingSetA11yLabel}
    />
  );

  if (!canDrag) {
    return (
      <View>
        {primaryRow}
        {timingLine}
        {accessibleActions}
      </View>
    );
  }

  // The flex-row layout (`subStepRow`) lives on the plain primaryRow View,
  // never on the Animated.View: unistyles styles handed straight to a reanimated
  // Animated.View aren't applied on web (no class injected), so `flexDirection:
  // "row"` would silently drop and the controls would stack under the title.
  // Mirrors StepList's DraggableStepItem and this file's own !canDrag branch.
  return (
    <GestureDetector gesture={composed}>
      <Animated.View style={animatedStyle}>
        {primaryRow}
        {timingLine}
        {accessibleActions}
      </Animated.View>
    </GestureDetector>
  );
}
