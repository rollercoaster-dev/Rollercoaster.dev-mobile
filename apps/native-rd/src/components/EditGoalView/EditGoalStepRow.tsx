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
import React, { useRef, useState } from "react";
import {
  View,
  Text as RNText,
  TextInput,
  Pressable,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useUnistyles } from "react-native-unistyles";
import Animated, {
  type SharedValue,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import {
  ArrowUp,
  ArrowDown,
  ArrowBendDownRight,
  ArrowBendUpLeft,
} from "phosphor-react-native";
import type { AnimationPref } from "../../hooks/useAnimationPref";
import { getTimingConfig } from "../../utils/animation";
import { IconButton } from "../IconButton";
import { Button } from "../Button";
import { EvidenceTypePicker } from "../EvidenceTypePicker";
import { styles } from "./EditGoalView.styles";
import type { EditGoalChipTone, EditGoalStep } from "./EditGoalView";
import type { RowGeometry } from "./useEditGoalHierarchyDrag";

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
  /** Unified coordinator handlers, keyed by row id (#496, R2). */
  onDragStart: (rowId: string) => void;
  onDragMove: (translationY: number, absoluteY: number) => void;
  onDragEnd: () => void;
  /** Register the root header's screen-absolute geometry (R3/R4/R15). */
  registerRowLayout: (rowId: string, geometry: RowGeometry) => void;
  /** Register a remeasure callback so drag-start can refresh geometry (R15). */
  registerRemeasure: (rowId: string, fn: (() => void) | null) => void;
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
  /** Dwell-arm highlight on this root header (R12). */
  isArmedTarget?: boolean;
  /** Accessible nest-under control eligibility (R8). */
  canNestUnder?: boolean;
  nestTargets?: { id: string; title: string }[];
  onNestUnder?: (targetId: string) => void;
  /** Accessible un-nest control (R8) — a root with this step's children can't, a sub-step can. Not used on a root row. */
  canUnNest?: boolean;
  onUnNest?: () => void;
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
  /** a11y label for the “Nest under…” trigger (R8). */
  nestUnderTriggerA11yLabel?: string;
  /** Title of the nest-under picker modal. */
  nestUnderPickerTitle?: string;
  /** Row label inside the nest-under picker (receives the target title). */
  nestUnderRowLabel?: (targetTitle: string) => string;
  /** a11y label for a nest-under picker row. */
  nestUnderRowA11yLabel?: (targetTitle: string) => string;
  /** a11y label for the un-nest button (unused on a root row, kept for parity). */
  unNestA11yLabel?: string;
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
  onDelete,
  isArmedTarget = false,
  canNestUnder = false,
  nestTargets = [],
  onNestUnder,
  canUnNest = false,
  onUnNest,
  children,
  editStepA11yLabel = (stepTitle) => `Edit step: ${stepTitle}`,
  tapToEditHint = "Tap to edit step title",
  editEvidenceLabel = "Edit planned evidence",
  moveUpLabel = (stepTitle) => `Move "${stepTitle}" up`,
  moveDownLabel = (stepTitle) => `Move "${stepTitle}" down`,
  deleteStepLabel = (stepTitle) => `Delete step: ${stepTitle}`,
  nestUnderTriggerA11yLabel = "Nest this step under another step",
  nestUnderPickerTitle = "Choose a step to nest under",
  nestUnderRowLabel = (targetTitle) => `Nest under "${targetTitle}"`,
  nestUnderRowA11yLabel = (targetTitle) =>
    `Nest this step under ${targetTitle}`,
  unNestA11yLabel = "Promote this step to top level",
}: EditGoalStepRowProps) {
  const { theme } = useUnistyles();
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const isDragging = useSharedValue(false);
  const headerRef = useRef<View>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  // R3/R15: register the root header's screen-absolute geometry. onLayout
  // provides relative y; measureInWindow provides the absolute y the
  // coordinator's hover math needs. The remeasure callback is registered so
  // drag-start can refresh this row's geometry (the registry never goes stale).
  function measureAndRegister() {
    const node = headerRef.current as unknown as {
      measureInWindow?: (
        cb: (x: number, y: number, w: number, h: number) => void,
      ) => void;
    } | null;
    if (node?.measureInWindow) {
      node.measureInWindow((_x, y, _w, h) => {
        registerRowLayout(step.id, { absoluteY: y, height: h });
      });
    }
  }
  React.useEffect(() => {
    registerRemeasure(step.id, measureAndRegister);
    return () => registerRemeasure(step.id, null);
    // registerRemeasure/registerRowLayout are stable-enough closures from the
    // coordinator; step.id is stable. Exclude them to avoid re-subscribing every
    // render (the coordinator recreates them each render but they read refs).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step.id]);

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
      runOnJS(onDragStart)(step.id);
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
    <View ref={headerRef} onLayout={measureAndRegister} style={styles.rowMain}>
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
      <View
        ref={headerRef}
        onLayout={measureAndRegister}
        style={styles.rowMain}
      >
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
              {canNestUnder && onNestUnder && (
                <IconButton
                  icon={<ArrowBendDownRight size={18} weight="bold" />}
                  onPress={() => setPickerOpen(true)}
                  size="sm"
                  tone="ghost"
                  accessibilityLabel={nestUnderTriggerA11yLabel}
                  testID={`edit-goal-step-nest-under-${step.id}`}
                />
              )}
              {canUnNest && onUnNest && (
                <IconButton
                  icon={<ArrowBendUpLeft size={18} weight="bold" />}
                  onPress={onUnNest}
                  size="sm"
                  tone="ghost"
                  accessibilityLabel={unNestA11yLabel}
                  testID={`edit-goal-step-un-nest-${step.id}`}
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

  // Nest-under picker (R8): an accessible modal listing eligible root
  // targets. Reuses DraggableStepItem's picker pattern, adapted to the
  // redesigned mint-rail tokens. Suppresses rendering when the list has no
  // targets (canNestUnder already gates the trigger, but the modal is only
  // mounted when opened).
  const picker =
    canNestUnder && onNestUnder ? (
      <Modal
        visible={pickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerOpen(false)}
        accessibilityViewIsModal
      >
        <View
          style={[
            styles.pickerOverlay,
            { backgroundColor: `${theme.colors.shadow}80` },
          ]}
        >
          <SafeAreaView edges={["bottom"]} style={styles.pickerContainer}>
            <View style={styles.pickerCard}>
              <RNText style={styles.pickerTitle} accessibilityRole="header">
                {nestUnderPickerTitle}
              </RNText>
              {nestTargets.map((target) => (
                <Pressable
                  key={target.id}
                  style={styles.pickerRow}
                  onPress={() => {
                    onNestUnder(target.id);
                    setPickerOpen(false);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={nestUnderRowA11yLabel(target.title)}
                  testID={`edit-goal-step-nest-target-${step.id}-${target.id}`}
                >
                  <RNText style={styles.pickerRowText}>
                    {nestUnderRowLabel(target.title)}
                  </RNText>
                </Pressable>
              ))}
              <Button
                label="Cancel"
                variant="secondary"
                onPress={() => setPickerOpen(false)}
              />
            </View>
          </SafeAreaView>
        </View>
      </Modal>
    ) : null;

  if (!canDrag) {
    return (
      <View style={[styles.rowCard, isArmedTarget && styles.armedTargetItem]}>
        {body}
        {children}
        {picker}
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
        isArmedTarget && styles.armedTargetItem,
        animatedStyle,
      ]}
    >
      <GestureDetector gesture={composed}>
        <View>{body}</View>
      </GestureDetector>
      {children}
      {picker}
    </Animated.View>
  );
}
