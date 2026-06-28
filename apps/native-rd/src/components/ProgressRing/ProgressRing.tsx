import React from "react";
import { View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { useUnistyles } from "react-native-unistyles";
import { Text } from "../Text";
import { styles } from "./ProgressRing.styles";

export interface ProgressRingProps {
  /** Progress from 0 to 1. Values outside the range are clamped. */
  progress: number;
  /** Outer diameter in px. */
  size?: number;
  /** Ring thickness in px. */
  strokeWidth?: number;
  /** Large centered label, e.g. "50%". */
  centerLabel?: string;
  /** Smaller label under centerLabel, e.g. "3 / 6 steps". */
  centerSublabel?: string;
}

/**
 * Circular progress indicator. Two concentric SVG arcs (track + fill) with an
 * optional centered text overlay. The wrapper carries the progressbar role and
 * value so the ring is announced as a single element.
 */
export function ProgressRing({
  progress,
  size = 160,
  strokeWidth = 14,
  centerLabel,
  centerSublabel,
}: ProgressRingProps) {
  const { theme } = useUnistyles();
  const clamped = Math.max(0, Math.min(1, progress));
  const center = size / 2;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - clamped);

  return (
    <View
      style={[styles.wrapper, { width: size, height: size }]}
      accessible
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
    >
      <Svg width={size} height={size}>
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={theme.colors.backgroundSecondary}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={theme.action.actionPrimaryBg}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          // Rotate so the arc starts at 12 o'clock rather than 3 o'clock.
          transform={`rotate(-90 ${center} ${center})`}
        />
      </Svg>
      {(centerLabel || centerSublabel) && (
        <View style={styles.center} pointerEvents="none">
          {centerLabel ? (
            <Text variant="display" style={styles.centerLabel}>
              {centerLabel}
            </Text>
          ) : null}
          {centerSublabel ? (
            <Text variant="caption" style={styles.centerSublabel}>
              {centerSublabel}
            </Text>
          ) : null}
        </View>
      )}
    </View>
  );
}
