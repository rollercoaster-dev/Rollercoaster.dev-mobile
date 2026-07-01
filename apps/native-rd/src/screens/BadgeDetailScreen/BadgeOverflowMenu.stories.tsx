import type { Meta, StoryObj } from "@storybook/react";
import { View } from "react-native";
import { BadgeOverflowMenu } from "./BadgeOverflowMenu";

const noop = () => {};

const meta: Meta<typeof BadgeOverflowMenu> = {
  title: "Screens/BadgeDetail/BadgeOverflowMenu",
  component: BadgeOverflowMenu,
  // Content-only component: pad so the popover card + its hard shadow are fully
  // visible in the Storybook canvas (positioning is #380's concern).
  decorators: [
    (Story) => (
      <View style={{ padding: 24, alignItems: "flex-start" }}>
        <Story />
      </View>
    ),
  ],
  args: {
    hasCredential: true,
    onShareBadge: noop,
    onExportCredential: noop,
    onDelete: noop,
  },
};

export default meta;

type Story = StoryObj<typeof BadgeOverflowMenu>;

// All three rows enabled; Delete rendered in its destructive tone.
export const Default: Story = {
  args: { hasCredential: true },
};

// Export credential row disabled when there's no credential to export.
export const NoCredential: Story = {
  args: { hasCredential: false },
};
