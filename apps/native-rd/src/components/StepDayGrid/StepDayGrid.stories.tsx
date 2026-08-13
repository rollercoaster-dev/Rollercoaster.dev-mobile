import type { Meta, StoryObj } from "@storybook/react";
import React, { useState } from "react";
import { ScrollView, View } from "react-native";
import { ScopedTheme, StyleSheet } from "react-native-unistyles";
import { Text } from "../Text";
import { StepDayGrid, type StepDayMark } from "./StepDayGrid";
import { themes, themeNames, type ThemeName } from "../../themes/compose";

const meta: Meta<typeof StepDayGrid> = {
  title: "Set B & C/StepDayGrid",
  component: StepDayGrid,
};

export default meta;

type Story = StoryObj<typeof StepDayGrid>;

/**
 * The Direction D prototype's pinned instant — Wed 24 June 2026. Every story
 * and test uses it so a reviewer can hold the prototype and Storybook side by
 * side, and so "today" never drifts under the snapshots.
 */
const NOW = new Date(2026, 5, 24);

/** Days the rest of the "Rewire the workshop" plan sits on. */
const MARKS: StepDayMark[] = [
  { date: "2026-06-26", label: "2" },
  { date: "2026-06-30", label: "3" },
  { date: "2026-06-30", label: "a" },
  { date: "2026-06-30", label: "b" },
  { date: "2026-07-02", label: "4" },
];

/**
 * The grid is a controlled input, so every story owns the selection — that is
 * also what makes tap-again-to-clear visible by hand.
 */
function LiveGrid({
  initial = null,
  marks,
  locale,
}: {
  initial?: string | null;
  marks?: StepDayMark[];
  locale?: string;
}) {
  const [value, setValue] = useState<string | null>(initial);
  return (
    <View style={storyStyles.stack}>
      <StepDayGrid
        value={value}
        now={NOW}
        marks={marks}
        locale={locale}
        onChange={setValue}
      />
      <Text style={storyStyles.readout}>value: {value ?? "null"}</Text>
    </View>
  );
}

// R8 — the prototype's 344px phone width, matching the sibling stories.
function PhoneWidth({ children }: { children: React.ReactNode }) {
  return (
    <View style={storyStyles.stage}>
      <View style={storyStyles.frame}>{children}</View>
    </View>
  );
}

/** No day chosen. Today (Jun 24) carries the ring; nothing is filled. */
export const Unset: Story = {
  render: () => (
    <PhoneWidth>
      <LiveGrid />
    </PhoneWidth>
  ),
};

/** A future day selected. Tap it again to clear it. */
export const DaySelected: Story = {
  render: () => (
    <PhoneWidth>
      <LiveGrid initial="2026-06-30" />
    </PhoneWidth>
  ),
};

/**
 * A past day selected — quieter, never refused. Jun 18 is six days before the
 * pinned now; it selects, reads back, and clears exactly like any other day.
 */
export const PastDaySelected: Story = {
  render: () => (
    <PhoneWidth>
      <LiveGrid initial="2026-06-18" />
    </PhoneWidth>
  ),
};

/**
 * Marks from the rest of the plan. Jun 30 carries three, so it shows two
 * ordinals plus the overflow badge.
 */
export const WithMarks: Story = {
  render: () => (
    <PhoneWidth>
      <LiveGrid marks={MARKS} initial="2026-06-30" />
    </PhoneWidth>
  ),
};

/**
 * November 2026 starts on a Sunday — the maximum six leading blanks in a
 * Monday-first week.
 */
export const MonthStartingSunday: Story = {
  render: () => (
    <PhoneWidth>
      <LiveGrid initial="2026-11-15" />
    </PhoneWidth>
  ),
};

/**
 * Opens on December 2026. Tap `›` once to cross into January 2027 — month
 * navigation is unbounded, so no day is ever out of reach.
 */
export const AcrossAYearBoundary: Story = {
  render: () => (
    <PhoneWidth>
      <LiveGrid initial="2026-12-28" />
    </PhoneWidth>
  ),
};

/** German month and weekday names, proving the Intl path rather than an array. */
export const GermanLocale: Story = {
  render: () => (
    <PhoneWidth>
      <LiveGrid initial="2026-06-30" marks={MARKS} locale="de" />
    </PhoneWidth>
  ),
};

/**
 * #574's "confirm at `largeText` density" check, at the 344px phone width.
 *
 * `largeText` is a composable *variant*, not one of the seven registered
 * product themes, and `ScopedTheme` only accepts registered names — so it
 * cannot be rendered directly here. `light-lowVision` is the stand-in and it is
 * an exact one for this purpose: it carries `size: sizeL`
 * (`src/themes/variants.ts:128`), the same 1.25x scale `largeText` applies
 * (`:96`). At that scale, confirm every day cell still clears 44pt and the
 * digit columns do not jitter.
 */
export const LargeTextDensity: Story = {
  render: () => (
    <ScopedTheme name="light-lowVision">
      <View
        style={[
          storyStyles.stage,
          { backgroundColor: themes["light-lowVision"].colors.background },
        ]}
      >
        <View style={storyStyles.frame}>
          <LiveGrid initial="2026-06-30" marks={MARKS} />
        </View>
      </View>
    </ScopedTheme>
  ),
};

const MOOD_NAMES: Record<ThemeName, string> = {
  "light-default": "Full Ride",
  "dark-default": "Night Ride",
  "light-highContrast": "Bold Ink",
  "light-dyslexia": "Warm Studio",
  "light-autismFriendly": "Still Water",
  "light-lowVision": "Loud & Clear",
  "light-lowInfo": "Clean Signal",
};

/**
 * All 7 product themes, rendering the richest fixture (marks + a selected day)
 * so each theme's fill, ring, badge ground and shadow are all visible.
 */
export const AllThemesMatrix: Story = {
  render: () => (
    <ScrollView contentContainerStyle={storyStyles.matrixContainer}>
      {themeNames.map((name) => (
        <View key={name} style={storyStyles.matrixThemeBlock}>
          <View style={storyStyles.matrixThemeLabel}>
            <Text style={storyStyles.matrixThemeName}>{MOOD_NAMES[name]}</Text>
            <Text style={storyStyles.matrixThemeKey}>{name}</Text>
          </View>
          <ScopedTheme name={name}>
            <View
              style={[
                storyStyles.matrixCard,
                { backgroundColor: themes[name].colors.background },
              ]}
            >
              <StepDayGrid
                value="2026-06-30"
                now={NOW}
                marks={MARKS}
                onChange={() => {}}
              />
            </View>
          </ScopedTheme>
        </View>
      ))}
    </ScrollView>
  ),
};

const storyStyles = StyleSheet.create((theme) => ({
  stage: {
    alignItems: "center",
    padding: theme.space[6],
    backgroundColor: theme.colors.backgroundSecondary,
  },
  frame: {
    width: 344,
    padding: theme.space[5],
    backgroundColor: theme.colors.background,
  },
  stack: {
    gap: theme.space[3],
  },
  readout: {
    fontFamily: theme.fontFamily.mono,
    fontSize: theme.size.xs,
    color: theme.colors.textMuted,
  },
  matrixContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "flex-start",
    padding: theme.space[4],
    gap: theme.space[6],
    backgroundColor: theme.colors.backgroundSecondary,
  },
  matrixThemeBlock: {
    gap: theme.space[2],
  },
  matrixThemeLabel: {
    gap: theme.space[1],
  },
  matrixThemeName: {
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
  },
  matrixThemeKey: {
    fontFamily: theme.fontFamily.mono,
    fontSize: theme.size.xs,
    color: theme.colors.textMuted,
  },
  matrixCard: {
    width: 344,
    padding: theme.space[5],
  },
}));
