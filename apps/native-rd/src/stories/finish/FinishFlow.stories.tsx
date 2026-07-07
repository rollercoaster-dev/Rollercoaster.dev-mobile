import React, { useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { ScopedTheme, StyleSheet } from "react-native-unistyles";
import type { Meta, StoryObj } from "@storybook/react";

import { FinishCelebrateStage } from "../../components/FinishCelebrateStage";
import { FinishDesignStage } from "../../components/FinishDesignStage";
import { FinishBakingStage } from "../../components/FinishBakingStage";
import { FinishRevealStage } from "../../components/FinishRevealStage";
import { createDefaultBadgeDesign, type BadgeDesign } from "../../badges/types";
import type { AnimationPref } from "../../hooks/useAnimationPref";
import { themeNames, type ThemeName } from "../../themes/compose";

const meta: Meta = {
  title: "Iteration B/Finish/Flow",
};
export default meta;

type Story = StoryObj;

/** The four sequential stages of the finishing flow. */
type FlowStage = "celebrate" | "design" | "baking" | "reveal";

const GOAL_TITLE = "Rewire the workshop";
// Deliberately off-palette (not in ColorPicker's ACCENT_COLORS) so the extra
// "goal" swatch renders as a distinct entry in the design stage — same
// fixture-hex convention as FinishDesignStage.stories.tsx.
const GOAL_COLOR = "#e11d48";
const EARNED_DATE_LABEL = "Jun 23, 2026";

// Threads the goal title into the celebrate summary so the same string surfaces
// on celebrate (summary), design (header subtitle), and reveal (heading) —
// nothing is independently hardcoded per stage.
const makeSummary = (title: string) =>
  `All 5 steps done for ${title} — with 3 pieces of evidence along the way.`;

// Auto-advance duration for baking → reveal, matching the canonical prototype's
// own bake() handler (Finishing Flow A Prototype.dc.html: setTimeout(…, 1100)).
const BAKE_DURATION_MS = 1100;

interface InteractiveFinishFlowProps {
  /** Passed straight through to the reveal stage's pop-in (D2/#470 contract). */
  animationPref?: AnimationPref;
  /** Goal title threaded through celebrate → design → reveal. */
  goalTitle?: string;
  /** Seeds the closing-note field's text. */
  initialClosingNote?: string;
  /** Seeds the celebrate note field's open/closed state. */
  initialNoteOpen?: boolean;
  /** Merged over the seeded default design (e.g. a long bottom label). */
  designOverrides?: Partial<BadgeDesign>;
}

/**
 * Story-local harness chaining the four already-shipped Finish*Stage components
 * through `useState` — no app navigation, no `useCreateBadge`, no real bake.
 * A single `design`/`goalTitle` threads through every stage; baking auto-
 * advances to reveal after a fixed timer (D2). Integration is #449's job.
 */
function InteractiveFinishFlow({
  animationPref = "full",
  goalTitle = GOAL_TITLE,
  initialClosingNote = "",
  initialNoteOpen = false,
  designOverrides,
}: InteractiveFinishFlowProps) {
  const [stage, setStage] = useState<FlowStage>("celebrate");
  const [closingNote, setClosingNote] = useState(initialClosingNote);
  const [design, setDesign] = useState<BadgeDesign>(() => ({
    ...createDefaultBadgeDesign(goalTitle, GOAL_COLOR),
    ...designOverrides,
  }));

  // Auto-advance baking → reveal with no tap, mirroring the prototype's timer.
  useEffect(() => {
    if (stage !== "baking") return;
    const timer = setTimeout(() => setStage("reveal"), BAKE_DURATION_MS);
    return () => clearTimeout(timer);
  }, [stage]);

  return (
    <View style={{ flex: 1, height: 640 }}>
      {stage === "celebrate" && (
        <FinishCelebrateStage
          summary={makeSummary(goalTitle)}
          closingNoteValue={closingNote}
          onClosingNoteChange={setClosingNote}
          initialNoteOpen={initialNoteOpen}
          onDesignBadge={() => setStage("design")}
        />
      )}
      {stage === "design" && (
        <FinishDesignStage
          design={design}
          onDesignChange={setDesign}
          goalColor={GOAL_COLOR}
          goalTitle={goalTitle}
          onBack={() => setStage("celebrate")}
          onBake={() => setStage("baking")}
        />
      )}
      {stage === "baking" && <FinishBakingStage badgeDesign={design} />}
      {stage === "reveal" && (
        <FinishRevealStage
          badgeDesign={design}
          goalTitle={goalTitle}
          earnedDateLabel={EARNED_DATE_LABEL}
          animationPref={animationPref}
          onViewBadge={() => {}}
          onBackToGoals={() => {}}
        />
      )}
    </View>
  );
}

/** Full sequence: press "Design your badge →", edit the badge, press "Bake my
 * badge", and the baking interstitial auto-advances to the reveal after 1100ms.
 * The threaded `design`/`goalTitle` is the same value at every stage. */
export const Default: Story = {
  render: () => <InteractiveFinishFlow />,
};

/** Same flow with `animationPref="none"` into the reveal stage — the badge
 * appears at resting scale with no pop-in. */
export const ReducedMotion: Story = {
  render: () => <InteractiveFinishFlow animationPref="none" />,
};

/** Long goal title + long closing note (opened) + a near-max (24-char) bottom
 * label seeded once at the top of the flow — every stage the click-through
 * reaches renders them without clipping. */
export const LongContent: Story = {
  render: () => (
    <InteractiveFinishFlow
      goalTitle="Rewire the entire workshop from scratch"
      initialNoteOpen
      initialClosingNote="Finishing this felt lighter than I expected — the last step had been sitting untouched for weeks, and closing it out finally let the whole thing breathe."
      designOverrides={{ bottomLabel: "COMPLETED · SEPTEMBER 26" }}
    />
  ),
};

// ---------------------------------------------------------------------------
// AllThemesMatrix — the two stages that carry theme-varying chrome tokens,
// side by side across all 7 product themes (D3). Design owns
// `chrome.screenHeaderBg/Fg/Border`; reveal owns `chrome.celebrationBg/Fg`
// (#419). Celebrate/baking both style off plain `colors.background`, so they
// add no matrix signal and are omitted.
//
// A live per-cell `ScopedTheme` matrix is safe here — unlike the
// NewGoalWizard/EditGoalView toolbar-switcher fallback, which exists because
// those compose a hook that setStates after mount and defeats ScopedTheme on
// web. All four Finish*Stage components are useState-only/prop-driven, and the
// reveal pop-in uses a reanimated shared value (not React setState), so no
// post-mount re-render reverts a cell to the toolbar theme.
// ---------------------------------------------------------------------------

// Human-facing mood label for each of the 7 product themes — mirror of the
// (non-exported) map in BadgeWallCell.stories.tsx / FinishLine.stories.tsx.
const MOOD_NAMES: Record<ThemeName, string> = {
  "light-default": "Full Ride",
  "dark-default": "Night Ride",
  "light-highContrast": "Bold Ink",
  "light-dyslexia": "Warm Studio",
  "light-autismFriendly": "Still Water",
  "light-lowVision": "Loud & Clear",
  "light-lowInfo": "Clean Signal",
};

// Shared, non-interactive fixture design threaded into both matrix rows —
// same seed as the flow story (goal color + title), so the matrix and the
// interactive flow show the same badge.
const MATRIX_DESIGN: BadgeDesign = createDefaultBadgeDesign(
  GOAL_TITLE,
  GOAL_COLOR,
);

const noop = () => {};

export const AllThemesMatrix: Story = {
  render: () => (
    <ScrollView horizontal showsHorizontalScrollIndicator>
      <View style={styles.matrixContainer}>
        {themeNames.map((name) => (
          <View key={name} style={styles.column}>
            <Text style={styles.columnTitle}>{MOOD_NAMES[name]}</Text>
            <Text style={styles.columnKey}>{name}</Text>
            <ScopedTheme name={name}>
              <View style={styles.matrixCell}>
                <FinishDesignStage
                  design={MATRIX_DESIGN}
                  onDesignChange={noop}
                  goalColor={GOAL_COLOR}
                  goalTitle={GOAL_TITLE}
                  onBack={noop}
                  onBake={noop}
                />
              </View>
            </ScopedTheme>
            <ScopedTheme name={name}>
              <View style={styles.matrixCell}>
                <FinishRevealStage
                  badgeDesign={MATRIX_DESIGN}
                  goalTitle={GOAL_TITLE}
                  earnedDateLabel={EARNED_DATE_LABEL}
                  animationPref="none"
                  onViewBadge={noop}
                  onBackToGoals={noop}
                />
              </View>
            </ScopedTheme>
          </View>
        ))}
      </View>
    </ScrollView>
  ),
};

const CELL_WIDTH = 320;
const CELL_HEIGHT = 640;

const styles = StyleSheet.create((theme) => ({
  matrixContainer: {
    flexDirection: "row",
    gap: theme.space[4],
    padding: theme.space[4],
    alignItems: "flex-start",
  },
  column: {
    alignItems: "center",
    gap: theme.space[1],
  },
  columnTitle: {
    fontFamily: theme.fontFamily.headline,
    fontSize: theme.size.sm,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
  },
  columnKey: {
    fontFamily: theme.fontFamily.mono,
    fontSize: theme.size.xs,
    color: theme.colors.textMuted,
    marginBottom: theme.space[2],
  },
  matrixCell: {
    width: CELL_WIDTH,
    height: CELL_HEIGHT,
    marginBottom: theme.space[3],
  },
}));
