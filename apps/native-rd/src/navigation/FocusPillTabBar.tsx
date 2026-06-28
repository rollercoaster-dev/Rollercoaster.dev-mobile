import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  type LayoutChangeEvent,
  Pressable,
  Text as RNText,
  View,
} from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { CommonActions } from "@react-navigation/native";
import { GearSix, Medal, Target } from "phosphor-react-native";
import { useTranslation } from "react-i18next";
import { shadowStyle } from "../styles/shadows";
import { borderWidth } from "../themes/tokens";
import { useAnimationPref } from "../hooks/useAnimationPref";
import type { RootTabParamList } from "./types";

type RouteName = keyof RootTabParamList;

const ICON_SIZE = 24;
const ICON_WEIGHT = "bold" as const;
const SLIDE_DURATION = 200;
export const PILL_HEIGHT = 64;

/** Distance the pill's outer edge sits above the tab bar slot — the bar
 * uses this as a negative top margin so its top half breaks above the
 * slot. Consumers (e.g. EvidenceDrawer, screen content padding) need the
 * same value to clear the lifted half. */
export const PILL_LIFT = PILL_HEIGHT / 2 + borderWidth.medium;

/** Fixed visual order of the three destinations in the track (#379). */
const DEST_ORDER: RouteName[] = ["GoalsTab", "BadgesTab", "SettingsTab"];

/** Calm variants drop the per-destination colour through-line for a single
 * muted `brandAccent` knob: the bright accents don't mute here and the chip
 * edge dissolves, so the through-line breaks the reduced-noise mandate (D9). */
const CALM_VARIANTS: ReadonlySet<string> = new Set([
  "dyslexia",
  "autismFriendly",
  "lowInfo",
]);

function TabIcon({ name, color }: { name: RouteName; color: string }) {
  if (name === "GoalsTab")
    return <Target color={color} size={ICON_SIZE} weight={ICON_WEIGHT} />;
  if (name === "BadgesTab")
    return <Medal color={color} size={ICON_SIZE} weight={ICON_WEIGHT} />;
  return <GearSix color={color} size={ICON_SIZE} weight={ICON_WEIGHT} />;
}

export function FocusPillTabBar({ state, navigation }: BottomTabBarProps) {
  const { theme } = useUnistyles();
  const insets = useSafeAreaInsets();
  const { shouldAnimate } = useAnimationPref();
  const { t } = useTranslation();

  const tabLabels = useMemo<Record<RouteName, string>>(
    () => ({
      GoalsTab: t("navigation.tabs.goals"),
      BadgesTab: t("navigation.tabs.badges"),
      SettingsTab: t("navigation.tabs.settings"),
    }),
    [t],
  );

  const inactiveColor = theme.colors.textSecondary;

  // Per-destination knob colour. Through-line themes carry a hue per slot via
  // on-accent tokens; calm themes share one muted brandAccent fill (D9). The
  // accent tokens already resolve to the correct light/dark value, so gating
  // on the variant alone is enough.
  const knobColorsFor = (name: RouteName): { bg: string; fg: string } => {
    if (CALM_VARIANTS.has(theme.variant)) {
      return { bg: theme.chrome.brandAccentBg, fg: theme.chrome.brandAccentFg };
    }
    if (name === "GoalsTab")
      return { bg: theme.colors.accentYellow, fg: theme.colors.accentYellowFg };
    if (name === "BadgesTab")
      return { bg: theme.colors.accentMint, fg: theme.colors.accentMintFg };
    return { bg: theme.colors.accentPurple, fg: theme.colors.accentPurpleFg };
  };

  const findRoute = (name: RouteName) => {
    const idx = state.routes.findIndex((r) => r.name === name);
    if (idx === -1) return null;
    return { route: state.routes[idx], index: idx };
  };

  const navigateTo = (entry: NonNullable<ReturnType<typeof findRoute>>) => {
    const isActive = state.index === entry.index;
    const event = navigation.emit({
      type: "tabPress",
      target: entry.route.key,
      canPreventDefault: true,
    });
    if (!isActive && !event.defaultPrevented) {
      navigation.dispatch({
        ...CommonActions.navigate(entry.route.name, entry.route.params),
        target: state.key,
      });
    }
  };

  // Visible slots in fixed order, skipping any destination the navigator
  // didn't register (defensive — the tab navigator always has all three).
  const slots = DEST_ORDER.map((name) => {
    const entry = findRoute(name);
    return entry
      ? { name, entry, isActive: state.index === entry.index }
      : null;
  }).filter((s): s is NonNullable<typeof s> => s !== null);

  const activeSlotIndex = Math.max(
    0,
    slots.findIndex((s) => s.isActive),
  );
  const activeSlot = slots[activeSlotIndex];
  const activeKnob = activeSlot
    ? knobColorsFor(activeSlot.name)
    : { bg: theme.colors.transparent, fg: theme.colors.transparent };

  // The knob is absolutely positioned and slides between slot centres; its
  // width is one slot, so translateX = slotIndex * slotWidth.
  const [trackWidth, setTrackWidth] = useState(0);
  const slotWidth = slots.length > 0 ? trackWidth / slots.length : 0;
  // Lazy init keeps one stable Animated.Value across renders without reading a
  // ref's `current` during render (it never drives a re-render — we only
  // setValue / animate it).
  const [translateX] = useState(() => new Animated.Value(0));
  const measured = useRef(false);

  useEffect(() => {
    if (slotWidth <= 0) return;
    const toValue = activeSlotIndex * slotWidth;
    // Snap into place on the first real measure; animate only on later
    // destination changes (and only when motion is allowed).
    if (!measured.current || !shouldAnimate) {
      measured.current = true;
      translateX.setValue(toValue);
      return;
    }
    Animated.timing(translateX, {
      toValue,
      duration: SLIDE_DURATION,
      useNativeDriver: true,
    }).start();
  }, [activeSlotIndex, slotWidth, shouldAnimate, translateX]);

  const onTrackLayout = (e: LayoutChangeEvent) =>
    setTrackWidth(e.nativeEvent.layout.width);

  return (
    <View
      style={[
        styles.container,
        {
          paddingBottom: Math.max(insets.bottom, 4),
          paddingLeft: Math.max(insets.left, 0) + 16,
          paddingRight: Math.max(insets.right, 0) + 16,
        },
      ]}
    >
      <View style={styles.bar}>
        <View style={styles.pill}>
          <View style={styles.track} onLayout={onTrackLayout}>
            {activeSlot ? (
              <Animated.View
                testID="tab-slide-knob"
                pointerEvents="none"
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
                style={[
                  styles.knob,
                  {
                    width: slotWidth,
                    backgroundColor: activeKnob.bg,
                    opacity: slotWidth > 0 ? 1 : 0,
                    transform: [{ translateX }],
                  },
                ]}
              >
                <TabIcon name={activeSlot.name} color={activeKnob.fg} />
                <RNText
                  numberOfLines={1}
                  style={[styles.label, { color: activeKnob.fg }]}
                >
                  {tabLabels[activeSlot.name]}
                </RNText>
              </Animated.View>
            ) : null}

            {slots.map((slot) => (
              <Pressable
                key={slot.name}
                accessibilityRole="tab"
                accessibilityLabel={tabLabels[slot.name]}
                accessibilityState={{ selected: slot.isActive }}
                testID={`tab-${slot.name}`}
                onPress={() => navigateTo(slot.entry)}
                style={styles.slot}
              >
                {/* The active slot's icon is drawn by the knob above it. */}
                {slot.isActive ? null : (
                  <TabIcon name={slot.name} color={inactiveColor} />
                )}
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    backgroundColor: theme.chrome.brandAccentBg,
    borderTopWidth: theme.borderWidth.medium,
    borderTopColor: theme.chrome.brandAccentBorder,
    overflow: "visible" as const,
  },
  bar: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    marginTop: -PILL_LIFT,
  },
  pill: {
    flex: 1,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    height: PILL_HEIGHT,
    paddingHorizontal: 6,
    borderRadius: 999,
    borderColor: theme.colors.border,
    borderWidth: theme.borderWidth.medium,
    backgroundColor: theme.colors.background,
    ...shadowStyle(theme, "cardElevation"),
  },
  track: {
    flex: 1,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    height: 48,
    position: "relative" as const,
  },
  slot: {
    flex: 1,
    height: 48,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  knob: {
    position: "absolute" as const,
    height: 48,
    borderRadius: 999,
    borderColor: theme.colors.border,
    borderWidth: theme.borderWidth.medium,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 8,
    ...shadowStyle(theme, "cardElevation"),
  },
  label: {
    fontFamily: theme.fontFamily.body,
    fontWeight: theme.fontWeight.bold,
    fontSize: theme.size.sm,
    letterSpacing: theme.letterSpacing.tight,
  },
}));
