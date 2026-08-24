import type { Meta, StoryObj } from "@storybook/react";
import React from "react";
import { ScrollView, View } from "react-native";
import { ScopedTheme, StyleSheet } from "react-native-unistyles";
import { EvidenceType } from "../../db";
import { Text } from "../Text";
import { themes, themeNames, type ThemeName } from "../../themes/compose";
import { EditGoalStepRow } from "./EditGoalStepRow";
import { EditGoalSubStepRow } from "./EditGoalSubStepRow";
import type { EditGoalStep, EditGoalSubStep } from "./EditGoalView";

/**
 * The row's one pressable timing line (#575), in every state it has: set,
 * unset, completed-with-nothing (renders nothing at all), and inert (no
 * `onEditTiming` — the pre-#575 read-only path).
 *
 * No editor opens on tap here by design: `onEditTiming` is a signal, and #576
 * wires it to StepTimingEditor. `PressureComparison` is the story that matters
 * for the epic's own rule — a fully unset list must not read as "less" than a
 * fully set one.
 */
const meta: Meta<typeof EditGoalStepRow> = {
  title: "Set B & C/EditGoalStepRow",
  component: EditGoalStepRow,
};

export default meta;

type Story = StoryObj<typeof EditGoalStepRow>;

const noop = () => {};

/** Every prop the row needs that this issue is not about. */
const rowScaffold = {
  isBeingDragged: false,
  isEditing: false,
  editText: "",
  onEditTextChange: noop,
  onStartEditing: noop,
  onCommitEditing: noop,
  onEvidenceChipPress: noop,
  onDragStart: noop,
  onDragMove: noop,
  onDragEnd: noop,
  registerRowLayout: noop,
  registerRemeasure: noop,
  showAccessibleControls: false,
  animationPref: "full" as const,
  isFirst: true,
  isLast: true,
  // Static rows: the drag path needs the coordinator, which this story has no
  // business standing up.
  canDrag: false,
  onDelete: noop,
};

function Frame({ children }: { children: React.ReactNode }) {
  return <View style={storyStyles.frame}>{children}</View>;
}

function Caption({ children }: { children: React.ReactNode }) {
  return <Text style={storyStyles.caption}>{children}</Text>;
}

const step = (
  id: string,
  title: string,
  extra: Partial<EditGoalStep> = {},
): EditGoalStep => ({
  id,
  title,
  plannedEvidenceTypes: [EvidenceType.photo],
  ...extra,
});

const subStep = (
  id: string,
  title: string,
  extra: Partial<EditGoalSubStep> = {},
): EditGoalSubStep => ({
  id,
  title,
  plannedEvidenceTypes: [EvidenceType.text],
  ...extra,
});

/** Nothing set — one quiet prompt, not two dashed placeholder chips. */
export const Unset: Story = {
  render: () => (
    <Frame>
      <EditGoalStepRow
        {...rowScaffold}
        step={step("s1", "Wire the circuits")}
        stepNumber={1}
        onEditTiming={noop}
      />
    </Frame>
  ),
};

export const DateOnly: Story = {
  render: () => (
    <Frame>
      <EditGoalStepRow
        {...rowScaffold}
        step={step("s1", "Inspection & labels", {
          dateDepChips: [{ tone: "due", text: "due Tue 30 Jun" }],
        })}
        stepNumber={2}
        onEditTiming={noop}
      />
    </Frame>
  ),
};

export const DependencyOnly: Story = {
  render: () => (
    <Frame>
      <EditGoalStepRow
        {...rowScaffold}
        step={step("s1", "Fix any call-outs", {
          dateDepChips: [{ tone: "after", text: "after Inspection & labels" }],
        })}
        stepNumber={3}
        onEditTiming={noop}
      />
    </Frame>
  ),
};

/** Both lines, stacked — the same read-out StepTimingEditor renders (D1). */
export const Both: Story = {
  render: () => (
    <Frame>
      <EditGoalStepRow
        {...rowScaffold}
        step={step("s1", "Walk the inspector through", {
          dateDepChips: [
            { tone: "after", text: "after Inspection & labels" },
            { tone: "due", text: "due Fri 26 Jun" },
          ],
        })}
        stepNumber={4}
        onEditTiming={noop}
      />
    </Frame>
  ),
};

/**
 * A "waiting on" line — display-only here. The editor never authors one (that
 * belongs in Focus), but the row still shows what the resolver reports.
 */
export const WaitingOn: Story = {
  render: () => (
    <Frame>
      <EditGoalStepRow
        {...rowScaffold}
        step={step("s1", "Sign-off from the landlord", {
          dateDepChips: [{ tone: "waiting", text: "waiting on Alex" }],
        })}
        stepNumber={5}
        onEditTiming={noop}
      />
    </Frame>
  ),
};

/** Completed with nothing set: no line, no prompt, no empty slot. */
export const CompletedNothingSet: Story = {
  render: () => (
    <Frame>
      <EditGoalStepRow
        {...rowScaffold}
        step={step("s1", "Plan layout & buy materials", { isCompleted: true })}
        stepNumber={1}
        onEditTiming={noop}
      />
      <Caption>
        No timing line at all — nothing is left to plan on a finished step, so
        it carries no placeholder.
      </Caption>
    </Frame>
  ),
};

/** Completed but dated: timing survives completion; only the prompt is gone. */
export const CompletedWithDate: Story = {
  render: () => (
    <Frame>
      <EditGoalStepRow
        {...rowScaffold}
        step={step("s1", "Book the inspection", {
          isCompleted: true,
          dateDepChips: [{ tone: "due", text: "due Wed 24 Jun" }],
        })}
        stepNumber={2}
        onEditTiming={noop}
      />
    </Frame>
  ),
};

/** The same three states on a sub-step row — sub-steps time like steps (D4). */
export const SubStep: Story = {
  render: () => (
    <Frame>
      <EditGoalSubStepRow
        {...rowScaffold}
        subStep={subStep("a", "Book the inspection", {
          dateDepChips: [{ tone: "due", text: "due Wed 24 Jun" }],
        })}
        onEditTiming={noop}
      />
      <EditGoalSubStepRow
        {...rowScaffold}
        subStep={subStep("b", "Walk the inspector through")}
        onEditTiming={noop}
      />
      <EditGoalSubStepRow
        {...rowScaffold}
        subStep={subStep("c", "Fix any call-outs", { isCompleted: true })}
        onEditTiming={noop}
      />
      <Caption>
        Set · unset · completed-with-nothing (the third row shows no timing
        line).
      </Caption>
    </Frame>
  ),
};

/** `onEditTiming` omitted: chips render, nothing is pressable, no prompt. */
export const Inert: Story = {
  render: () => (
    <Frame>
      <EditGoalStepRow
        {...rowScaffold}
        step={step("s1", "Review with mentor", {
          dateDepChips: [
            { tone: "after", text: "after Draft the outline" },
            { tone: "due", text: "due Fri 26 Jun" },
          ],
        })}
        stepNumber={1}
      />
      <EditGoalStepRow
        {...rowScaffold}
        step={step("s2", "Wire the circuits")}
        stepNumber={2}
      />
      <Caption>
        Read-only path (no `onEditTiming`): the set row keeps its lines, the
        unset row shows nothing — no ghost prompt appears where nothing can be
        edited.
      </Caption>
    </Frame>
  ),
};

const PRESSURE_TITLES = [
  "Plan layout & buy materials",
  "Wire the circuits",
  "Inspection & labels",
  "Final walkthrough",
];

/**
 * The epic's own pressure test: an all-set list beside an all-unset list of the
 * same length. Each row reserves the same 44pt timing band either way, so the
 * unset column never reads as unfinished — just as unplanned.
 */
export const PressureComparison: Story = {
  render: () => (
    <View style={storyStyles.comparison}>
      <View style={storyStyles.column}>
        <Caption>All set</Caption>
        {PRESSURE_TITLES.map((title, i) => (
          <EditGoalStepRow
            key={title}
            {...rowScaffold}
            step={step(`set-${i}`, title, {
              dateDepChips: [{ tone: "due", text: "due Fri 26 Jun" }],
            })}
            stepNumber={i + 1}
            onEditTiming={noop}
          />
        ))}
      </View>
      <View style={storyStyles.column}>
        <Caption>All unset</Caption>
        {PRESSURE_TITLES.map((title, i) => (
          <EditGoalStepRow
            key={title}
            {...rowScaffold}
            step={step(`unset-${i}`, title)}
            stepNumber={i + 1}
            onEditTiming={noop}
          />
        ))}
      </View>
    </View>
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
 * All 7 product themes, each showing every tone the row's timing line can
 * carry: an `after`+`due` row, a `waiting` row, and an unset row.
 *
 * The set/unset pair has to stay distinguishable in `highContrast` (neither
 * state uses a shadow, so the ink itself must differ) and legible in
 * `lowVision`, which also doubles as the `largeText` density check. The
 * `waiting` row is the #577 addition: `after` is painted `colors.success` and
 * `waiting` `colors.warning`, and those two are separated by hue rather than
 * lightness (see `themes/__tests__/contrast.test.ts`) — so a variant that
 * desaturates both toward the same gray, which `autismFriendly` comes closest
 * to doing, is only visible with the two rendered side by side.
 *
 * A live `ScopedTheme` matrix works here (unlike EditGoalView's) because the
 * bare row never re-renders after mount — it holds no state and runs no async
 * accessibility probes.
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
              <EditGoalStepRow
                {...rowScaffold}
                step={step(`${name}-set`, "Inspection & labels", {
                  dateDepChips: [
                    { tone: "after", text: "after Wire the circuits" },
                    { tone: "due", text: "due Tue 30 Jun" },
                  ],
                })}
                stepNumber={1}
                onEditTiming={noop}
              />
              <EditGoalStepRow
                {...rowScaffold}
                step={step(`${name}-waiting`, "Sign-off", {
                  dateDepChips: [
                    {
                      tone: "waiting",
                      text: "waiting on city inspector · expected Jun 24",
                    },
                  ],
                })}
                stepNumber={2}
                onEditTiming={noop}
              />
              <EditGoalStepRow
                {...rowScaffold}
                step={step(`${name}-unset`, "Final walkthrough")}
                stepNumber={3}
                onEditTiming={noop}
              />
            </View>
          </ScopedTheme>
        </View>
      ))}
    </ScrollView>
  ),
};

const storyStyles = StyleSheet.create((theme) => ({
  frame: {
    width: 344,
    gap: theme.space[2],
    padding: theme.space[4],
    alignSelf: "center" as const,
    backgroundColor: theme.colors.background,
  },
  caption: {
    fontSize: theme.size.xs,
    fontStyle: "italic" as const,
    color: theme.colors.textMuted,
  },
  comparison: {
    flexDirection: "row" as const,
    gap: theme.space[4],
    padding: theme.space[4],
    backgroundColor: theme.colors.backgroundSecondary,
  },
  column: {
    flex: 1,
    gap: theme.space[2],
  },
  matrixContainer: {
    gap: theme.space[5],
    padding: theme.space[4],
  },
  matrixThemeBlock: {
    gap: theme.space[2],
  },
  matrixThemeLabel: {
    flexDirection: "row" as const,
    alignItems: "baseline" as const,
    gap: theme.space[2],
  },
  matrixThemeName: {
    fontSize: theme.size.sm,
    fontWeight: "700" as const,
  },
  matrixThemeKey: {
    fontSize: theme.size.xs,
    color: theme.colors.textMuted,
  },
  matrixCard: {
    gap: theme.space[2],
    padding: theme.space[3],
    borderWidth: theme.borderWidth.thick,
    borderColor: theme.colors.border,
  },
}));
