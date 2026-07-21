import React, { useEffect, useState } from "react";
import { View } from "react-native";
import type { Meta, StoryObj } from "@storybook/react";

import { createDefaultBadgeDesign } from "../../badges/types";
import {
  FinishBakingStage,
  type FinishBakingStatus,
} from "./FinishBakingStage";

const badgeDesign = createDefaultBadgeDesign("Rewire the workshop");

const meta: Meta<typeof FinishBakingStage> = {
  title: "Iteration B/Finish/FinishBakingStage",
  component: FinishBakingStage,
};
export default meta;

type Story = StoryObj<typeof FinishBakingStage>;

const Frame = ({ children }: { children: React.ReactNode }) => (
  <View style={{ flex: 1, height: 640 }}>{children}</View>
);

/** In-flight busy interstitial — dimmed badge, spinner, mono label. */
export const Default: Story = {
  render: () => (
    <Frame>
      <FinishBakingStage badgeDesign={badgeDesign} />
    </Frame>
  ),
};

/** Distinct success sub-state — full-opacity badge, no spinner (D6). */
export const Success: Story = {
  render: () => (
    <Frame>
      <FinishBakingStage badgeDesign={badgeDesign} status="success" />
    </Frame>
  ),
};

/** No-key permanent failure with the escape affordance (D4). */
export const NoKey: Story = {
  render: () => (
    <Frame>
      <FinishBakingStage
        badgeDesign={badgeDesign}
        status="no-key"
        onExitWithoutBadge={() => {}}
      />
    </Frame>
  ),
};

const RETRY_TO_SUCCESS_MS = 900;

/**
 * Terminal error with a working Retry that visibly loops
 * error → busy → success in isolation — mirrors FinishCelebrateStage's
 * local-state story pattern so the recovery path is clickable without the
 * full flow harness.
 */
function ErrorStateDemo() {
  const [status, setStatus] = useState<FinishBakingStatus>("error");

  useEffect(() => {
    if (status !== "baking") return;
    const timer = setTimeout(() => setStatus("success"), RETRY_TO_SUCCESS_MS);
    return () => clearTimeout(timer);
  }, [status]);

  return (
    <Frame>
      <FinishBakingStage
        badgeDesign={badgeDesign}
        status={status}
        errorMessage="We couldn't finish baking your badge. Please try again."
        onRetry={() => setStatus("baking")}
      />
    </Frame>
  );
}

export const ErrorState: Story = {
  render: () => <ErrorStateDemo />,
};
