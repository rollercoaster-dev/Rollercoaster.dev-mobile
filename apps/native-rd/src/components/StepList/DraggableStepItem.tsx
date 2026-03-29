import React from "react";
import { View, Pressable, Text as RNText } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useUnistyles } from "react-native-unistyles";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import type { AnimationPref } from "../../hooks/useAnimationPref";
import { getTimingConfig } from "../../utils/animation";
import { IconButton } from "../IconButton";
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
  onDragMove: (translationY: number) => void;
  onDragEnd: () => void;
  onDeleteStep?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  showAccessibleControls: boolean;
  animationPref: AnimationPref;
  isFirst: boolean;
  isLast: boolean;
  editContent: React.ReactNode;
}

export function DraggableStepItem({
  step,
  index,
  isBeingDragged,
  onLabelPress,
  onDragStart,
  onDragMove,
  onDragEnd,
  onDeleteStep,
  onMoveUp,
  onMoveDown,
  showAccessibleControls,
  animationPref,
  isFirst,
  isLast,
  editContent,
}: DraggableStepItemProps) {
  const { theme } = useUnistyles();
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const isDragging = useSharedValue(false);

  const timingQuick = getTimingConfig(animationPref, "quick");
  const timingNormal = getTimingConfig(animationPref, "normal");

  const noAnimation = animationPref === "none";

  function resetDragState() {
    "worklet";
    translateY.value = noAnimation ? 0 : withTiming(0, timingNormal);
    scale.value = noAnimation ? 1 : withTiming(1, timingQuick);
    isDragging.value = false;
    runOnJS(onDragEnd)();
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
      runOnJS(onDragMove)(e.translationY);
    })
    .onEnd(resetDragState)
    .onFinalize(resetDragState);

  const composed = Gesture.Simultaneous(longPress, pan);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
    zIndex: isDragging.value ? 100 : 0,
  }));

  return (
    <GestureDetector gesture={composed}>
      <Animated.View
        style={[
          styles.draggableItem,
          isBeingDragged && styles.draggingItem,
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
                  icon={
                    <Text
                      variant="body"
                      style={{ color: theme.colors.textMuted }}
                    >
                      ✕
                    </Text>
                  }
                  onPress={onDeleteStep}
                  size="sm"
                  variant="ghost"
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
      </Animated.View>
    </GestureDetector>
  );
}
