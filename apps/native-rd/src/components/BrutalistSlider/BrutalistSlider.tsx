import React, { useEffect, useMemo, useState } from "react";
import {
  I18nManager,
  type LayoutChangeEvent,
  type AccessibilityActionEvent,
  View,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";

import { styles } from "./BrutalistSlider.styles";

export interface BrutalistSliderProps {
  value: number;
  minimumValue: number;
  maximumValue: number;
  step: number;
  onValueChange: (value: number) => void;
  accessibilityLabel: string;
  accessibilityHint?: string;
  testID?: string;
}

export function clampAndSnap(
  value: number,
  minimumValue: number,
  maximumValue: number,
  step: number,
): number {
  const clamped = Math.min(maximumValue, Math.max(minimumValue, value));
  const snapped =
    minimumValue + Math.round((clamped - minimumValue) / step) * step;
  return Number(
    Math.min(maximumValue, Math.max(minimumValue, snapped)).toFixed(10),
  );
}

export function valueToPosition(
  value: number,
  minimumValue: number,
  maximumValue: number,
  width: number,
  isRTL: boolean,
): number {
  const ratio = (value - minimumValue) / (maximumValue - minimumValue);
  return (isRTL ? 1 - ratio : ratio) * width;
}

export function positionToValue(
  position: number,
  minimumValue: number,
  maximumValue: number,
  width: number,
  step: number,
  isRTL: boolean,
): number {
  const ratio = Math.min(1, Math.max(0, position / width));
  const directedRatio = isRTL ? 1 - ratio : ratio;
  return clampAndSnap(
    minimumValue + directedRatio * (maximumValue - minimumValue),
    minimumValue,
    maximumValue,
    step,
  );
}

export function BrutalistSlider({
  value,
  minimumValue,
  maximumValue,
  step,
  onValueChange,
  accessibilityLabel,
  accessibilityHint,
  testID,
}: BrutalistSliderProps) {
  const [trackWidth, setTrackWidth] = useState(0);
  const position = useSharedValue(0);
  const isRTL = I18nManager.isRTL;
  const normalizedValue = clampAndSnap(value, minimumValue, maximumValue, step);

  useEffect(() => {
    position.value = valueToPosition(
      normalizedValue,
      minimumValue,
      maximumValue,
      trackWidth,
      isRTL,
    );
  }, [
    isRTL,
    maximumValue,
    minimumValue,
    normalizedValue,
    position,
    trackWidth,
  ]);

  const updateFromPosition = (nextPosition: number) => {
    if (trackWidth === 0) return;
    onValueChange(
      positionToValue(
        nextPosition,
        minimumValue,
        maximumValue,
        trackWidth,
        step,
        isRTL,
      ),
    );
  };

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .onBegin((event) => {
          position.value = Math.min(trackWidth, Math.max(0, event.x));
          runOnJS(updateFromPosition)(position.value);
        })
        .onUpdate((event) => {
          position.value = Math.min(trackWidth, Math.max(0, event.x));
          runOnJS(updateFromPosition)(position.value);
        }),
    [position, trackWidth, updateFromPosition],
  );

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: position.value }],
  }));
  const fillStyle = useAnimatedStyle(() => ({
    width: isRTL ? trackWidth - position.value : position.value,
    [isRTL ? "right" : "left"]: 0,
  }));

  const marks = [];
  for (let mark = minimumValue; mark <= maximumValue + step / 2; mark += step) {
    marks.push(mark);
  }

  const handleLayout = (event: LayoutChangeEvent) => {
    setTrackWidth(event.nativeEvent.layout.width);
  };

  const handleAccessibilityAction = (event: AccessibilityActionEvent) => {
    const direction = event.nativeEvent.actionName === "increment" ? 1 : -1;
    onValueChange(
      clampAndSnap(
        normalizedValue + direction * step,
        minimumValue,
        maximumValue,
        step,
      ),
    );
  };

  return (
    <GestureDetector gesture={pan}>
      <View
        testID={testID}
        style={styles.touchTarget}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        accessibilityValue={{
          min: Math.round(minimumValue * 100),
          max: Math.round(maximumValue * 100),
          now: Math.round(normalizedValue * 100),
          text: `${Math.round(normalizedValue * 100)}%`,
        }}
        accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
        onAccessibilityAction={handleAccessibilityAction}
      >
        <View style={styles.track} onLayout={handleLayout}>
          <Animated.View style={[styles.fill, fillStyle]} />
          <View style={styles.marks} pointerEvents="none">
            {marks.map((mark) => (
              <View key={mark} style={styles.mark} />
            ))}
          </View>
          <Animated.View style={[styles.thumb, thumbStyle]} />
        </View>
      </View>
    </GestureDetector>
  );
}
