import type { Meta, StoryObj } from "@storybook/react";
import React from "react";
import { ProofSpine } from "./ProofSpine";

// #380 wires this to navigation.navigate("EvidenceViewer", { goalId,
// initialEvidenceId: id }) once ProofSpine is imported into BadgeDetailScreen.
// Until then it is a logging no-op so the Storybook action is observable.
const logCardPress = (id: string) => console.log("ProofCard pressed", id);

const meta: Meta<typeof ProofSpine> = {
  title: "Iteration B/Badge Detail/ProofSpine",
  component: ProofSpine,
};

export default meta;

type Story = StoryObj<typeof ProofSpine>;

export const FullProof: Story = {
  render: () => (
    <ProofSpine
      evidence={[
        { id: "1", name: "Lab notebook page", type: "photo" },
        { id: "2", name: "Demo walkthrough", type: "video" },
        { id: "3", name: "Reflection note", type: "text" },
        { id: "4", name: "Reference paper", type: "link" },
      ]}
      onCardPress={logCardPress}
    />
  ),
};

export const SingleItem: Story = {
  render: () => (
    <ProofSpine
      evidence={[{ id: "1", name: "Lab notebook page", type: "photo" }]}
      onCardPress={logCardPress}
    />
  ),
};

export const UnknownType: Story = {
  render: () => (
    <ProofSpine
      evidence={[
        { id: "1", name: "Lab notebook page", type: "photo" },
        { id: "2", name: "Legacy attachment", type: null },
        { id: "3", name: "Voice reflection", type: "voice_memo" },
      ]}
      onCardPress={logCardPress}
    />
  ),
};

export const Empty: Story = {
  render: () => <ProofSpine evidence={[]} onCardPress={logCardPress} />,
};
