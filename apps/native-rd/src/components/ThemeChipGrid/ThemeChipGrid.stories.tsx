import type { Meta, StoryObj } from "@storybook/react";
import React from "react";
import { ThemeChipGrid } from "./ThemeChipGrid";

const meta: Meta<typeof ThemeChipGrid> = {
  title: "ThemeChipGrid",
  component: ThemeChipGrid,
};

export default meta;

type Story = StoryObj<typeof ThemeChipGrid>;

export const Default: Story = {
  render: () => <ThemeChipGrid />,
};
