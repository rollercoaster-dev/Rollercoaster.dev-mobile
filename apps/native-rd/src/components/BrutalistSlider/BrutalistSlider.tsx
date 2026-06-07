import React, { useEffect, useMemo, useRef, useState } from "react";
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

import { styles, THUMB_SIZE } from "./BrutalistSlider.styles";

const TRACK_HORIZONTAL_INSET = THUMB_SIZE / 2;

export interface A11ySliderValue {
  min: number;
  max: number;
  now: number;
  text: string;
}

export interface FormatA11yValueArg {
  value: number;
  minimumValue: number;
  maximumValue: number;
}

const defaultFormatA11yValue = ({
  value,
  minimumValue,
  maximumValue,
}: FormatA11yValueArg): A11ySliderValue => ({
  min: Math.round(minimumValue),
  max: Math.round(maximumValue),
  now: Math.round(value),
  text: `${Math.round(value)}`,
});

export interface BrutalistSliderProps {
  value: number;
  minimumValue: number;
  maximumValue: number;
  step: number;
  onValueChange: (value: number) => void;
  accessibilityLabel: string;
  accessibilityHint?: string;
  formatA11yValue?: (arg: FormatA11yValueArg) => A11ySliderValue;
  testID?: string;
}

export function clampAndSnap(
  value: number,
  minimumValue: number,
  maximumValue: number,
  step: number,
): number {
  if (
    !Number.isFinite(value) ||
    !Number.isFinite(minimumValue) ||
    !Number.isFinite(maximumValue) ||
    !Number.isFinite(step) ||
    minimumValue >= maximumValue ||
    step <= 0
  ) {
    return Number.isFinite(minimumValue) ? minimumValue : 0;
  }
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
  if (
    !Number.isFinite(value) ||
    !Number.isFinite(minimumValue) ||
    !Number.isFinite(maximumValue) ||
    !Number.isFinite(width) ||
    minimumValue >= maximumValue ||
    width <= 0
  ) {
    return 0;
  }
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
  if (!Number.isFinite(position) || !Number.isFinite(width) || width <= 0) {
    return Number.isFinite(minimumValue) ? minimumValue : 0;
  }
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
  formatA11yValue,
  testID,
}: BrutalistSliderProps) {
  const [trackWidth, setTrackWidth] = useState(0);
  const position = useSharedValue(0);
  const isRTL = I18nManager.isRTL;
  const valueChangeRef = useRef(onValueChange);
  valueChangeRef.current = onValueChange;
  const sliderConfigRef = useRef({
    minimumValue,
    maximumValue,
    step,
    isRTL,
  });
  sliderConfigRef.current = { minimumValue, maximumValue, step, isRTL };
  const trackWidthRef = useRef(trackWidth);
  trackWidthRef.current = trackWidth;
  const validConfiguration =
    Number.isFinite(minimumValue) &&
    Number.isFinite(maximumValue) &&
    Number.isFinite(step) &&
    minimumValue < maximumValue &&
    step > 0;
  const normalizedValue = clampAndSnap(value, minimumValue, maximumValue, step);

  useEffect(() => {
    if (__DEV__ && !validConfiguration) {
      console.warn("[BrutalistSlider] Invalid numeric configuration", {
        minimumValue,
        maximumValue,
        step,
      });
    }
  }, [maximumValue, minimumValue, step, validConfiguration]);

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

  const updateFromPositionRef = useRef((nextPosition: number) => {
    const width = trackWidthRef.current;
    if (width <= 0) return;
    const config = sliderConfigRef.current;
    valueChangeRef.current(
      positionToValue(
        nextPosition,
        config.minimumValue,
        config.maximumValue,
        width,
        config.step,
        config.isRTL,
      ),
    );
  });

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .onBegin((event) => {
          position.value = Math.min(
            trackWidth,
            Math.max(0, event.x - TRACK_HORIZONTAL_INSET),
          );
          runOnJS(updateFromPositionRef.current)(position.value);
        })
        .onUpdate((event) => {
          position.value = Math.min(
            trackWidth,
            Math.max(0, event.x - TRACK_HORIZONTAL_INSET),
          );
          runOnJS(updateFromPositionRef.current)(position.value);
        }),
    [position, trackWidth],
  );

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: position.value }],
  }));
  const fillStyle = useAnimatedStyle(() => ({
    width: isRTL ? trackWidth - position.value : position.value,
    [isRTL ? "right" : "left"]: 0,
  }));

  const marks = [];
  if (validConfiguration) {
    for (
      let mark = minimumValue;
      mark <= maximumValue + step / 2;
      mark += step
    ) {
      marks.push(mark);
    }
  }

  const handleLayout = (event: LayoutChangeEvent) => {
    setTrackWidth(event.nativeEvent.layout.width);
  };

  const handleAccessibilityAction = (event: AccessibilityActionEvent) => {
    let direction: 1 | -1;
    if (event.nativeEvent.actionName === "increment") {
      direction = 1;
    } else if (event.nativeEvent.actionName === "decrement") {
      direction = -1;
    } else {
      return;
    }
    onValueChange(
      clampAndSnap(
        normalizedValue + direction * step,
        minimumValue,
        maximumValue,
        step,
      ),
    );
  };

  const a11yValue = (formatA11yValue ?? defaultFormatA11yValue)({
    value: normalizedValue,
    minimumValue,
    maximumValue,
  });

  return (
    <GestureDetector gesture={pan}>
      <View
        testID={testID}
        style={styles.touchTarget}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        accessibilityValue={a11yValue}
        accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
        onAccessibilityAction={handleAccessibilityAction}
      >
        <View
          testID={testID ? `${testID}-track` : undefined}
          style={styles.track}
          onLayout={handleLayout}
        >
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
