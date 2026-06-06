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
  /** Controlled expansion. Leave undefined to use internal state. */
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  /** Trailing header content. Strings are wrapped in a Text node. */
  summary?: React.ReactNode;
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

  // Reanimated 3 caveat: returning `undefined` for a previously-numeric prop
  // (e.g. flipping maxHeight from 0 back to "auto") does not reliably clear
  // the cached value on the native side, so opened sections stayed clamped
  // at the closed maxHeight. Mirror the HTML prototype's <details> behaviour
  // instead: fade opacity, but let the natural height come from whether the
  // children are mounted (`expanded && children` below). The regression test
  // in this file's `animated content style` block guards the rule.
  const contentStyle = useAnimatedStyle(() => ({
    opacity: expandedValue.value,
  }));

  const handlePress = useCallback(() => {
    const next = !expanded;
    if (!isControlled) setInternalExpanded(next);
    onExpandedChange?.(next);
  }, [expanded, isControlled, onExpandedChange]);

  const v =
    variant === "card"
      ? {
          container: [styles.container, styles.card],
          header: styles.headerCard,
          title: styles.titleCard,
          content: styles.contentCard,
        }
      : {
          container: styles.container,
          header: styles.header,
          title: styles.title,
          content: styles.content,
        };

  return (
    <View style={v.container}>
      <Pressable
        onPress={handlePress}
        accessible
        accessibilityRole="button"
        accessibilityLabel={`${title}, ${expanded ? collapseLabel : expandLabel}`}
        accessibilityState={{ expanded }}
        style={({ pressed }) => [v.header, pressed && styles.headerPressed]}
      >
        <Text style={v.title}>{title}</Text>
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
        testID="collapsible-content"
        style={[expanded ? v.content : undefined, contentStyle]}
      >
        {expanded && children}
      </Animated.View>
    </View>
  );
}
