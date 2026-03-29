import type { Meta, StoryObj } from "@storybook/react";
import React from "react";
import { View } from "react-native";
import { FABMenu } from "./FABMenu";

const meta: Meta<typeof FABMenu> = {
  title: "FABMenu",
  component: FABMenu,
};

export default meta;

type Story = StoryObj<typeof FABMenu>;

export const Open: Story = {
  render: () => (
    <View style={{ height: 400, justifyContent: "flex-end" }}>
      <FABMenu isOpen onSelectType={() => {}} />
    </View>
  ),
};

export const Closed: Story = {
  render: () => <FABMenu isOpen={false} onSelectType={() => {}} />,
};
