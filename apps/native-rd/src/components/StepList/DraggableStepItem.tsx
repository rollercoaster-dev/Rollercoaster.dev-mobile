import React, { useState } from "react";
import { View, Pressable, Text as RNText, Modal } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useTranslation } from "react-i18next";
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
import { IconButton } from "../IconButton";
import { Button } from "../Button";
import { Text } from "../Text";
import { EvidenceTypePicker } from "../EvidenceTypePicker";
import { styles } from "./StepList.styles";
import type { Step } from "./StepList";

export interface DraggableStepItemProps {
  step: Step;
  index: number;
  isBeingDragged: boolean;
  onLabelPress?: (step: Step) => void;
  onDragStart: (index: number) => void;
  onDragMove: (translationY: number, absoluteY: number) => void;
  onDragEnd: () => void;
  dragScrollCompensation?: SharedValue<number>;
  onDeleteStep?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  showAccessibleControls: boolean;
  animationPref: AnimationPref;
  isFirst: boolean;
  isLast: boolean;
  editContent: React.ReactNode;
  // Dwell-arm highlight: true while this row is the armed demote target. Drives
  // a sustained dashed "drop-here" outline (styles.armedTargetItem) for all
  // motion settings — distinct from the dragged row's solid accent border.
  isArmedTarget?: boolean;
  // Screen-reader reparent controls (Q1/Q2). A leaf root with ≥1
  // eligible target can be nested via the picker; a child can be un-nested.
  canNestUnder?: boolean;
  nestTargets?: { id: string; title: string }[];
  onNestUnder?: (targetId: string) => void;
  canUnNest?: boolean;
  onUnNest?: () => void;
}

export function DraggableStepItem({
  step,
  index,
  isBeingDragged,
  onLabelPress,
  onDragStart,
  onDragMove,
  onDragEnd,
  dragScrollCompensation,
  onDeleteStep,
  onMoveUp,
  onMoveDown,
  showAccessibleControls,
  animationPref,
  isFirst,
  isLast,
  editContent,
  isArmedTarget = false,
  canNestUnder = false,
  nestTargets = [],
  onNestUnder,
  canUnNest = false,
  onUnNest,
}: DraggableStepItemProps) {
  const { theme } = useUnistyles();
  const { t } = useTranslation(["editGoal", "common"]);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const isDragging = useSharedValue(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const timingQuick = getTimingConfig(animationPref, "quick");
  const timingNormal = getTimingConfig(animationPref, "normal");

  const noAnimation = animationPref === "none";

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
      {
        translateY: translateY.value + (dragScrollCompensation?.value ?? 0),
      },
      { scale: scale.value },
    ],
    zIndex: isDragging.value ? 100 : 0,
  }));

  return (
    <GestureDetector gesture={composed}>
      <Animated.View
        style={[
          styles.draggableItem,
          isBeingDragged && styles.draggingItem,
          isArmedTarget && styles.armedTargetItem,
          animatedStyle,
        ]}
      >
        {editContent ? (
          editContent
        ) : (
          <View>
            <View style={styles.stepRow}>
              <RNText
                style={styles.dragHandle}
                accessibilityElementsHidden
                importantForAccessibility="no"
              >
                ≡
              </RNText>
              <Pressable
                style={styles.stepContent}
                onPress={onLabelPress ? () => onLabelPress(step) : undefined}
                accessibilityRole="button"
                accessibilityLabel={step.title}
                accessibilityHint={
                  onLabelPress ? "Tap to edit step title" : undefined
                }
              >
                <RNText style={styles.stepTitleText}>{step.title}</RNText>
              </Pressable>
              {onDeleteStep && (
                <IconButton
                  icon={<Text variant="body">✕</Text>}
                  onPress={onDeleteStep}
                  size="sm"
                  tone="ghost"
                  accessibilityLabel={`Delete "${step.title}"`}
                />
              )}
              {showAccessibleControls && (
                <View style={styles.reorderButtons}>
                  {onMoveUp && !isFirst && (
                    <IconButton
                      icon={<Text variant="body">↑</Text>}
                      onPress={onMoveUp}
                      size="sm"
                      accessibilityLabel={`Move "${step.title}" up`}
                    />
                  )}
                  {onMoveDown && !isLast && (
                    <IconButton
                      icon={<Text variant="body">↓</Text>}
                      onPress={onMoveDown}
                      size="sm"
                      accessibilityLabel={`Move "${step.title}" down`}
                    />
                  )}
                  {canNestUnder && onNestUnder && (
                    <IconButton
                      icon={<Text variant="body">⤵</Text>}
                      onPress={() => setPickerOpen(true)}
                      size="sm"
                      accessibilityLabel={t(
                        "editGoal:stepList.a11y.nestUnderTriggerA11y",
                      )}
                      testID={`step-nest-under-${step.id}`}
                    />
                  )}
                  {canUnNest && onUnNest && (
                    <IconButton
                      icon={<Text variant="body">⤴</Text>}
                      onPress={onUnNest}
                      size="sm"
                      accessibilityLabel={t(
                        "editGoal:stepList.a11y.unNestA11y",
                      )}
                      testID={`step-un-nest-${step.id}`}
                    />
                  )}
                </View>
              )}
            </View>
            {step.plannedEvidenceTypes &&
              step.plannedEvidenceTypes.length > 0 && (
                <View style={styles.evidenceIconsRow}>
                  <EvidenceTypePicker
                    selectedTypes={step.plannedEvidenceTypes}
                    compact
                  />
                </View>
              )}
          </View>
        )}
        {canNestUnder && onNestUnder && (
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
                  <Text
                    variant="headline"
                    style={styles.pickerTitle}
                    accessibilityRole="header"
                  >
                    {t("editGoal:stepList.a11y.nestUnderPickerTitle")}
                  </Text>
                  {nestTargets.map((target) => (
                    <Pressable
                      key={target.id}
                      style={styles.pickerRow}
                      onPress={() => {
                        onNestUnder(target.id);
                        setPickerOpen(false);
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={t(
                        "editGoal:stepList.a11y.nestUnderA11y",
                        { title: target.title },
                      )}
                      testID={`step-nest-target-${step.id}-${target.id}`}
                    >
                      <RNText style={styles.pickerRowText}>
                        {t("editGoal:stepList.a11y.nestUnder", {
                          title: target.title,
                        })}
                      </RNText>
                    </Pressable>
                  ))}
                  <Button
                    label={t("common:actions.cancel")}
                    variant="secondary"
                    onPress={() => setPickerOpen(false)}
                  />
                </View>
              </SafeAreaView>
            </View>
          </Modal>
        )}
      </Animated.View>
    </GestureDetector>
  );
}
