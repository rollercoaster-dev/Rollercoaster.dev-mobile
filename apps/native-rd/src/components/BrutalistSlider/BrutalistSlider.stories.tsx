import type { Meta, StoryObj } from "@storybook/react";
import { BrutalistSlider } from "./BrutalistSlider";

const meta: Meta<typeof BrutalistSlider> = {
  title: "BrutalistSlider",
  component: BrutalistSlider,
  args: {
    value: 0.6,
    minimumValue: 0.2,
    maximumValue: 1,
    step: 0.1,
    accessibilityLabel: "Fill opacity",
    onValueChange: () => {},
  },
  argTypes: {
    value: { control: { type: "range", min: 0.2, max: 1, step: 0.1 } },
    minimumValue: { control: "number" },
    maximumValue: { control: "number" },
    step: { control: "number" },
  },
};

export default meta;
type Story = StoryObj<typeof BrutalistSlider>;
export const Interactive: Story = {};
