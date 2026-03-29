import React, { useState, useEffect } from "react";
import { Pressable, View, Text } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import { useAnimationPref } from "../../hooks/useAnimationPref";
import { getTimingConfig } from "../../utils/animation";
import { styles } from "./CollapsibleSection.styles";

export interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}

export function CollapsibleSection({
  title,
  children,
  defaultExpanded = true,
}: CollapsibleSectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const { animationPref } = useAnimationPref();

  const expandedValue = useSharedValue(defaultExpanded ? 1 : 0);

  useEffect(() => {
    expandedValue.value = withTiming(
      expanded ? 1 : 0,
      getTimingConfig(animationPref, "quick"),
    );
  }, [expanded, animationPref, expandedValue]);

  const contentStyle = useAnimatedStyle(() => ({
    opacity: expandedValue.value,
    maxHeight: expandedValue.value === 0 ? 0 : undefined,
    overflow: "hidden" as const,
  }));

  return (
    <View style={styles.container}>
      <Pressable
        onPress={() => setExpanded(!expanded)}
        accessible
        accessibilityRole="button"
        accessibilityLabel={`${title}, ${expanded ? "collapse" : "expand"}`}
        accessibilityState={{ expanded }}
        style={({ pressed }) => [
          styles.header,
          pressed && styles.headerPressed,
        ]}
      >
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.chevron}>{expanded ? "▾" : "▸"}</Text>
      </Pressable>
      <Animated.View
        style={[expanded ? styles.content : undefined, contentStyle]}
      >
        {expanded && children}
      </Animated.View>
    </View>
  );
}
