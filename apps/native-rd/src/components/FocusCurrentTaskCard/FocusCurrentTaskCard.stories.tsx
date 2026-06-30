import type { Meta, StoryObj } from "@storybook/react";
import React from "react";
import { ScrollView, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import { Text } from "../Text";
import { FocusCurrentTaskCard } from "./FocusCurrentTaskCard";
import type { FocusCapturedEvidenceItem } from "./FocusCurrentTaskCard";
import {
  stepStateNodeBg,
  stepStateNodeFg,
  type StepStateMapKey,
} from "../TimelineNode/stepStateColorMap";
import {
  themes,
  themeNames,
  type ComposedTheme,
  type ThemeName,
} from "../../themes/compose";

const meta: Meta<typeof FocusCurrentTaskCard> = {
  title: "FocusCurrentTaskCard",
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

export const InProgress: Story = {
  render: () => (
    <View style={storyStyles.container}>
      <FocusCurrentTaskCard
        status="in-progress"
        title="Reset the kitchen before bed"
        plannedEvidenceType="Photo"
        capturedEvidence={capturedTwo}
        {...handlers}
      />
    </View>
  ),
};

// No captured evidence → "✓ Mark complete" is absent (revealed by evidence, never
// shown disabled). The pause + add-type CTAs still stand.
export const InProgressNoEvidence: Story = {
  render: () => (
    <View style={storyStyles.container}>
      <FocusCurrentTaskCard
        status="in-progress"
        title="Reset the kitchen before bed"
        plannedEvidenceType="Photo"
        {...handlers}
      />
    </View>
  ),
};

// C·B band populated: a single C line ("after …") plus a B line ("due …", mono).
// waitingOn is omitted so the C slot reads as one line (waitingOn would win).
export const InProgressWithECBBand: Story = {
  render: () => (
    <View style={storyStyles.container}>
      <FocusCurrentTaskCard
        status="in-progress"
        title="Draft the recovery-week meal plan"
        plannedEvidenceType="Note"
        capturedEvidence={capturedTwo}
        afterStep="Stock the pantry"
        dueDate="Fri 11 Jul"
        {...handlers}
      />
    </View>
  ),
};

export const Paused: Story = {
  render: () => (
    <View style={storyStyles.container}>
      <FocusCurrentTaskCard
        status="paused"
        title="Call the clinic to book a check-in"
        {...handlers}
      />
    </View>
  ),
};

export const Completed: Story = {
  render: () => (
    <View style={storyStyles.container}>
      <FocusCurrentTaskCard
        status="completed"
        title="Reset the kitchen before bed"
        capturedEvidence={capturedTwo}
        {...handlers}
      />
    </View>
  ),
};

export const AllComplete: Story = {
  render: () => (
    <View style={storyStyles.container}>
      <FocusCurrentTaskCard status="all-complete" title="" {...handlers} />
    </View>
  ),
};

// State-pill color language across all 7 product themes (#406). Unistyles' theme
// is a global runtime singleton, so the reactive card can only render the active
// theme. Like TimelineNode.stories' AllThemesMatrix, this reads each composed
// `themes[name]` statically and paints pill-shaped swatches inline, resolving
// bg/fg THROUGH stepStateNodeBg/stepStateNodeFg — the same source the card and
// the node use. Compare these cells against the TimelineNode matrix: same colors.
const MATRIX_STATES: StepStateMapKey[] = [
  "pending",
  "in-progress",
  "paused",
  "completed",
];

const STATE_LABELS: Record<StepStateMapKey, string> = {
  pending: "Pending",
  "in-progress": "In Progress",
  paused: "Paused",
  completed: "Completed",
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

function MatrixPill({
  theme,
  state,
}: {
  theme: ComposedTheme;
  state: StepStateMapKey;
}) {
  const bg = stepStateNodeBg(theme, state);
  const fg = stepStateNodeFg(theme, state);
  // Mirror the pill border rule: in-progress/completed are solid (border == bg);
  // pending/paused keep a neutral border so the light fill stays visible.
  const solid = state === "in-progress" || state === "completed";
  const borderColor = solid ? bg : theme.colors.border;
  return (
    <View style={storyStyles.matrixCell}>
      <View
        style={[storyStyles.matrixPill, { backgroundColor: bg, borderColor }]}
      >
        <Text style={[storyStyles.matrixPillText, { color: fg }]}>
          {STATE_LABELS[state]}
        </Text>
      </View>
    </View>
  );
}

export const AllThemesMatrix: Story = {
  render: () => (
    <ScrollView contentContainerStyle={storyStyles.matrixContainer}>
      <ScrollView horizontal showsHorizontalScrollIndicator>
        <View>
          <View style={storyStyles.matrixRow}>
            <View style={storyStyles.matrixRowLabel}>
              <Text variant="label" style={storyStyles.matrixHeaderText}>
                Theme
              </Text>
            </View>
            {MATRIX_STATES.map((state) => (
              <View key={state} style={storyStyles.matrixCell}>
                <Text variant="label" style={storyStyles.matrixHeaderText}>
                  {STATE_LABELS[state]}
                </Text>
              </View>
            ))}
          </View>
          {themeNames.map((name) => (
            <View key={name} style={storyStyles.matrixRow}>
              <View style={storyStyles.matrixRowLabel}>
                <Text style={storyStyles.matrixThemeName}>
                  {MOOD_NAMES[name]}
                </Text>
                <Text style={storyStyles.matrixThemeKey}>{name}</Text>
              </View>
              {MATRIX_STATES.map((state) => (
                <MatrixPill key={state} theme={themes[name]} state={state} />
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
    </ScrollView>
  ),
};

const storyStyles = StyleSheet.create((theme) => ({
  container: {
    padding: theme.space[4],
    backgroundColor: theme.colors.background,
  },
  matrixContainer: {
    padding: theme.space[4],
    backgroundColor: theme.colors.background,
  },
  matrixRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  matrixRowLabel: {
    width: 132,
    paddingVertical: theme.space[2],
    paddingRight: theme.space[2],
    justifyContent: "center",
  },
  matrixHeaderText: {
    color: theme.colors.textMuted,
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
  matrixCell: {
    width: 120,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: theme.space[2],
    paddingHorizontal: theme.space[1],
  },
  matrixPill: {
    paddingHorizontal: theme.space[2],
    paddingVertical: theme.space[1],
    borderRadius: theme.radius.sm,
    borderWidth: theme.borderWidth.thin,
  },
  matrixPillText: {
    fontSize: theme.size.xs,
    fontWeight: theme.fontWeight.semibold,
  },
}));
