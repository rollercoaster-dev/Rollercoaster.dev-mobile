import type { Meta, StoryObj } from "@storybook/react";
import {
  BadgeShape,
  BadgeFrame,
  BadgeIconWeight,
  BannerPosition,
  type BadgeDesign,
} from "../../badges/types";
import { CelebrationHeroHeader } from "./CelebrationHeroHeader";

// Fully-decorated badge: purple circle, Trophy icon, "REWIRED" banner. This is
// the design reviewers switch the theme toolbar against to confirm the band
// recolours per theme with no hardcoded hex bleed.
const designedBadge: BadgeDesign = {
  shape: BadgeShape.circle,
  frame: BadgeFrame.boldBorder,
  color: "#a78bfa",
  iconName: "Trophy",
  iconWeight: BadgeIconWeight.fill,
  title: "90 Days Rewired",
  centerMode: "icon",
  banner: { text: "REWIRED", position: BannerPosition.bottom },
};

const noop = () => {};

const meta: Meta<typeof CelebrationHeroHeader> = {
  title: "Iteration B/Badge Detail/CelebrationHeroHeader",
  component: CelebrationHeroHeader,
  args: {
    onBack: noop,
    onOverflow: noop,
  },
};

export default meta;

type Story = StoryObj<typeof CelebrationHeroHeader>;

// Primary story — verified, confetti animating, full design. Switch the global
// theme toolbar across all 7 entries here to verify the band recolours.
export const Designed: Story = {
  args: {
    badgeDesign: designedBadge,
    badgeTitle: "90 Days Rewired",
    credentialLabel: "Verifiable · earned Jun 18, 2026",
    isVerified: true,
    showConfetti: true,
  },
};

// Pre-designer state: null design falls back to the monogram default, no chip,
// no confetti. Confirms the fallback renders cleanly across themes.
export const Undesigned: Story = {
  args: {
    badgeDesign: null,
    badgeTitle: "Untitled Goal",
    credentialLabel: null,
    isVerified: false,
    showConfetti: false,
  },
};

// Static verified state — same as Designed but confetti suppressed. Mirrors how
// ND themes with reduced-motion render the band (Confetti self-suppresses there).
export const NoConfetti: Story = {
  args: {
    badgeDesign: designedBadge,
    badgeTitle: "90 Days Rewired",
    credentialLabel: "Verifiable · earned Jun 18, 2026",
    isVerified: true,
    showConfetti: false,
  },
};
