import type { Meta, StoryObj } from "@storybook/react";
import React from "react";
import { ScrollView, View } from "react-native";
import { ScopedTheme, StyleSheet } from "react-native-unistyles";
import { Text } from "../Text";
import { FocusCurrentTaskCard } from "./FocusCurrentTaskCard";
import type { FocusCapturedEvidenceItem } from "./FocusCurrentTaskCard";
import { themes, themeNames, type ThemeName } from "../../themes/compose";

const meta: Meta<typeof FocusCurrentTaskCard> = {
  title: "Iteration B/Focus Mode/FocusCurrentTaskCard",
  component: FocusCurrentTaskCard,
};

export default meta;

type Story = StoryObj<typeof FocusCurrentTaskCard>;

const noop = () => {};

// Every handler wired to a noop so stories exercise the full CTA surface without
// app plumbing (#377 owns the real wiring; #409 owns the type-change sheet).
const handlers = {
  onPause: noop,
  onPickUp: noop,
  onMarkComplete: noop,
  onReopen: noop,
  onDesignBadge: noop,
  onChangeEvidenceType: noop,
  onAddEvidence: noop,
};

const capturedTwo: FocusCapturedEvidenceItem[] = [
  { id: "ev-1", type: "photo", caption: "Kitchen reset — day 3" },
  { id: "ev-2", type: "link", caption: null },
];

// R8 — constrain the card to the prototype's 344px phone width. At the full
// Storybook canvas (~1083px) the box/button stretched into long bars and the title
// stopped wrapping, so even a faithful card read "spread out." This is a width box
// ONLY — no header, progress, nav, or timeline chrome (all of that is #377). The
// card sits flat on the screen bg, exactly as in `Focus Mode A Prototype.dc.html`.
function PhoneWidth({ children }: { children: React.ReactNode }) {
  return (
    <View style={storyStyles.stage}>
      <View style={storyStyles.frame}>{children}</View>
    </View>
  );
}

export const InProgress: Story = {
  render: () => (
    <PhoneWidth>
      <FocusCurrentTaskCard
        status="in-progress"
        title="Reset the kitchen before bed"
        plannedEvidenceType="photo"
        capturedEvidence={capturedTwo}
        {...handlers}
      />
    </PhoneWidth>
  ),
};

// No captured evidence → "✓ Mark complete" is absent (revealed by evidence, never
// shown disabled). The pause + add-type CTAs still stand.
export const InProgressNoEvidence: Story = {
  render: () => (
    <PhoneWidth>
      <FocusCurrentTaskCard
        status="in-progress"
        title="Reset the kitchen before bed"
        plannedEvidenceType="photo"
        {...handlers}
      />
    </PhoneWidth>
  ),
};

// Full C·B band, mirroring the `Focus Mode A` prototype's Inspection step: an
// external wait ("waiting on …"), an internal dependency ("after …"), and a due
// date all render as independent glyph-led lines. No captured evidence, so the
// blocked state shows the blue "Add Note" primary + the reassurance line.
export const InProgressWithECBBand: Story = {
  render: () => (
    <PhoneWidth>
      <FocusCurrentTaskCard
        status="in-progress"
        title="Inspection & labels"
        plannedEvidenceType="text"
        waitingOn={{ who: "city inspector", expected: "Jun 24" }}
        afterStep="Wire the circuits"
        dueDate="Fri · Jun 27"
        {...handlers}
      />
    </PhoneWidth>
  ),
};

export const Paused: Story = {
  render: () => (
    <PhoneWidth>
      <FocusCurrentTaskCard
        status="paused"
        title="Call the clinic to book a check-in"
        {...handlers}
      />
    </PhoneWidth>
  ),
};

export const Completed: Story = {
  render: () => (
    <PhoneWidth>
      <FocusCurrentTaskCard
        status="completed"
        title="Reset the kitchen before bed"
        capturedEvidence={capturedTwo}
        {...handlers}
      />
    </PhoneWidth>
  ),
};

export const AllComplete: Story = {
  render: () => (
    <PhoneWidth>
      <FocusCurrentTaskCard status="all-complete" title="" {...handlers} />
    </PhoneWidth>
  ),
};

// The real card across all 7 product themes (#406). Unistyles' theme is a global
// runtime singleton, but `ScopedTheme` scopes a subtree to one named theme, so we
// render the actual FocusCurrentTaskCard once per theme — each card picks up its
// own fonts, borders, shadows, and the #406 state colors. Same approach as
// BadgeWallCell.stories' AllThemesMatrix. One representative state (in-progress
// with evidence) is shown so the richest chrome — title, evidence box, captured
// rail, and both CTAs — is comparable across themes.
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
              <FocusCurrentTaskCard
                status="in-progress"
                title="Reset the kitchen before bed"
                plannedEvidenceType="photo"
                capturedEvidence={capturedTwo}
                {...handlers}
              />
            </View>
          </ScopedTheme>
        </View>
      ))}
    </ScrollView>
  ),
};

// The states AllThemesMatrix doesn't exercise — paused + completed pill colors
// and the metadata-band glyph hues — rendered per theme so those #406 colors are
// comparable across all 7 moods (the primary matrix shows in-progress only).
export const StatesAllThemes: Story = {
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
                storyStyles.matrixCardStack,
                { backgroundColor: themes[name].colors.background },
              ]}
            >
              <FocusCurrentTaskCard
                status="in-progress"
                title="Inspection & labels"
                plannedEvidenceType="text"
                waitingOn={{ who: "city inspector", expected: "Jun 24" }}
                afterStep="Wire the circuits"
                dueDate="Fri · Jun 27"
                {...handlers}
              />
              <FocusCurrentTaskCard
                status="paused"
                title="Call the clinic to book a check-in"
                {...handlers}
              />
              <FocusCurrentTaskCard
                status="completed"
                title="Reset the kitchen before bed"
                capturedEvidence={capturedTwo}
                {...handlers}
              />
            </View>
          </ScopedTheme>
        </View>
      ))}
    </ScrollView>
  ),
};

const storyStyles = StyleSheet.create((theme) => ({
  // Centering canvas — a slightly different bg so the 344px card area reads as a
  // distinct surface. No phone chrome; just somewhere for the card to sit.
  stage: {
    alignItems: "center",
    padding: theme.space[6],
    backgroundColor: theme.colors.backgroundSecondary,
  },
  // The card only, at the prototype's 344px phone width, on the screen bg with the
  // screen padding #377 will own. The flattened card itself carries no frame (R1).
  frame: {
    width: 344,
    padding: theme.space[5],
    backgroundColor: theme.colors.background,
  },
  // Wrapping grid — one full card per theme, flowing left-to-right and wrapping to
  // the next row as the canvas narrows. The toolbar-themed canvas holds the
  // per-theme labels; each card sits on its own theme background (set inline from
  // `themes[name]`) inside a ScopedTheme so its reactive styles resolve correctly.
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
  // Same 344px phone width + screen padding the single-theme stories use, so each
  // matrix card reads exactly like the real card on its theme's screen bg.
  matrixCard: {
    width: 344,
    padding: theme.space[5],
  },
  // Like matrixCard but stacks several state variants of the card in one column.
  matrixCardStack: {
    width: 344,
    padding: theme.space[5],
    gap: theme.space[4],
  },
}));
