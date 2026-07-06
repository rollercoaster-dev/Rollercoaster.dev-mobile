import React from "react";

import {
  renderWithProviders,
  screen,
  fireEvent,
} from "../../../__tests__/test-utils";
import { createDefaultBadgeDesign } from "../../../badges/types";
import {
  FinishRevealStage,
  type FinishRevealStageProps,
} from "../FinishRevealStage";

const badgeDesign = createDefaultBadgeDesign("Rewire the workshop");

const makeProps = (
  overrides?: Partial<FinishRevealStageProps>,
): FinishRevealStageProps => ({
  badgeDesign,
  goalTitle: "Rewire the workshop",
  earnedDateLabel: "Jun 23, 2026",
  animationPref: "full",
  onViewBadge: jest.fn(),
  onBackToGoals: jest.fn(),
  ...overrides,
});

/** Pulls the `scale` value out of a (possibly array) style prop. */
function scaleFromStyle(style: unknown): number | undefined {
  const flat = Array.isArray(style) ? style : [style];
  for (const entry of flat) {
    const transform = (entry as { transform?: { scale?: number }[] })
      ?.transform;
    const found = transform?.find((t) => typeof t?.scale === "number");
    if (found) return found.scale;
  }
  return undefined;
}

describe("FinishRevealStage", () => {
  it("renders the badge, eyebrow, goal title, and earned date", () => {
    renderWithProviders(<FinishRevealStage {...makeProps()} />);
    expect(screen.getByTestId("finish-reveal-badge-render")).toBeOnTheScreen();
    expect(screen.getByText("Earned")).toBeOnTheScreen();
    expect(screen.getByText("Rewire the workshop")).toBeOnTheScreen();
    expect(screen.getByText("Jun 23, 2026")).toBeOnTheScreen();
  });

  it("fires onViewBadge when the primary CTA is pressed", () => {
    const onViewBadge = jest.fn();
    renderWithProviders(<FinishRevealStage {...makeProps({ onViewBadge })} />);
    fireEvent.press(screen.getByTestId("finish-reveal-view-badge"));
    expect(onViewBadge).toHaveBeenCalledTimes(1);
  });

  it("fires onBackToGoals when the underlined link is pressed", () => {
    const onBackToGoals = jest.fn();
    renderWithProviders(
      <FinishRevealStage {...makeProps({ onBackToGoals })} />,
    );
    fireEvent.press(screen.getByTestId("finish-reveal-back-to-goals"));
    expect(onBackToGoals).toHaveBeenCalledTimes(1);
  });

  it("exposes the back link as a button for a11y", () => {
    renderWithProviders(<FinishRevealStage {...makeProps()} />);
    expect(
      screen.getByTestId("finish-reveal-back-to-goals").props.accessibilityRole,
    ).toBe("button");
  });

  // full/reduced pop in from POP_INITIAL_SCALE (0.85); none starts at resting
  // scale (1) so there is no undersized frame. The synchronous reanimated mock
  // captures the render-time shared value, so the initial scale is assertable.
  it.each([
    ["full", 0.85],
    ["reduced", 0.85],
    ["none", 1],
  ] as const)(
    "starts the badge at the right scale for animationPref=%s",
    (animationPref, expectedScale) => {
      renderWithProviders(
        <FinishRevealStage {...makeProps({ animationPref })} />,
      );
      const badge = screen.getByTestId("finish-reveal-badge");
      expect(scaleFromStyle(badge.props.style)).toBe(expectedScale);
    },
  );
});
