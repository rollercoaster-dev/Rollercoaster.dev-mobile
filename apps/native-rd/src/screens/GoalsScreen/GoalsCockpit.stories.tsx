import type { Meta, StoryObj } from "@storybook/react";
import {
  GoalsCockpit,
  type CockpitHeroGoal,
  type CockpitKeepWarmGoal,
} from "./GoalsCockpit";

const hero: CockpitHeroGoal = {
  id: "hero",
  title: "Learn React Native Navigation",
  nextStepTitle: "Set up the bottom tab navigator",
  progress: 0.5,
  stepsCompleted: 3,
  stepsTotal: 6,
};

const keepWarm: CockpitKeepWarmGoal[] = [
  {
    id: "kw-1",
    title: "Build a Storybook component library",
    nextStepTitle: "Document GoalCard variants",
    progress: 0.75,
  },
  {
    id: "kw-2",
    title: "Understand Evolu local-first sync",
    nextStepTitle: "Read the mutation API docs",
    progress: 0.2,
  },
];

const noop = () => {};

const meta: Meta<typeof GoalsCockpit> = {
  title: "Iteration B/Goals/GoalsCockpit",
  component: GoalsCockpit,
  args: {
    onStartResume: noop,
    onOpenGoal: noop,
    onNewGoal: noop,
    onDeleteGoal: noop,
  },
};

export default meta;

type Story = StoryObj<typeof GoalsCockpit>;

export const Populated: Story = {
  args: { hero, keepWarm },
};

// Five keep-warm goals exercise the two-up wrap: cards cap at two per row and
// wrap to a new line, never compressing a third onto the same row.
export const ManyKeepWarm: Story = {
  args: {
    hero,
    keepWarm: [
      ...keepWarm,
      {
        id: "kw-3",
        title: "Ship the offline-first prototype",
        nextStepTitle: "Wire up the sync queue",
        progress: 0.4,
      },
      {
        id: "kw-4",
        title: "Write the accessibility audit",
        nextStepTitle: "Run the contrast checker",
        progress: 0.6,
      },
      {
        id: "kw-5",
        title: "Draft the launch checklist",
        nextStepTitle: null,
        progress: 0.1,
      },
    ],
  },
};

export const HeroOnly: Story = {
  args: { hero, keepWarm: [] },
};

export const ResumeState: Story = {
  args: {
    hero: { ...hero, stepsCompleted: 5, progress: 5 / 6 },
    keepWarm,
  },
};

export const StartState: Story = {
  args: {
    hero: {
      ...hero,
      nextStepTitle: "Break the goal into steps",
      stepsCompleted: 0,
      stepsTotal: 0,
      progress: 0,
    },
    keepWarm: [],
  },
};

export const Empty: Story = {
  args: { hero: null, keepWarm: [] },
};
