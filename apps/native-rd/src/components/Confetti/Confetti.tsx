import React, { useEffect, useMemo, useRef } from "react";
import { View, Dimensions } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from "react-native-reanimated";
import { useAnimationPref } from "../../hooks/useAnimationPref";
import { palette } from "../../themes/adapter";
import { styles } from "./Confetti.styles";

const PIECE_COUNT = 60;
const CLEANUP_MS = 3000;
const COLORS = [
  palette.blue600, // #2563eb
  palette.yellow300, // #ffe50c
  palette.green600, // #16a34a
  palette.purple400, // #a78bfa
  // eslint-disable-next-line local/no-raw-colors -- decorative confetti particle, not themed UI
  "#f97316", // orange
  palette.red600, // #dc2626
];

interface PieceConfig {
  left: number;
  size: number;
  color: string;
  delay: number;
  duration: number;
  isCircle: boolean;
}

function generatePieces(): PieceConfig[] {
  return Array.from({ length: PIECE_COUNT }, () => ({
    left: Math.random() * 100,
    size: 6 + Math.random() * 8,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    delay: Math.random() * 500,
    duration: 1500 + Math.random() * 1000,
    isCircle: Math.random() > 0.5,
  }));
}

function ConfettiPiece({ config }: { config: PieceConfig }) {
  const screenHeight = Dimensions.get("window").height;
  const translateY = useSharedValue(-10);
  const rotate = useSharedValue(0);
  const opacity = useSharedValue(1);

  useEffect(() => {
    translateY.value = withDelay(
      config.delay,
      withTiming(screenHeight + 20, {
        duration: config.duration,
        easing: Easing.out(Easing.quad),
      }),
    );
    rotate.value = withDelay(
      config.delay,
      withTiming(720, {
        duration: config.duration,
        easing: Easing.linear,
      }),
    );
    opacity.value = withDelay(
      config.delay,
      withTiming(0, {
        duration: config.duration,
        easing: Easing.in(Easing.quad),
      }),
    );
  }, [config, opacity, rotate, screenHeight, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { rotate: `${rotate.value}deg` },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          top: -10,
          left: `${config.left}%`,
          width: config.size,
          height: config.size,
          backgroundColor: config.color,
          borderRadius: config.isCircle ? config.size / 2 : 2,
        },
        animatedStyle,
      ]}
    />
  );
}

export interface ConfettiProps {
  visible: boolean;
  onComplete?: () => void;
}

export function Confetti({ visible, onComplete }: ConfettiProps) {
  const { shouldAnimate } = useAnimationPref();
  const hasCalledComplete = useRef(false);
  const pieces = useMemo(() => (visible ? generatePieces() : []), [visible]);

  useEffect(() => {
    if (!visible || hasCalledComplete.current) return;

    const timer = setTimeout(() => {
      hasCalledComplete.current = true;
      onComplete?.();
    }, CLEANUP_MS);

    return () => clearTimeout(timer);
  }, [visible, onComplete]);

  // Reset ref when visibility changes
  useEffect(() => {
    if (!visible) {
      hasCalledComplete.current = false;
    }
  }, [visible]);

  if (!visible || !shouldAnimate) return null;

  return (
    <View
      style={styles.container}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {pieces.map((config, i) => (
        <ConfettiPiece key={i} config={config} />
      ))}
    </View>
  );
}
