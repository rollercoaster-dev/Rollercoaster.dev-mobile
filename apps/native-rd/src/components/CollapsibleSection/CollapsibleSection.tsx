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

export interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  /** Controlled expansion. Leave undefined to use internal state. */
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  /**
   * Trailing header content. Strings are wrapped in a Text node; elements
   * render as-is. Narrowed away from full `React.ReactNode` so callers can't
   * pass a raw number/boolean — those would slip past the `typeof === "string"`
   * branch and try to render directly inside `<View>`, which RN rejects.
   */
  summary?: string | React.ReactElement;
  /** Override the "expand"/"collapse" verb in the accessibilityLabel. */
  expandLabel?: string;
  collapseLabel?: string;
  /**
   * Hint announced after the accessibilityLabel. Defaults to the string form
   * of `summary` so screen readers can hear the trailing value (e.g. "Shape,
   * collapse — Shield"). Pass an explicit string when `summary` is a custom
   * React element, or `null` to suppress the default.
   */
  accessibilityHint?: string | null;
  /**
   * When set, the outer container receives this `testID` and the animated
   * content view receives `${testID}-content`. Leave undefined to opt out of
   * default testIDs — multiple instances in one tree must each pass their own.
   */
  testID?: string;
}

export function CollapsibleSection({
  title,
  children,
  defaultExpanded = true,
  expanded: expandedProp,
  onExpandedChange,
  summary,
  expandLabel = "expand",
  collapseLabel = "collapse",
  accessibilityHint,
  testID,
}: CollapsibleSectionProps) {
  const isControlled = expandedProp !== undefined;
  const [internalExpanded, setInternalExpanded] = useState(defaultExpanded);
  const expanded = isControlled ? expandedProp : internalExpanded;
  const [focused, setFocused] = useState(false);

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

  // Default the hint to the string summary so VoiceOver/TalkBack announce
  // the trailing value (otherwise the visual `<Text>` summary is silent —
  // the Pressable is `accessible` and swallows nested text). `null` opts
  // out; an explicit string wins over both.
  const resolvedHint =
    accessibilityHint === null
      ? undefined
      : (accessibilityHint ??
        (typeof summary === "string" ? summary : undefined));

  return (
    <View style={styles.container} testID={testID}>
      <Pressable
        onPress={handlePress}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        accessible
        accessibilityRole="button"
        accessibilityLabel={`${title}, ${expanded ? collapseLabel : expandLabel}`}
        accessibilityHint={resolvedHint}
        accessibilityState={{ expanded }}
        style={({ pressed }) => [
          styles.header,
          focused && styles.headerFocused,
          pressed && styles.headerPressed,
        ]}
      >
        <Text style={styles.title}>{title}</Text>
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
        testID={testID ? `${testID}-content` : undefined}
        style={[expanded ? styles.content : undefined, contentStyle]}
      >
        {expanded && children}
      </Animated.View>
    </View>
  );
}
