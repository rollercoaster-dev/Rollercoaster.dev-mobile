import React, { useState, useEffect, useCallback } from "react";
import { Pressable, View, Text } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import { useAnimationPref } from "../../hooks/useAnimationPref";
import { getTimingConfig } from "../../utils/animation";
import { styles } from "./CollapsibleSection.styles";

export type CollapsibleSectionVariant = "plain" | "card";

export interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  /**
   * Controlled expansion. When provided, the component does not manage its
   * own state — the parent owns the truth and must update it via
   * `onExpandedChange`. Leave undefined for the legacy uncontrolled mode.
   */
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  /**
   * Optional trailing content rendered in the header (e.g. selection
   * summary). Strings are wrapped in a Text node; ReactNodes render as-is.
   */
  summary?: React.ReactNode;
  /**
   * `plain` (default) preserves the historical flush styling used across
   * existing consumers. `card` adds a bordered, shadowed container matching
   * the badge designer prototype.
   */
  variant?: CollapsibleSectionVariant;
  /** Override the "expand"/"collapse" verb in the accessibilityLabel. */
  expandLabel?: string;
  collapseLabel?: string;
}

export function CollapsibleSection({
  title,
  children,
  defaultExpanded = true,
  expanded: expandedProp,
  onExpandedChange,
  summary,
  variant = "plain",
  expandLabel = "expand",
  collapseLabel = "collapse",
}: CollapsibleSectionProps) {
  const isControlled = expandedProp !== undefined;
  const [internalExpanded, setInternalExpanded] = useState(defaultExpanded);
  const expanded = isControlled ? expandedProp : internalExpanded;

  const { animationPref } = useAnimationPref();
  const expandedValue = useSharedValue(expanded ? 1 : 0);

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

  const handlePress = useCallback(() => {
    const next = !expanded;
    if (!isControlled) setInternalExpanded(next);
    onExpandedChange?.(next);
  }, [expanded, isControlled, onExpandedChange]);

  const containerStyle =
    variant === "card" ? [styles.container, styles.card] : styles.container;
  const headerStyleForVariant =
    variant === "card" ? styles.headerCard : styles.header;
  const titleStyleForVariant =
    variant === "card" ? styles.titleCard : styles.title;
  const contentPaddingStyle =
    variant === "card" ? styles.contentCard : styles.content;

  return (
    <View style={containerStyle}>
      <Pressable
        onPress={handlePress}
        accessible
        accessibilityRole="button"
        accessibilityLabel={`${title}, ${expanded ? collapseLabel : expandLabel}`}
        accessibilityState={{ expanded }}
        style={({ pressed }) => [
          headerStyleForVariant,
          pressed && styles.headerPressed,
        ]}
      >
        <Text style={titleStyleForVariant}>{title}</Text>
        <View style={styles.headerRight}>
          {typeof summary === "string" ? (
            <Text style={styles.summary} numberOfLines={1}>
              {summary}
            </Text>
          ) : (
            summary
          )}
          <Text style={styles.chevron}>{expanded ? "▾" : "▸"}</Text>
        </View>
      </Pressable>
      <Animated.View
        style={[expanded ? contentPaddingStyle : undefined, contentStyle]}
      >
        {expanded && children}
      </Animated.View>
    </View>
  );
}
