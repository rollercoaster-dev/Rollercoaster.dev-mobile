import type { Meta, StoryObj } from "@storybook/react";
import React from "react";
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
  title: "Screens/GoalsCockpit",
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
