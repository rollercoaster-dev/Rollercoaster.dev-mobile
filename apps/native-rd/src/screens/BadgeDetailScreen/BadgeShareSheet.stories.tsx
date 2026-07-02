import type { Meta, StoryObj } from "@storybook/react";
import { BadgeShareSheet } from "./BadgeShareSheet";

const noop = () => {};

const meta: Meta<typeof BadgeShareSheet> = {
  title: "Iteration B/Badge Detail/BadgeShareSheet",
  component: BadgeShareSheet,
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
