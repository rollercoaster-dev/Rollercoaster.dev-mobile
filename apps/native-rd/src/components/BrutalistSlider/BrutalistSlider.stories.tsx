import type { Meta, StoryObj } from "@storybook/react";
import { useEffect, useState } from "react";
import { BrutalistSlider, type BrutalistSliderProps } from "./BrutalistSlider";

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

// Render component owns state so dragging actually moves the thumb. The
// args panel can still drive `value` — useEffect re-syncs when args change.
function InteractiveStory(args: BrutalistSliderProps) {
  const [value, setValue] = useState(args.value);
  useEffect(() => {
    setValue(args.value);
  }, [args.value]);
  return (
    <BrutalistSlider
      {...args}
      value={value}
      onValueChange={(next) => {
        setValue(next);
        args.onValueChange?.(next);
      }}
    />
  );
}

export const Interactive: Story = {
  render: (args) => <InteractiveStory {...args} />,
};
