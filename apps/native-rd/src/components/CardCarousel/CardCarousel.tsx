import { useEffect, useRef } from "react";
import {
  View,
  Pressable,
  Text,
  PanResponder,
  Platform,
  useWindowDimensions,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import { useAnimationPref } from "../../hooks/useAnimationPref";
import { getTimingConfig } from "../../utils/animation";
import { styles } from "./CardCarousel.styles";

export interface CardCarouselProps {
  children: React.ReactElement | React.ReactElement[];
  currentIndex: number;
  onIndexChange: (index: number) => void;
  renderIndicator?: (currentIndex: number, total: number) => React.ReactNode;
  accessibilityLabel?: string;
}

type CardPosition = "left" | "center" | "right" | "hidden";

function getCardPosition(
  cardIndex: number,
  currentIndex: number,
): CardPosition {
  const diff = cardIndex - currentIndex;
  if (diff === 0) return "center";
  if (diff === -1) return "left";
  if (diff === 1) return "right";
  return "hidden";
}

interface AnimatedCardProps {
  children: React.ReactElement;
  position: CardPosition;
  containerWidth: number;
  animationPref: "full" | "reduced" | "none";
}

function AnimatedCard({
  children,
  position,
  containerWidth,
  animationPref,
}: AnimatedCardProps) {
  const translateX = useSharedValue(0);
  const scale = useSharedValue(0.8);
  const opacity = useSharedValue(0);

  useEffect(() => {
    const config = getTimingConfig(animationPref, "normal");
    const cardWidth = containerWidth - 64; // matches left: 32 + right: 32 inset
    const offsetX = cardWidth * 0.85;

    switch (position) {
      case "center":
        translateX.value = withTiming(0, config);
        scale.value = withTiming(1, config);
        opacity.value = withTiming(1, config);
        break;
      case "left":
        translateX.value = withTiming(-offsetX, config);
        scale.value = withTiming(0.88, config);
        opacity.value = withTiming(0.5, config);
        break;
      case "right":
        translateX.value = withTiming(offsetX, config);
        scale.value = withTiming(0.88, config);
        opacity.value = withTiming(0.5, config);
        break;
      case "hidden":
        translateX.value = withTiming(0, config);
        scale.value = withTiming(0.8, config);
        opacity.value = withTiming(0, config);
        break;
    }
  }, [position, containerWidth, animationPref, translateX, scale, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    position: "absolute" as const,
    top: 0,
    bottom: 0,
    left: 32,
    right: 32,
    justifyContent: "center" as const,
    transform: [{ translateX: translateX.value }, { scale: scale.value }],
    opacity: opacity.value,
    zIndex: position === "center" ? 2 : position === "hidden" ? 0 : 1,
    pointerEvents:
      position === "center" ? ("auto" as const) : ("none" as const),
  }));

  const isCenter = position === "center";

  return (
    <Animated.View
      style={animatedStyle}
      accessible={false}
      accessibilityElementsHidden={!isCenter}
      importantForAccessibility={isCenter ? "no" : "no-hide-descendants"}
    >
      {children}
    </Animated.View>
  );
}

export function CardCarousel({
  children: rawChildren,
  currentIndex,
  onIndexChange,
  renderIndicator,
  accessibilityLabel = "Card carousel",
}: CardCarouselProps) {
  const children = Array.isArray(rawChildren) ? rawChildren : [rawChildren];
  const safeIndex = Math.max(0, Math.min(currentIndex, children.length - 1));
  const { width } = useWindowDimensions();
  const { animationPref } = useAnimationPref();
  const isFirst = safeIndex === 0;
  const isLast = safeIndex === children.length - 1;

  const cards = children.map((child, index) => ({
    child,
    position: getCardPosition(index, safeIndex),
  }));

  // Store latest values in refs so gesture/keyboard closures stay current
  const stateRef = useRef({
    currentIndex: safeIndex,
    childCount: children.length,
    onIndexChange,
  });
  stateRef.current = {
    currentIndex: safeIndex,
    childCount: children.length,
    onIndexChange,
  };

  const goLeft = () => {
    if (!isFirst) onIndexChange(safeIndex - 1);
  };

  const goRight = () => {
    if (!isLast) onIndexChange(safeIndex + 1);
  };

  // Keyboard navigation (web and external keyboards)
  useEffect(() => {
    if (Platform.OS !== "web") return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const {
        currentIndex: idx,
        childCount,
        onIndexChange: cb,
      } = stateRef.current;
      if (e.key === "ArrowLeft" && idx > 0) {
        cb(idx - 1);
      } else if (e.key === "ArrowRight" && idx < childCount - 1) {
        cb(idx + 1);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const SWIPE_THRESHOLD = 50;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_evt, { dx, dy }) =>
        Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10,
      onPanResponderRelease: (_evt, { dx }) => {
        const {
          currentIndex: idx,
          childCount,
          onIndexChange: cb,
        } = stateRef.current;
        if (dx < -SWIPE_THRESHOLD && idx < childCount - 1) {
          cb(idx + 1);
        } else if (dx > SWIPE_THRESHOLD && idx > 0) {
          cb(idx - 1);
        }
      },
    }),
  ).current;

  return (
    <View style={styles.container}>
      {/* Track + overlay arrows */}
      <View style={styles.trackWrapper}>
        <View style={styles.track} {...panResponder.panHandlers}>
          {cards.map(({ child, position }, index) => (
            <AnimatedCard
              key={index}
              position={position}
              containerWidth={width}
              animationPref={animationPref}
            >
              {child}
            </AnimatedCard>
          ))}
        </View>

        {/* Prev arrow — overlays left edge */}
        <View style={[styles.arrowContainer, styles.arrowLeft]}>
          <Pressable
            onPress={goLeft}
            disabled={isFirst}
            style={[styles.arrow, isFirst && styles.arrowDisabled]}
            accessible
            accessibilityRole="button"
            accessibilityLabel="Previous card"
            accessibilityHint={`Moves to the previous item in ${accessibilityLabel}`}
            accessibilityState={{ disabled: isFirst }}
          >
            <Text style={styles.arrowText}>&#8249;</Text>
          </Pressable>
        </View>

        {/* Next arrow — overlays right edge */}
        <View style={[styles.arrowContainer, styles.arrowRight]}>
          <Pressable
            onPress={goRight}
            disabled={isLast}
            style={[styles.arrow, isLast && styles.arrowDisabled]}
            accessible
            accessibilityRole="button"
            accessibilityLabel="Next card"
            accessibilityHint={`Moves to the next item in ${accessibilityLabel}`}
            accessibilityState={{ disabled: isLast }}
          >
            <Text style={styles.arrowText}>&#8250;</Text>
          </Pressable>
        </View>
      </View>

      {/* Indicator (ProgressDots) below the track */}
      {renderIndicator && (
        <View style={styles.indicatorRow}>
          {renderIndicator(safeIndex, children.length)}
        </View>
      )}
    </View>
  );
}
