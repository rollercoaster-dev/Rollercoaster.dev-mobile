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
  // The real card pill carries a neutral border in every state (prototype L4),
  // so the swatches do the same — these cells isolate the bg/fg color language.
  const borderColor = theme.colors.border;
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
