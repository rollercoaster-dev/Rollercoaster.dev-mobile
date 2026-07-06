import React from "react";
import { View } from "react-native";
import type { Meta, StoryObj } from "@storybook/react";

import { createDefaultBadgeDesign } from "../../badges/types";
import { FinishBakingStage } from "./FinishBakingStage";

const badgeDesign = createDefaultBadgeDesign("Rewire the workshop");

const meta: Meta<typeof FinishBakingStage> = {
  title: "Iteration B/Finish/FinishBakingStage",
  component: FinishBakingStage,
};
export default meta;

type Story = StoryObj<typeof FinishBakingStage>;

export const Default: Story = {
  render: () => (
    <View style={{ flex: 1, height: 640 }}>
      <FinishBakingStage badgeDesign={badgeDesign} />
    </View>
  ),
};
