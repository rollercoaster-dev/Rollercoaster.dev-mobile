import type { Meta, StoryObj } from "@storybook/react";
import React from "react";
import { ScrollView, View } from "react-native";
import { ScopedTheme, StyleSheet } from "react-native-unistyles";
import { Text } from "../Text";
import { FocusProgressStrip } from "./FocusProgressStrip";
import { themes, themeNames, type ThemeName } from "../../themes/compose";

const meta: Meta<typeof FocusProgressStrip> = {
  title: "Iteration B/Focus Mode/FocusProgressStrip",
  component: FocusProgressStrip,
};

export default meta;

type Story = StoryObj<typeof FocusProgressStrip>;

const noop = () => {};

// R8 — constrain the strip to the prototype's 344px phone width, matching the
// FocusCurrentTaskCard stories. At the full canvas the bar stretches into a long
// bar unlike the phone-width prototype. Width box only — no header/nav chrome
// (that is #377).
function PhoneWidth({ children }: { children: React.ReactNode }) {
  return (
    <View style={storyStyles.stage}>
      <View style={storyStyles.frame}>{children}</View>
    </View>
  );
}

// 0 done → empty bar.
export const ZeroDone: Story = {
  render: () => (
    <PhoneWidth>
      <FocusProgressStrip doneCount={0} totalCount={5} onPress={noop} />
    </PhoneWidth>
  ),
};

// Partial → bar fills to the fraction (2/5 = 40%).
export const PartialProgress: Story = {
  render: () => (
    <PhoneWidth>
      <FocusProgressStrip doneCount={2} totalCount={5} onPress={noop} />
    </PhoneWidth>
  ),
};

// All done → full bar.
export const AllDone: Story = {
  render: () => (
    <PhoneWidth>
      <FocusProgressStrip doneCount={5} totalCount={5} onPress={noop} />
    </PhoneWidth>
  ),
};

// The strip across all 7 product themes (#406). `ScopedTheme` scopes a subtree to
// one named theme, so each strip picks up its own fonts, borders, and the
// `journeyProgressFill` color — same scaffolding as FocusCurrentTaskCard's
// AllThemesMatrix. One representative partial fraction is shown so the fill/track
// pairing (D1) is comparable across themes.
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
              <FocusProgressStrip doneCount={2} totalCount={5} onPress={noop} />
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
