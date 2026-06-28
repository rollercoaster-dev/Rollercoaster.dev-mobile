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
  // Clamp to 0 so a caller passing strokeWidth >= size can't produce a negative
  // radius, which renders an invalid SVG Circle (blank ring + RN warnings).
  const radius = Math.max(0, (size - strokeWidth) / 2);
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - clamped);
  // Scale the centered label to the ring instead of a fixed display size, so it
  // stays inside the stroke on small rings (104px cockpit hero) as well as large
  // ones. innerDiameter caps width; adjustsFontSizeToFit shrinks wider values
  // like "100%" the rest of the way.
  const innerDiameter = Math.max(0, size - strokeWidth * 2);
  const labelFontSize = Math.round(size * 0.25);

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
          // Surface-aware subtle border, not backgroundSecondary — the latter
          // equals the card bg in dark mode, making the track invisible.
          stroke={theme.surfaceBorder.borderSubtle}
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
            <Text
              variant="display"
              style={[
                styles.centerLabel,
                {
                  fontSize: labelFontSize,
                  lineHeight: Math.round(labelFontSize * 1.05),
                  maxWidth: innerDiameter,
                },
              ]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.6}
            >
              {centerLabel}
            </Text>
          ) : null}
          {centerSublabel ? (
            <Text variant="mono" style={styles.centerSublabel}>
              {centerSublabel}
            </Text>
          ) : null}
        </View>
      )}
    </View>
  );
}
