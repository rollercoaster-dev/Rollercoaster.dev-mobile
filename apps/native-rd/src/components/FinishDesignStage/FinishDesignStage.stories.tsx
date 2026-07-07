import React, { useState } from "react";
import { View } from "react-native";
import { ScopedTheme } from "react-native-unistyles";
import type { Meta, StoryObj } from "@storybook/react";

import {
  FinishDesignStage,
  type FinishDesignSection,
} from "./FinishDesignStage";
import { createDefaultBadgeDesign, type BadgeDesign } from "../../badges/types";

const meta: Meta<typeof FinishDesignStage> = {
  title: "Iteration B/Finish/FinishDesignStage",
  component: FinishDesignStage,
};
export default meta;

type Story = StoryObj<typeof FinishDesignStage>;

const GOAL_TITLE = "Rewire the workshop";
// Deliberately off-palette (not in ColorPicker's ACCENT_COLORS) so the extra
// "goal" swatch renders as a distinct entry — a palette hex would be de-duped
// away and the story wouldn't exercise the goal-swatch affordance.
const GOAL_COLOR = "#e11d48";

/** Wrapper holding the badge design in local state so every control
 * round-trips through `onDesignChange`, mirroring how the integration (#449)
 * will wire it and matching `FinishCelebrateStage`'s `InteractiveCelebrate`. */
function InteractiveDesign({
  initialExpandedSection = "shape",
  goalTitle = GOAL_TITLE,
  designOverrides,
}: {
  initialExpandedSection?: FinishDesignSection | null;
  goalTitle?: string;
  designOverrides?: Partial<BadgeDesign>;
}) {
  const [design, setDesign] = useState<BadgeDesign>(() => ({
    ...createDefaultBadgeDesign(goalTitle, GOAL_COLOR),
    ...designOverrides,
  }));
  return (
    <FinishDesignStage
      design={design}
      onDesignChange={setDesign}
      goalColor={GOAL_COLOR}
      goalTitle={goalTitle}
      onBack={() => {}}
      onBake={() => {}}
      initialExpandedSection={initialExpandedSection}
    />
  );
}

export const Default: Story = {
  render: () => <InteractiveDesign />,
};

export const ShapeOpen: Story = {
  render: () => <InteractiveDesign initialExpandedSection="shape" />,
};

export const ColorOpen: Story = {
  render: () => <InteractiveDesign initialExpandedSection="color" />,
};

export const CenterOpen: Story = {
  render: () => <InteractiveDesign initialExpandedSection="center" />,
};

export const BottomLabelOpen: Story = {
  render: () => <InteractiveDesign initialExpandedSection="bottomLabel" />,
};

/** Color section open with the trailing "Custom…" cell reachable — tapping it
 * opens the full-screen `ColorPickerModal`; a confirmed off-palette hex
 * re-renders the live preview through the same `onDesignChange` round-trip. */
export const CustomColor: Story = {
  render: () => <InteractiveDesign initialExpandedSection="color" />,
};

/** Longest allowed bottom label (24 chars) and a long goal title — confirms the
 * input and the live SVG preview both render without clipping. */
export const LongLabels: Story = {
  render: () => (
    <InteractiveDesign
      initialExpandedSection="bottomLabel"
      goalTitle="Rewire the entire workshop from scratch"
      designOverrides={{ bottomLabel: "COMPLETED · SEPTEMBER 26" }}
    />
  ),
};

/** Small-device viewport — the section list scrolls under the pinned preview
 * without clipping the footer CTA. Same technique as FinishCelebrateStage. */
export const Constrained: Story = {
  render: () => (
    <View style={{ flex: 1, height: 480 }}>
      <InteractiveDesign />
    </View>
  ),
};

/** Reduced-visual-complexity ND variant — every section/label/swatch stays
 * legible. */
export const ReducedDensity: Story = {
  render: () => (
    <ScopedTheme name="light-lowInfo">
      <InteractiveDesign />
    </ScopedTheme>
  ),
};
