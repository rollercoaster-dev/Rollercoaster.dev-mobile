import type { Meta, StoryObj } from "@storybook/react";
import React from "react";
import { ScrollView, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import { Text } from "../Text";
import { TimelineStep } from "./TimelineStep";
import type { TimelineStepData, TimelineStepChild } from "./TimelineStep";
import type { EvidenceItemData } from "../EvidenceDrawer";
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

const meta: Meta<typeof TimelineStep> = {
  title: "Iteration B/Timeline/TimelineStep",
  component: TimelineStep,
};

export default meta;

type Story = StoryObj<typeof TimelineStep>;

const noop = () => {};

const mockEvidence: EvidenceItemData[] = [
  { id: "1", type: "photo", label: "Lab notebook photo" },
  { id: "2", type: "link", label: "Reference paper" },
  { id: "3", type: "text", label: "Observation notes" },
];

const pendingStep: TimelineStepData = {
  id: "step-1",
  title: "Set up the experiment environment",
  status: "pending",
  evidenceCount: 0,
};

const activeStep: TimelineStepData = {
  id: "step-2",
  title: "Run the primary experiment and record results",
  status: "in-progress",
  evidenceCount: 2,
};

const completedStep: TimelineStepData = {
  id: "step-3",
  title: "Analyse and document findings",
  status: "completed",
  evidenceCount: 3,
};

// Header state word (E) across the three StepStatus values — pending / in-progress
// / completed. Each word pill takes its bg+fg from stepStateColorMap, so it reads
// as the same state color as its node (#406). No StatusBadge, no second language.
export const StateWords: Story = {
  render: () => (
    <View style={storyStyles.container}>
      <TimelineStep
        step={pendingStep}
        stepIndex={0}
        evidence={[]}
        onNodePress={noop}
        onEvidencePress={noop}
      />
      <TimelineStep
        step={activeStep}
        stepIndex={1}
        evidence={mockEvidence.slice(0, 2)}
        onNodePress={noop}
        onEvidencePress={noop}
      />
      <TimelineStep
        step={completedStep}
        stepIndex={2}
        evidence={mockEvidence}
        onNodePress={noop}
        onEvidencePress={noop}
      />
    </View>
  ),
};

// C + B: an external wait ("waiting on … · expected …") plus a factual due date.
// Both band lines sit beneath the header word, always visible, in textSecondary.
export const BandFull: Story = {
  render: () => (
    <View style={storyStyles.container}>
      <TimelineStep
        step={{
          id: "band-full",
          title: "Walk the inspector through",
          status: "in-progress",
          evidenceCount: 0,
          waitingOn: { who: "city inspector", expected: "Jun 24" },
          dueDate: "Thu · Jun 26",
        }}
        stepIndex={2}
        evidence={[]}
        onNodePress={noop}
        onEvidencePress={noop}
      />
    </View>
  ),
};

// C (internal dependency) shape: "after [step]" plus a due date. Never "blocked by".
export const BandAfter: Story = {
  render: () => (
    <View style={storyStyles.container}>
      <TimelineStep
        step={{
          id: "band-after",
          title: "Mount the panels",
          status: "pending",
          evidenceCount: 0,
          afterStep: "Inspection & labels",
          dueDate: "Mon · Jun 30",
        }}
        stepIndex={3}
        evidence={[]}
        onNodePress={noop}
        onEvidencePress={noop}
      />
    </View>
  ),
};

// No C/B props — only the header state word, no band rendered.
export const BandMinimal: Story = {
  render: () => (
    <View style={storyStyles.container}>
      <TimelineStep
        step={{
          id: "band-min",
          title: "Plan layout & buy materials",
          status: "completed",
          evidenceCount: 0,
        }}
        stepIndex={0}
        evidence={[]}
        onNodePress={noop}
        onEvidencePress={noop}
      />
    </View>
  ),
};

// Captured-evidence row via TimelineEvidenceCard at 0 / 1 / 3 chips (expanded).
export const EvidenceChips: Story = {
  render: () => (
    <View style={storyStyles.container}>
      <TimelineStep
        step={{
          id: "ev-0",
          title: "Zero evidence chips",
          status: "in-progress",
          evidenceCount: 0,
        }}
        stepIndex={0}
        evidence={[]}
        onNodePress={noop}
        onEvidencePress={noop}
        defaultExpanded
      />
      <TimelineStep
        step={{
          id: "ev-1",
          title: "One evidence chip",
          status: "in-progress",
          evidenceCount: 1,
        }}
        stepIndex={1}
        evidence={mockEvidence.slice(0, 1)}
        onNodePress={noop}
        onEvidencePress={noop}
        defaultExpanded
      />
      <TimelineStep
        step={{
          id: "ev-3",
          title: "Three evidence chips",
          status: "completed",
          evidenceCount: 3,
        }}
        stepIndex={2}
        evidence={mockEvidence}
        onNodePress={noop}
        onEvidencePress={noop}
        defaultExpanded
      />
    </View>
  ),
};

const subSteps: TimelineStepChild[] = [
  {
    id: "s3a",
    title: "Book the inspection",
    status: "completed",
    evidence: [{ id: "e1", type: "text", label: "Booking note" }],
  },
  {
    id: "s3b",
    title: "Walk the inspector through",
    status: "in-progress",
    evidence: [],
  },
  { id: "s3c", title: "Fix any call-outs", status: "pending", evidence: [] },
];

// Parent carries a C/B band; children show the state WORD only — no band, no
// evidence row (OQ-2). Each child sits at a different status.
export const WithSubsteps: Story = {
  render: () => (
    <View style={storyStyles.container}>
      <TimelineStep
        step={{
          id: "s3",
          title: "Inspection & labels",
          status: "in-progress",
          evidenceCount: 0,
          waitingOn: { who: "city inspector", expected: "Jun 24" },
          dueDate: "Thu · Jun 26",
        }}
        stepIndex={2}
        evidence={[]}
        onNodePress={noop}
        onEvidencePress={noop}
        subSteps={subSteps}
      />
    </View>
  ),
};

export const LongTitle: Story = {
  render: () => (
    <View style={storyStyles.container}>
      <TimelineStep
        step={{
          ...activeStep,
          title:
            "This is a very long step title that should wrap gracefully across multiple lines without breaking the layout",
          afterStep:
            "An earlier step with its own fairly long descriptive title",
          dueDate: "Fri · Jul 4",
        }}
        stepIndex={0}
        evidence={mockEvidence}
        onNodePress={noop}
        onEvidencePress={noop}
      />
    </View>
  ),
};

// All 4 states × 7 product themes (#406, #407). Unistyles' theme is a global
// runtime singleton, so a reactive <TimelineStep> can only render the active
// theme. Like TimelineNode/AllThemesMatrix, this reads each composed themes[name]
// statically and paints the header word pill inline, resolving bg/fg THROUGH
// stepStateColorMap. The reviewer confirms each word pill's color matches the
// TimelineNode/AllThemesMatrix node color for the same state in the same theme —
// if they differ, the word is not consuming the #406 token correctly.
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

function MatrixWord({
  theme,
  state,
}: {
  theme: ComposedTheme;
  state: StepStateMapKey;
}) {
  const bg = stepStateNodeBg(theme, state);
  const fg = stepStateNodeFg(theme, state);
  // Mirror stateWordPill / TimelineNode.styles: in-progress & completed are solid
  // (border == bg); pending & paused keep a neutral border so the light fill reads.
  const solid = state === "in-progress" || state === "completed";
  const borderColor = solid ? bg : theme.colors.border;
  return (
    <View style={storyStyles.matrixCell}>
      <View
        style={[
          storyStyles.matrixWordPill,
          { backgroundColor: bg, borderColor },
        ]}
      >
        <Text style={[storyStyles.matrixWordText, { color: fg }]}>
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
                <MatrixWord key={state} theme={themes[name]} state={state} />
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
    gap: theme.space[4],
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
  matrixWordPill: {
    paddingHorizontal: theme.space[2],
    paddingVertical: theme.space[1],
    borderRadius: theme.radius.sm,
    borderWidth: theme.borderWidth.thin,
  },
  matrixWordText: {
    fontSize: theme.size.xs,
    fontWeight: theme.fontWeight.semibold,
  },
}));
