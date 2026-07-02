import type { Meta, StoryObj } from "@storybook/react";
import React, { useState } from "react";
import type { ThemeName } from "../../themes/compose";
import { ThemeSwatchRail } from "./ThemeSwatchRail";

const meta: Meta<typeof ThemeSwatchRail> = {
  title: "Iteration B/Theme & Settings/ThemeSwatchRail",
  component: ThemeSwatchRail,
};

export default meta;

type Story = StoryObj<typeof ThemeSwatchRail>;

// The rail is controlled (D4) — Welcome/Settings own the state. This wrapper
// supplies that state in Storybook so swatches respond to taps in the gate.
function InteractiveRail({ initial }: { initial: ThemeName }) {
  const [selected, setSelected] = useState<ThemeName>(initial);
  return <ThemeSwatchRail selectedThemeId={selected} onSelect={setSelected} />;
}

export const Default: Story = {
  render: () => <InteractiveRail initial="light-default" />,
};

export const NightRideSelected: Story = {
  render: () => (
    <ThemeSwatchRail selectedThemeId="dark-default" onSelect={() => {}} />
  ),
};
