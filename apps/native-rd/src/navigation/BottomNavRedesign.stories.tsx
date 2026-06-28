/**
 * Bottom Nav redesign comparison — issue #379.
 *
 * Two candidate tab bars for the "quieter redesign", side by side so the
 * choice can be made by eye across all 7 themes (use the Storybook theme
 * toolbar). BOTH candidates share the locked structural decisions:
 *
 *   - the yellow "+ new goal" FAB is GONE (it moves into the Goals list header)
 *   - Settings is folded INTO the main pill as a 3rd segment (no detached pill)
 *   - the half-lifted pill + PILL_LIFT are kept intact (EvidenceDrawer + inset
 *     untouched — this file imports the real PILL_LIFT to prove it)
 *   - Badges stays an equal peer; the bar is globally stable
 *
 * They differ ONLY in the active-tab treatment:
 *   A — Updated current: today's label-morph capsule, now with 3 tabs.
 *   B — The Slide:       a chunky knob that snaps along a track, with a
 *                        per-destination colour through-line (yellow/mint/white).
 *
 * This is a throwaway comparison artifact, not shipped UI. The chosen
 * treatment graduates into FocusPillTabBar.tsx in the implementation PR.
 */
import type { Meta, StoryObj } from "@storybook/react";
import React, { useState } from "react";
import {
  LayoutAnimation,
  type LayoutChangeEvent,
  Platform,
  Pressable,
  Text as RNText,
  View,
  type ViewStyle,
} from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GearSix, Medal, Target, type IconProps } from "phosphor-react-native";
import { Text } from "../components/Text";
import { shadowStyle } from "../styles/shadows";
import { PILL_HEIGHT, PILL_LIFT } from "./FocusPillTabBar";

const ICON_SIZE = 24;
const ICON_WEIGHT = "bold" as const;
const SLIDE_DURATION = 200;

/**
 * Dark ink locked for contrast on the yellow/mint knobs (~17:1). theme.colors.text
 * flips to near-white in dark mode and would fail on those surfaces. The current
 * FocusPillTabBar locks the same value on its FAB plus icon — shipping The Slide
 * cleanly would require new accentYellowFg / accentMintFg on-accent tokens (there
 * is an accentPurpleFg precedent but no yellow/mint equivalent yet). All three
 * knobs (yellow/mint/purple) use this locked black for their icon + label.
 */
const KNOB_INK = "#0a0a0a";

type Dest = "Goals" | "Badges" | "Settings";
const DESTS: Dest[] = ["Goals", "Badges", "Settings"];

function DestIcon({ dest, color }: { dest: Dest } & Pick<IconProps, "color">) {
  const props = { color, size: ICON_SIZE, weight: ICON_WEIGHT };
  if (dest === "Goals") return <Target {...props} />;
  if (dest === "Badges") return <Medal {...props} />;
  return <GearSix {...props} />;
}

/* ------------------------------------------------------------------ *
 * Variant A — Updated current (label-morph capsule, 3 tabs, no FAB)
 * ------------------------------------------------------------------ */

function MorphVariant() {
  const [active, setActive] = useState<Dest>("Goals");
  const { theme } = useUnistyles();

  const select = (d: Dest) => {
    // Mirrors the real bar: animates on native, snaps on web (LayoutAnimation
    // is a no-op under react-native-web) — an honest preview of production.
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setActive(d);
  };

  return (
    <View style={s.band}>
      <View style={s.bar}>
        <View style={[s.pill, s.pillRow]}>
          {DESTS.map((d) => {
            const isActive = d === active;
            return (
              <Pressable
                key={d}
                accessibilityRole="tab"
                accessibilityLabel={d}
                accessibilityState={{ selected: isActive }}
                onPress={() => select(d)}
                style={[s.tab, isActive ? s.tabActive : s.tabCollapsed]}
              >
                <DestIcon
                  dest={d}
                  color={
                    isActive
                      ? theme.chrome.brandAccentFg
                      : theme.colors.textSecondary
                  }
                />
                {isActive ? (
                  <RNText
                    numberOfLines={1}
                    style={[s.label, { color: theme.chrome.brandAccentFg }]}
                  >
                    {d}
                  </RNText>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ *
 * Variant B — The Slide (snapping knob + colour through-line)
 * ------------------------------------------------------------------ */

function SlideVariant() {
  const [active, setActive] = useState<Dest>("Goals");
  const [trackWidth, setTrackWidth] = useState(0);
  const { theme } = useUnistyles();

  // Per-destination knob colour through-line: each destination sits on its own
  // accent (Goals=yellow, Badges=mint, Settings=purple) with locked dark ink
  // (see KNOB_INK). The accent tokens hold their hue across light/dark, so dark
  // ink stays readable on all three in every theme.
  const knobColors = (dest: Dest): { bg: string; fg: string } => {
    if (dest === "Settings")
      return { bg: theme.colors.accentPurple, fg: KNOB_INK };
    if (dest === "Goals")
      return { bg: theme.colors.accentYellow, fg: KNOB_INK };
    return { bg: theme.colors.accentMint, fg: KNOB_INK };
  };
  const knob = knobColors(active);

  const slotWidth = trackWidth > 0 ? trackWidth / DESTS.length : 0;
  const activeIndex = DESTS.indexOf(active);

  // Hard slide — translateX only. The Animated API is fragile under
  // react-native-web + the unistyles plugin, so the glide is a web-only CSS
  // transition; native simply snaps (the morph variant is native-only too).
  const webGlide = (Platform.OS === "web"
    ? {
        transitionProperty: "transform",
        transitionDuration: `${SLIDE_DURATION}ms`,
      }
    : null) as unknown as ViewStyle | null;

  const onTrackLayout = (e: LayoutChangeEvent) =>
    setTrackWidth(e.nativeEvent.layout.width);

  return (
    <View style={s.band}>
      <View style={s.bar}>
        <View style={[s.pill, s.slidePill]}>
          <View style={s.track} onLayout={onTrackLayout}>
            {/* The snapping knob */}
            {slotWidth > 0 ? (
              <View
                pointerEvents="none"
                style={[
                  s.knob,
                  {
                    width: slotWidth,
                    backgroundColor: knob.bg,
                    transform: [{ translateX: activeIndex * slotWidth }],
                  },
                  webGlide,
                ]}
              >
                <DestIcon dest={active} color={knob.fg} />
                <RNText numberOfLines={1} style={[s.label, { color: knob.fg }]}>
                  {active}
                </RNText>
              </View>
            ) : null}

            {/* Always-visible muted slots behind the knob */}
            {DESTS.map((d) => {
              const isActive = d === active;
              return (
                <Pressable
                  key={d}
                  accessibilityRole="tab"
                  accessibilityLabel={d}
                  accessibilityState={{ selected: isActive }}
                  onPress={() => setActive(d)}
                  style={s.slot}
                >
                  {/* Hide the resting icon under the knob to avoid double-draw */}
                  {isActive ? null : (
                    <DestIcon dest={d} color={theme.colors.textSecondary} />
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ *
 * Story scaffolding
 * ------------------------------------------------------------------ */

function Frame({
  title,
  note,
  children,
}: {
  title: string;
  note: string;
  children: React.ReactNode;
}) {
  return (
    <View style={s.frameWrap}>
      <Text variant="label" style={s.frameTitle}>
        {title}
      </Text>
      <Text variant="caption" style={s.frameNote}>
        {note}
      </Text>
      <View style={s.phone}>
        <View style={s.phoneFill} />
        {children}
      </View>
    </View>
  );
}

const meta: Meta = {
  title: "Navigation/Bottom Nav Redesign (#379)",
  decorators: [
    (Story) => (
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 0, height: 0 },
          insets: { top: 0, left: 0, right: 0, bottom: 0 },
        }}
      >
        <Story />
      </SafeAreaProvider>
    ),
  ],
};
export default meta;

type Story = StoryObj;

export const Compare: Story = {
  render: () => (
    <View style={s.column}>
      <Text variant="body" style={s.intro}>
        Both drop the “+” FAB (moves to the Goals list) and fold Settings into
        the pill. Tap a destination to switch. Flip the theme toolbar to check
        all 7 themes.
      </Text>
      <Frame
        title="A — Updated current"
        note="Today's label-morph capsule, now 3 tabs. Familiar; motion gated by the animation pref."
      >
        <MorphVariant />
      </Frame>
      <Frame
        title="B — The Slide"
        note="Knob snaps between slots; Goals=yellow, Badges=mint, Settings=purple. Black ink on each. One label at a time."
      >
        <SlideVariant />
      </Frame>
    </View>
  ),
};

const s = StyleSheet.create((theme) => {
  const pillBase = {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    height: PILL_HEIGHT,
    paddingHorizontal: 8,
    borderRadius: 999,
    borderColor: theme.colors.border,
    borderWidth: theme.borderWidth.medium,
    backgroundColor: theme.colors.background,
    ...shadowStyle(theme, "cardElevation"),
  };
  return {
    column: { gap: theme.space[8] },
    intro: { color: theme.colors.textSecondary },
    frameWrap: { gap: theme.space[2] },
    frameTitle: {
      color: theme.colors.text,
      textTransform: "uppercase" as const,
      fontSize: theme.size.xs,
      letterSpacing: theme.letterSpacing.wide,
    },
    frameNote: { color: theme.colors.textMuted },
    // A stand-in screen so the lifted pill is seen breaking above the slot.
    phone: {
      width: 360,
      maxWidth: "100%" as const,
      borderColor: theme.colors.border,
      borderWidth: theme.borderWidth.thin,
      borderRadius: theme.radius.md,
      overflow: "hidden" as const,
    },
    phoneFill: { height: 120, backgroundColor: theme.colors.background },

    band: {
      backgroundColor: theme.chrome.brandAccentBg,
      borderTopWidth: theme.borderWidth.medium,
      borderTopColor: theme.chrome.brandAccentBorder,
      overflow: "visible" as const,
      paddingHorizontal: 16,
      paddingBottom: theme.space[2],
    },
    bar: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      marginTop: -PILL_LIFT,
    },
    pill: { ...pillBase, flex: 1 },
    pillRow: { justifyContent: "space-between" as const, gap: 6 },

    // Variant A — morph capsule
    tab: {
      height: 48,
      borderRadius: 999,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      flexDirection: "row" as const,
    },
    tabCollapsed: { width: 48 },
    tabActive: {
      backgroundColor: theme.chrome.brandAccentBg,
      borderColor: theme.chrome.brandAccentBorder,
      borderWidth: theme.borderWidth.medium,
      paddingHorizontal: 16,
      gap: 8,
    },

    // Variant B — slide
    slidePill: { paddingHorizontal: 6 },
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
  };
});
