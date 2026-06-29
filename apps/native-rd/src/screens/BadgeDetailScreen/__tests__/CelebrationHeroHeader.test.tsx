import React from "react";
import {
  renderWithProviders,
  screen,
  fireEvent,
} from "../../../__tests__/test-utils";
import {
  CelebrationHeroHeader,
  type CelebrationHeroHeaderProps,
} from "../CelebrationHeroHeader";
import { createDefaultBadgeDesign } from "../../../badges/types";

const makeProps = (
  overrides?: Partial<CelebrationHeroHeaderProps>,
): CelebrationHeroHeaderProps => ({
  badgeDesign: createDefaultBadgeDesign("90 Days Rewired"),
  badgeTitle: "90 Days Rewired",
  earnedDate: "Jun 18, 2026",
  isVerified: true,
  // Off in tests: Confetti renders a reanimated timer layer we don't assert on.
  showConfetti: false,
  onBack: jest.fn(),
  onOverflow: jest.fn(),
  ...overrides,
});

describe("CelebrationHeroHeader", () => {
  it("fires onBack when the back arrow is pressed", () => {
    const onBack = jest.fn();
    renderWithProviders(<CelebrationHeroHeader {...makeProps({ onBack })} />);
    fireEvent.press(screen.getByTestId("celebration-hero-back"));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it("fires onOverflow when the ⋯ button is pressed", () => {
    const onOverflow = jest.fn();
    renderWithProviders(
      <CelebrationHeroHeader {...makeProps({ onOverflow })} />,
    );
    fireEvent.press(screen.getByTestId("celebration-hero-overflow"));
    expect(onOverflow).toHaveBeenCalledTimes(1);
  });

  it.each([
    { isVerified: true, present: true },
    { isVerified: false, present: false },
  ])(
    "shows the verified chip only when isVerified=$isVerified",
    ({ isVerified, present }) => {
      renderWithProviders(
        <CelebrationHeroHeader {...makeProps({ isVerified })} />,
      );
      const chip = screen.queryByTestId("verified-credential-chip");
      if (present) {
        expect(chip).toBeOnTheScreen();
      } else {
        expect(chip).toBeNull();
      }
    },
  );

  it.each([
    { showConfetti: true, present: true },
    { showConfetti: false, present: false },
  ])(
    "shows the celebratory sparkles only when showConfetti=$showConfetti",
    ({ showConfetti, present }) => {
      renderWithProviders(
        <CelebrationHeroHeader {...makeProps({ showConfetti })} />,
      );
      // Decorative layer is intentionally a11y-hidden, so opt into hidden
      // elements — otherwise the query filters it out even when present.
      const sparkles = screen.queryByTestId("celebration-sparkles", {
        includeHiddenElements: true,
      });
      if (present) {
        expect(sparkles).toBeOnTheScreen();
      } else {
        expect(sparkles).toBeNull();
      }
    },
  );

  it("renders the badge when a design is supplied", () => {
    renderWithProviders(<CelebrationHeroHeader {...makeProps()} />);
    expect(screen.getByTestId("badge-renderer")).toBeOnTheScreen();
  });

  // Null design must still render: createDefaultBadgeDesign produces a valid
  // monogram BadgeDesign, so the slot shows the fallback instead of breaking.
  it("renders the monogram fallback when badgeDesign is null", () => {
    renderWithProviders(
      <CelebrationHeroHeader {...makeProps({ badgeDesign: null })} />,
    );
    expect(screen.getByTestId("badge-renderer")).toBeOnTheScreen();
  });

  it.each([
    { label: "back arrow", testID: "celebration-hero-back" },
    { label: "overflow", testID: "celebration-hero-overflow" },
  ])(
    "exposes a button role and non-empty label on the $label control",
    ({ testID }) => {
      renderWithProviders(<CelebrationHeroHeader {...makeProps()} />);
      const control = screen.getByTestId(testID);
      expect(control.props.accessibilityRole).toBe("button");
      expect(control.props.accessibilityLabel).toBeTruthy();
    },
  );
});
