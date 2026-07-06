import type { Meta, StoryObj } from "@storybook/react";
import React, { useState } from "react";
import { useWindowDimensions, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import { NewGoalWizard } from "./NewGoalWizard";

const meta: Meta<typeof NewGoalWizard> = {
  title: "Iteration B/Goals/NewGoalWizard",
  component: NewGoalWizard,
};

export default meta;

type Story = StoryObj<typeof NewGoalWizard>;

const noop = () => undefined;

/**
 * Phone-sized stage. The wizard is a full-screen modal: its root is a
 * full-height flex column that centers the step body and pins the footer to
 * the bottom (matching the App Shell prototype's `newgoal` frame). That only
 * resolves against a *bounded* height — in-app the containing modal supplies
 * it, but Storybook's global decorator renders every story inside a
 * content-hugging ScrollView, so without a bounded stage `container:{flex:1}`
 * collapses to content height and the whole screen jams against the top.
 *
 * We size the stage to the *visible* canvas rather than a fixed device height:
 * the decorator pads its ScrollView by space[4] (top) + space[16] (bottom), so
 * we subtract exactly that (reading the same tokens, so it can't drift). The
 * frame then fills the canvas with no scroll — a modal screen never scrolls its
 * own frame — and no collapse.
 */
function PhoneStage({ children }: { children: React.ReactNode }) {
  const { height } = useWindowDimensions();
  const { theme } = useUnistyles();
  const stageHeight = Math.max(0, height - theme.space[4] - theme.space[16]);
  return (
    <View style={[storyStyles.stage, { height: stageHeight }]}>{children}</View>
  );
}

const storyStyles = StyleSheet.create(() => ({
  stage: {
    width: "100%",
    maxWidth: 390,
    alignSelf: "center" as const,
  },
}));

/**
 * Stateful wrapper: the wizard is prop-driven, so the story owns the goal
 * title. Seeded empty so the disabled "Next →" state is visible by default —
 * typing into the input enables it. The quick-add link below is the distinct
 * onQuickAdd fast path (never conflated with onNext).
 */
function InteractiveNameStep() {
  const [goalTitle, setGoalTitle] = useState("");
  return (
    <PhoneStage>
      <NewGoalWizard
        currentStep="name"
        goalTitle={goalTitle}
        onGoalTitleChange={setGoalTitle}
        stepCount={0}
        onBack={noop}
        onClose={noop}
        onNext={noop}
        onQuickAdd={noop}
        onStartWorking={noop}
      />
    </PhoneStage>
  );
}

export const NameStep: Story = {
  render: () => <InteractiveNameStep />,
};

// Sample data matches the prototype's own seed ("Build a birdhouse", 2 steps).
export const ReadyStep: Story = {
  render: () => (
    <PhoneStage>
      <NewGoalWizard
        currentStep="ready"
        goalTitle="Build a birdhouse"
        onGoalTitleChange={noop}
        stepCount={2}
        onBack={noop}
        onClose={noop}
        onNext={noop}
        onQuickAdd={noop}
        onStartWorking={noop}
      />
    </PhoneStage>
  ),
};
