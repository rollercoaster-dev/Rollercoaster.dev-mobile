import type { Meta, StoryObj } from "@storybook/react";
import React, { useState } from "react";
import { NewGoalWizard } from "./NewGoalWizard";

const meta: Meta<typeof NewGoalWizard> = {
  title: "Iteration B/Goals/NewGoalWizard",
  component: NewGoalWizard,
};

export default meta;

type Story = StoryObj<typeof NewGoalWizard>;

const noop = () => undefined;

/**
 * Stateful wrapper: the wizard is prop-driven, so the story owns the goal
 * title. Seeded empty so the disabled "Next →" state is visible by default —
 * typing into the input enables it. The quick-add link below is the distinct
 * onQuickAdd fast path (never conflated with onNext).
 */
function InteractiveNameStep() {
  const [goalTitle, setGoalTitle] = useState("");
  return (
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
  );
}

export const NameStep: Story = {
  render: () => <InteractiveNameStep />,
};

// Sample data matches the prototype's own seed ("Build a birdhouse", 2 steps).
export const ReadyStep: Story = {
  render: () => (
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
  ),
};
