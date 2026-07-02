import type { Meta, StoryObj } from "@storybook/react";
import React from "react";
import { ScrollView, View } from "react-native";
import { ScopedTheme, StyleSheet } from "react-native-unistyles";
import { Text } from "../Text";
import { FocusParkedState, type FocusParkedRow } from "./FocusParkedState";
import { themes, themeNames, type ThemeName } from "../../themes/compose";

const meta: Meta<typeof FocusParkedState> = {
  title: "Iteration B/Focus Mode/FocusParkedState",
  component: FocusParkedState,
};

export default meta;

type Story = StoryObj<typeof FocusParkedState>;

const noop = () => {};

const oneRow: FocusParkedRow[] = [
  { id: "s1", title: "Call the clinic to book a check-in", onResume: noop },
];

const manyRows: FocusParkedRow[] = [
  { id: "s1", title: "Call the clinic to book a check-in", onResume: noop },
  { id: "s2", title: "Reset the kitchen before bed", onResume: noop },
  { id: "s3", title: "Draft the intro paragraph", onResume: noop },
  { id: "s4", title: "Wire the circuits", onResume: noop },
];

// R8 — constrain to the prototype's 344px phone width, matching the
// FocusCurrentTaskCard / FocusProgressStrip stories. Width box only — no
// header/nav chrome (that is #377).
function PhoneWidth({ children }: { children: React.ReactNode }) {
  return (
    <View style={storyStyles.stage}>
      <View style={storyStyles.frame}>{children}</View>
    </View>
  );
}

// A single paused step: "1 set aside — …" + one resumable row.
export const OneRow: Story = {
  render: () => (
    <PhoneWidth>
      <FocusParkedState rows={oneRow} />
    </PhoneWidth>
  ),
};

// Several paused steps: "4 set aside — …" + a row each.
export const ManyRows: Story = {
  render: () => (
    <PhoneWidth>
      <FocusParkedState rows={manyRows} />
    </PhoneWidth>
  ),
};

// The parked state across all 7 product themes (#406). `ScopedTheme` scopes a
// subtree to one named theme, so each renders its own fonts, borders, shadows,
// and the #406 paused-pill color — same scaffolding as FocusCurrentTaskCard's
// AllThemesMatrix. The multi-row fixture shows the richest chrome per theme.
const MOOD_NAMES: Record<ThemeName, string> = {
  "light-default": "Full Ride",
  "dark-default": "Night Ride",
  "light-highContrast": "Bold Ink",
  "light-dyslexia": "Warm Studio",
  "light-autismFriendly": "Still Water",
  "light-lowVision": "Loud & Clear",
  "light-lowInfo": "Clean Signal",
};

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
              <FocusParkedState rows={manyRows} />
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
