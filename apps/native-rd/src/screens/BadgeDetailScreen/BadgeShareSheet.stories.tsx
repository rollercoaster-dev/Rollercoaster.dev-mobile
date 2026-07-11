import type { Meta, StoryObj } from "@storybook/react";
import React from "react";
import { View } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import { BadgeShareSheet } from "./BadgeShareSheet";

const noop = () => {};

const meta: Meta<typeof BadgeShareSheet> = {
  title: "Iteration B/Badge Detail/BadgeShareSheet",
  component: BadgeShareSheet,
  // The sheet is an in-tree absolute overlay that rises from the bottom of its
  // nearest sized ancestor (see AnimatedSheet). Storybook's content-hugging
  // canvas would otherwise collapse that overlay to the CTA's height and render
  // the open sheet out of frame at the top, so bound every story to a
  // phone-sized stage — mirrors EvidenceTypePicker's CaptureSheet stories.
  decorators: [
    (Story) => (
      <View style={storyStyles.stage}>
        <Story />
      </View>
    ),
  ],
  args: {
    goalTitle: "Rewire the workshop",
    isSheetOpen: true,
    canShareImage: true,
    hasCredential: true,
    isExportingImage: false,
    isExportingJSON: false,
    onOpenSheet: noop,
    onCloseSheet: noop,
    onShareVerifiable: noop,
    onSaveImage: noop,
    onExportCredential: noop,
  },
};

export default meta;

type Story = StoryObj<typeof BadgeShareSheet>;

// State 1 — sheet closed: only the single "Share badge" CTA is shown.
export const Closed: Story = {
  args: { isSheetOpen: false },
};

// State 2 — sheet open, everything available: all 3 rows enabled, RECOMMENDED
// tag visible. Switch the global theme toolbar across all 7 entries here to
// verify zero hardcoded-hex bleed (RECOMMENDED tag + blue rows recolour).
export const Open: Story = {
  args: { isSheetOpen: true },
};

// State 3 — no baked image: the verifiable-badge and save-as-image rows are
// disabled; the credential-export row stays enabled.
export const NoBakedImage: Story = {
  args: { isSheetOpen: true, canShareImage: false, hasCredential: true },
};

// State 4 — no credential: only the credential-export row is disabled.
export const NoCredential: Story = {
  args: { isSheetOpen: true, canShareImage: true, hasCredential: false },
};

// State 5a — exporting the image: the verifiable-badge AND save-as-image rows
// show a spinner (the hook sets one flag for both PNG paths).
export const ExportingImage: Story = {
  args: { isSheetOpen: true, isExportingImage: true },
};

// State 5b — exporting the credential JSON: only the credential row spins.
export const ExportingCredential: Story = {
  args: { isSheetOpen: true, isExportingJSON: true },
};

const storyStyles = StyleSheet.create((theme) => ({
  stage: {
    height: 600,
    width: "100%",
    maxWidth: 390,
    alignSelf: "center" as const,
    // Push the CTA to the foot of the frame, mirroring the prototype's ACTIONS
    // block low on the Badge Detail screen. The sheet is an absolute overlay,
    // unaffected by this — it always rises from the frame's bottom edge.
    justifyContent: "flex-end" as const,
    padding: theme.space[4],
    backgroundColor: theme.colors.backgroundSecondary,
  },
}));
