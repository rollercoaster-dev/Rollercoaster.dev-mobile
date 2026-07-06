import React, { useState } from "react";
import { View } from "react-native";
import type { Meta, StoryObj } from "@storybook/react";

import { FinishCelebrateStage } from "./FinishCelebrateStage";

const meta: Meta<typeof FinishCelebrateStage> = {
  title: "Iteration B/Finish/FinishCelebrateStage",
  component: FinishCelebrateStage,
};
export default meta;

type Story = StoryObj<typeof FinishCelebrateStage>;

const SUMMARY =
  "All 5 steps done for Rewire the workshop — with 3 pieces of evidence along the way.";

/** Wrapper holding the closing-note text in local state so typing round-trips
 * through `onClosingNoteChange`, mirroring how the integration will wire it. */
function InteractiveCelebrate({
  initialNoteOpen,
}: {
  initialNoteOpen?: boolean;
}) {
  const [note, setNote] = useState(
    initialNoteOpen ? "Felt lighter the moment I closed the last step." : "",
  );
  return (
    <View style={{ flex: 1, height: 640 }}>
      <FinishCelebrateStage
        summary={SUMMARY}
        closingNoteValue={note}
        onClosingNoteChange={setNote}
        initialNoteOpen={initialNoteOpen}
        onDesignBadge={() => {}}
      />
    </View>
  );
}

export const Default: Story = {
  render: () => <InteractiveCelebrate />,
};

export const ClosingNoteOpen: Story = {
  render: () => <InteractiveCelebrate initialNoteOpen />,
};
