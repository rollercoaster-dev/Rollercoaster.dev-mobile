import React from "react";
import { View } from "react-native";
import type { Meta, StoryObj } from "@storybook/react";

import { createDefaultBadgeDesign } from "../../badges/types";
import { FinishRevealStage } from "./FinishRevealStage";

const badgeDesign = createDefaultBadgeDesign("Rewire the workshop");

const meta: Meta<typeof FinishRevealStage> = {
  title: "Iteration B/Finish/FinishRevealStage",
  component: FinishRevealStage,
};
export default meta;

type Story = StoryObj<typeof FinishRevealStage>;

export const Default: Story = {
  render: () => (
    <View style={{ flex: 1, height: 640 }}>
      <FinishRevealStage
        badgeDesign={badgeDesign}
        goalTitle="Rewire the workshop"
        earnedDateLabel="Jun 23, 2026"
        animationPref="full"
        onViewBadge={() => {}}
        onBackToGoals={() => {}}
      />
    </View>
  ),
};

export const ReducedMotion: Story = {
  render: () => (
    <View style={{ flex: 1, height: 640 }}>
      <FinishRevealStage
        badgeDesign={badgeDesign}
        goalTitle="Rewire the workshop"
        earnedDateLabel="Jun 23, 2026"
        animationPref="none"
        onViewBadge={() => {}}
        onBackToGoals={() => {}}
      />
    </View>
  ),
};
