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
  onChangeEvidencePlan: noop,
  onAddEvidence: noop,
};

const capturedTwo: FocusCapturedEvidenceItem[] = [
  { id: "ev-1", type: "photo", caption: "Kitchen reset — day 3" },
  { id: "ev-2", type: "link", caption: null },
];

// A photo-only capture against a two-type plan: the plan is not yet satisfied.
const capturedPhotoOnly: FocusCapturedEvidenceItem[] = [
  { id: "ev-1", type: "photo", caption: "Kitchen reset — day 3" },
];

// Both planned types captured — the plan is fully satisfied.
const capturedPhotoAndNote: FocusCapturedEvidenceItem[] = [
  { id: "ev-1", type: "photo", caption: "Kitchen reset — day 3" },
  { id: "ev-2", type: "text", caption: "What I noticed" },
];

// R8 — constrain the card to a 344px phone width. At the full Storybook canvas
// (~1083px) the box/button stretched into long bars and the title stopped wrapping.
// No header, progress, nav, or timeline chrome; the card sits flat on the screen bg.
//
// Height is bounded too: the card fills its host and pins its footer to the bottom
// edge, so an auto-height host would collapse it.
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
        plannedEvidenceTypes={["photo"]}
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
        plannedEvidenceTypes={["photo"]}
        {...handlers}
      />
    </PhoneWidth>
  ),
};

// A two-type plan (photo + note) with only the photo captured: the plan is not
// yet satisfied, so "✓ Mark complete" is absent and the footer shows just the
// still-needed "Add Note" invite (the satisfied photo type is gone).
export const InProgressMultiEvidencePartial: Story = {
  render: () => (
    <PhoneWidth>
      <FocusCurrentTaskCard
        status="in-progress"
        title="Reset the kitchen before bed"
        plannedEvidenceTypes={["photo", "text"]}
        capturedEvidence={capturedPhotoOnly}
        {...handlers}
      />
    </PhoneWidth>
  ),
};

// Same two-type plan, both photo and note captured: the plan is satisfied, so
// "✓ Mark complete" leads with a generic "Add more evidence" secondary — no
// per-type invite remains, because no single type is still outstanding.
export const InProgressMultiEvidenceSatisfied: Story = {
  render: () => (
    <PhoneWidth>
      <FocusCurrentTaskCard
        status="in-progress"
        title="Reset the kitchen before bed"
        plannedEvidenceTypes={["photo", "text"]}
        capturedEvidence={capturedPhotoAndNote}
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
        plannedEvidenceTypes={["text"]}
        waitingOn={{ who: "city inspector", expected: "Jun 24" }}
        afterStep="Wire the circuits"
        dueDate="Fri · Jun 27"
        {...handlers}
      />
    </PhoneWidth>
  ),
};

// #571: the same band either side of the expected date, stacked so the ONLY
// difference is legible. The lead "waiting on …" text is untouched — the wait is
// still on — and only the trailing mono clause changes tense to "· was expected".
// No urgency colour, no "overdue" word: nothing went wrong, the date has passed.
export const InProgressWithWasExpected: Story = {
  render: () => (
    <PhoneWidth>
      <FocusCurrentTaskCard
        status="in-progress"
        title="Inspection & labels"
        plannedEvidenceTypes={["text"]}
        waitingOn={{ who: "city inspector", expected: "Jun 24" }}
        {...handlers}
      />
      <FocusCurrentTaskCard
        status="in-progress"
        title="Inspection & labels"
        plannedEvidenceTypes={["text"]}
        waitingOn={{ who: "city inspector", expected: "Jun 24", isPast: true }}
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
      <FocusCurrentTaskCard
        status="all-complete"
        title=""
        sealed={false}
        {...handlers}
      />
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
                plannedEvidenceTypes={["photo"]}
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
              <View style={storyStyles.stateSlot}>
                <FocusCurrentTaskCard
                  status="in-progress"
                  title="Inspection & labels"
                  plannedEvidenceTypes={["text"]}
                  waitingOn={{ who: "city inspector", expected: "Jun 24" }}
                  afterStep="Wire the circuits"
                  dueDate="Fri · Jun 27"
                  {...handlers}
                />
              </View>
              <View style={storyStyles.stateSlot}>
                <FocusCurrentTaskCard
                  status="paused"
                  title="Call the clinic to book a check-in"
                  {...handlers}
                />
              </View>
              <View style={storyStyles.stateSlot}>
                <FocusCurrentTaskCard
                  status="completed"
                  title="Reset the kitchen before bed"
                  capturedEvidence={capturedTwo}
                  {...handlers}
                />
              </View>
            </View>
          </ScopedTheme>
        </View>
      ))}
    </ScrollView>
  ),
};

// Roughly what the real screen leaves the card between the progress strip and the
// tab bar on a 6.1" phone.
const CARD_AREA_HEIGHT = 520;

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
    height: CARD_AREA_HEIGHT,
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
    height: CARD_AREA_HEIGHT,
    padding: theme.space[5],
  },
  // Like matrixCard but stacks several state variants of the card in one column,
  // each in its own bounded `stateSlot` since every card pins its own footer.
  matrixCardStack: {
    width: 344,
    padding: theme.space[5],
    gap: theme.space[4],
  },
  // Shorter than a full card area so three fit in one reviewable column.
  stateSlot: {
    height: 300,
  },
}));
