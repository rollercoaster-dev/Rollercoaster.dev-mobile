import React from "react";
import {
  renderWithProviders,
  screen,
  fireEvent,
} from "../../../__tests__/test-utils";
import { i18n } from "../../../i18n";
import { BadgeEarnedModal } from "../BadgeEarnedModal";

jest.mock("../../../hooks/useCreateBadge", () => ({
  PLACEHOLDER_IMAGE_URI: "pending:baked-image",
  useCreateBadge: jest.fn(() => ({ status: "done", error: null })),
}));

jest.mock("../../../hooks/useAnimationPref", () => ({
  useAnimationPref: jest.fn(() => ({
    animationPref: "full",
    shouldAnimate: true,
    shouldReduceMotion: false,
    setAnimationPref: jest.fn(),
  })),
}));

const mockUseAnimationPref = jest.requireMock(
  "../../../hooks/useAnimationPref",
).useAnimationPref;

const defaultProps = {
  visible: true,
  imageUri: "file:///badges/test-badge.png",
  isFirstBadge: false,
  onViewBadge: jest.fn(),
  onContinue: jest.fn(),
};

describe("BadgeEarnedModal", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAnimationPref.mockReturnValue({
      animationPref: "full",
      shouldAnimate: true,
      shouldReduceMotion: false,
      setAnimationPref: jest.fn(),
    });
  });

  it("renders nothing when not visible", () => {
    renderWithProviders(<BadgeEarnedModal {...defaultProps} visible={false} />);
    expect(
      screen.queryByText(i18n.t("badges:earned.microcopy.subsequent")),
    ).not.toBeOnTheScreen();
  });

  it("renders badge image when visible and imageUri is a real URI", () => {
    renderWithProviders(<BadgeEarnedModal {...defaultProps} />);
    expect(
      screen.getByLabelText(i18n.t("badges:earned.a11y.image")),
    ).toBeOnTheScreen();
  });

  it("remounts the Image when imageUri changes (key={imageUri} guards iOS stale-fetch)", () => {
    // Regression guard for commit 1f70a63: iOS UIImageView can hang onto the
    // previous fetch when the source URI swaps mid-display (e.g. post-rebake).
    // key={imageUri} forces React to unmount-then-remount the host so the
    // native view re-fetches. If key= is dropped, React reuses the same fiber
    // across rerenders and the test-instance identity stays the same.
    const { rerender } = renderWithProviders(
      <BadgeEarnedModal {...defaultProps} imageUri="file:///badges/v1.png" />,
    );
    const firstImage = screen.getByTestId("badge-earned-image");
    expect(firstImage.props.source).toEqual({ uri: "file:///badges/v1.png" });

    rerender(
      <BadgeEarnedModal {...defaultProps} imageUri="file:///badges/v2.png" />,
    );
    const secondImage = screen.getByTestId("badge-earned-image");
    expect(secondImage.props.source).toEqual({ uri: "file:///badges/v2.png" });
    expect(secondImage).not.toBe(firstImage);
  });

  it("renders placeholder when imageUri is pending sentinel", () => {
    renderWithProviders(
      <BadgeEarnedModal {...defaultProps} imageUri="pending:baked-image" />,
    );
    expect(
      screen.getByLabelText(i18n.t("badges:earned.a11y.imagePlaceholder")),
    ).toBeOnTheScreen();
  });

  it("shows first-badge microcopy when isFirstBadge is true", () => {
    renderWithProviders(
      <BadgeEarnedModal {...defaultProps} isFirstBadge={true} />,
    );
    expect(
      screen.getByText(i18n.t("badges:earned.microcopy.first")),
    ).toBeOnTheScreen();
  });

  it("shows neutral microcopy when isFirstBadge is false", () => {
    renderWithProviders(<BadgeEarnedModal {...defaultProps} />);
    expect(
      screen.getByText(i18n.t("badges:earned.microcopy.subsequent")),
    ).toBeOnTheScreen();
  });

  it('calls onViewBadge when "View Badge" is pressed', () => {
    const onViewBadge = jest.fn();
    renderWithProviders(
      <BadgeEarnedModal {...defaultProps} onViewBadge={onViewBadge} />,
    );
    fireEvent.press(
      screen.getByLabelText(i18n.t("badges:earned.actions.view")),
    );
    expect(onViewBadge).toHaveBeenCalledTimes(1);
  });

  it('calls onContinue when "Keep going" is pressed', () => {
    const onContinue = jest.fn();
    renderWithProviders(
      <BadgeEarnedModal {...defaultProps} onContinue={onContinue} />,
    );
    fireEvent.press(
      screen.getByLabelText(i18n.t("badges:earned.actions.continue")),
    );
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it("has accessible card with label and polite live region", () => {
    renderWithProviders(<BadgeEarnedModal {...defaultProps} />);
    const card = screen.getByLabelText(i18n.t("badges:earned.a11y.card"));
    expect(card).toBeOnTheScreen();
    expect(card.props.accessibilityLiveRegion).toBe("polite");
  });

  it("does not render a Customize button (redesign is pre-bake only)", () => {
    renderWithProviders(<BadgeEarnedModal {...defaultProps} />);
    expect(screen.queryByText("Customize")).not.toBeOnTheScreen();
  });

  it("starts at scale 1 when shouldAnimate is false", () => {
    mockUseAnimationPref.mockReturnValue({
      animationPref: "none",
      shouldAnimate: false,
      shouldReduceMotion: true,
      setAnimationPref: jest.fn(),
    });
    // Should render without error — animation is skipped
    renderWithProviders(<BadgeEarnedModal {...defaultProps} />);
    expect(
      screen.getByText(i18n.t("badges:earned.microcopy.subsequent")),
    ).toBeOnTheScreen();
  });

  describe("E2E mode gating", () => {
    const originalE2E = process.env.EXPO_PUBLIC_E2E_MODE;
    beforeAll(() => {
      process.env.EXPO_PUBLIC_E2E_MODE = "true";
    });
    afterAll(() => {
      process.env.EXPO_PUBLIC_E2E_MODE = originalE2E;
    });

    it("drops the card a11y wrapper so nested testIDs are reachable", () => {
      renderWithProviders(<BadgeEarnedModal {...defaultProps} />);
      // Under E2E mode, the composed "Badge earned" label is not on the card
      expect(
        screen.queryByLabelText(i18n.t("badges:earned.a11y.card")),
      ).toBeNull();
      // but the nested badge image testID is reachable
      expect(screen.getByTestId("badge-earned-image")).toBeOnTheScreen();
    });
  });

  describe("pseudo locale", () => {
    afterEach(async () => {
      if (i18n.language !== "en") await i18n.changeLanguage("en");
    });

    it.each([
      {
        key: "badges:earned.microcopy.subsequent" as const,
        props: defaultProps,
        finder: "text" as const,
      },
      {
        key: "badges:earned.microcopy.first" as const,
        props: { ...defaultProps, isFirstBadge: true },
        finder: "text" as const,
      },
      {
        key: "badges:earned.actions.view" as const,
        props: defaultProps,
        finder: "label" as const,
      },
      {
        key: "badges:earned.a11y.image" as const,
        props: defaultProps,
        finder: "label" as const,
      },
      {
        key: "badges:earned.a11y.imagePlaceholder" as const,
        props: { ...defaultProps, imageUri: "pending:baked-image" },
        finder: "label" as const,
      },
    ])(
      "renders $key as bracketed copy under pseudo locale",
      async ({ key, props, finder }) => {
        await i18n.changeLanguage("pseudo");
        renderWithProviders(<BadgeEarnedModal {...props} />);
        const pseudo = i18n.t(key);
        expect(pseudo.startsWith("[")).toBe(true);
        if (finder === "text") {
          expect(screen.getByText(pseudo)).toBeOnTheScreen();
        } else {
          expect(screen.getByLabelText(pseudo)).toBeOnTheScreen();
        }
      },
    );
  });
});
