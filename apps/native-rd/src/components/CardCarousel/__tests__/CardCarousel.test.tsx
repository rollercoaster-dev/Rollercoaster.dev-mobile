import React from "react";
import { View, Text, StyleSheet } from "react-native";
import {
  renderWithProviders,
  screen,
  fireEvent,
} from "../../../__tests__/test-utils";
import { CardCarousel } from "../CardCarousel";

jest.mock("expo-haptics", () => ({
  impactAsync: jest.fn().mockResolvedValue(undefined),
  ImpactFeedbackStyle: { Light: "light", Medium: "medium", Heavy: "heavy" },
}));

function Card({ label }: { label: string }) {
  return (
    <View accessible accessibilityLabel={label}>
      <Text>{label}</Text>
    </View>
  );
}

const defaultProps = {
  currentIndex: 1,
  onIndexChange: jest.fn(),
};

describe("CardCarousel", () => {
  beforeEach(() => jest.clearAllMocks());

  describe("rendering", () => {
    it("renders all child cards", () => {
      const { UNSAFE_getByProps } = renderWithProviders(
        <CardCarousel {...defaultProps}>
          <Card label="Card A" />
          <Card label="Card B" />
          <Card label="Card C" />
        </CardCarousel>,
      );
      // All cards are in the tree (peek/hidden cards have opacity 0 in tests
      // because reanimated mock doesn't trigger useEffect updates)
      expect(UNSAFE_getByProps({ accessibilityLabel: "Card A" })).toBeTruthy();
      expect(UNSAFE_getByProps({ accessibilityLabel: "Card B" })).toBeTruthy();
      expect(UNSAFE_getByProps({ accessibilityLabel: "Card C" })).toBeTruthy();
    });

    it("renders with a single card", () => {
      renderWithProviders(
        <CardCarousel currentIndex={0} onIndexChange={jest.fn()}>
          <Card label="Solo" />
        </CardCarousel>,
      );
      expect(screen.getByText("Solo")).toBeOnTheScreen();
    });

    it("fills the track slot instead of vertically centering (stable frame)", () => {
      // Regression guard for the frame-fill fix (#360): the animated card slot
      // must stretch top→bottom so a flex:1 card child keeps the same envelope
      // between cards, rather than shrink-wrapping + centring (which jittered
      // the frame as content length changed).
      const { UNSAFE_getByProps } = renderWithProviders(
        <CardCarousel currentIndex={1} onIndexChange={jest.fn()}>
          <Card label="Card A" />
          <Card label="Card B" />
          <Card label="Card C" />
        </CardCarousel>,
      );
      // The center card's wrapper is the only one with importantForAccessibility
      // "no" (peeks use "no-hide-descendants").
      const centerWrapper = UNSAFE_getByProps({
        accessible: false,
        importantForAccessibility: "no",
      });
      const style = StyleSheet.flatten(centerWrapper.props.style);
      expect(style.position).toBe("absolute");
      expect(style.justifyContent).toBeUndefined();
    });
  });

  describe("navigation arrows", () => {
    it("calls onIndexChange with previous index when left arrow pressed", () => {
      const onIndexChange = jest.fn();
      renderWithProviders(
        <CardCarousel currentIndex={1} onIndexChange={onIndexChange}>
          <Card label="Card A" />
          <Card label="Card B" />
          <Card label="Card C" />
        </CardCarousel>,
      );
      fireEvent.press(screen.getByLabelText("Previous card"));
      expect(onIndexChange).toHaveBeenCalledWith(0);
    });

    it("calls onIndexChange with next index when right arrow pressed", () => {
      const onIndexChange = jest.fn();
      renderWithProviders(
        <CardCarousel currentIndex={1} onIndexChange={onIndexChange}>
          <Card label="Card A" />
          <Card label="Card B" />
          <Card label="Card C" />
        </CardCarousel>,
      );
      fireEvent.press(screen.getByLabelText("Next card"));
      expect(onIndexChange).toHaveBeenCalledWith(2);
    });

    it("disables left arrow at first card", () => {
      const onIndexChange = jest.fn();
      renderWithProviders(
        <CardCarousel currentIndex={0} onIndexChange={onIndexChange}>
          <Card label="Card A" />
          <Card label="Card B" />
        </CardCarousel>,
      );
      const prevButton = screen.getByLabelText("Previous card");
      fireEvent.press(prevButton);
      expect(onIndexChange).not.toHaveBeenCalled();
      expect(prevButton.props.accessibilityState?.disabled).toBe(true);
    });

    it("disables right arrow at last card", () => {
      const onIndexChange = jest.fn();
      renderWithProviders(
        <CardCarousel currentIndex={1} onIndexChange={onIndexChange}>
          <Card label="Card A" />
          <Card label="Card B" />
        </CardCarousel>,
      );
      const nextButton = screen.getByLabelText("Next card");
      fireEvent.press(nextButton);
      expect(onIndexChange).not.toHaveBeenCalled();
      expect(nextButton.props.accessibilityState?.disabled).toBe(true);
    });

    it("hides both arrows entirely for single card (no navigation surface)", () => {
      const onIndexChange = jest.fn();
      renderWithProviders(
        <CardCarousel currentIndex={0} onIndexChange={onIndexChange}>
          <Card label="Solo" />
        </CardCarousel>,
      );
      expect(screen.queryByLabelText("Previous card")).toBeNull();
      expect(screen.queryByLabelText("Next card")).toBeNull();
      expect(onIndexChange).not.toHaveBeenCalled();
    });
  });

  describe("accessibility", () => {
    it("keeps the current card children individually reachable", () => {
      const { UNSAFE_queryByProps } = renderWithProviders(
        <CardCarousel {...defaultProps}>
          <Card label="Card A" />
          <Card label="Card B" />
          <Card label="Card C" />
        </CardCarousel>,
      );

      expect(screen.getByLabelText("Card B")).toBeOnTheScreen();
      expect(
        UNSAFE_queryByProps({
          accessible: true,
          importantForAccessibility: "yes",
        }),
      ).toBeNull();
    });

    it("passes the carousel label through to navigation hints", () => {
      renderWithProviders(
        <CardCarousel {...defaultProps} accessibilityLabel="Step carousel">
          <Card label="Card A" />
          <Card label="Card B" />
          <Card label="Card C" />
        </CardCarousel>,
      );
      expect(
        screen.getByLabelText("Previous card").props.accessibilityHint,
      ).toBe("Moves to the previous item in Step carousel");
      expect(screen.getByLabelText("Next card").props.accessibilityHint).toBe(
        "Moves to the next item in Step carousel",
      );
    });

    it("falls back to the keyed default label in hints when none is passed", () => {
      // Exercises the t("cardCarousel.a11y.label") branch (no accessibilityLabel
      // prop) — the one non-mechanical hunk of the #202 i18n migration.
      renderWithProviders(
        <CardCarousel {...defaultProps}>
          <Card label="Card A" />
          <Card label="Card B" />
          <Card label="Card C" />
        </CardCarousel>,
      );
      expect(
        screen.getByLabelText("Previous card").props.accessibilityHint,
      ).toBe("Moves to the previous item in Card carousel");
      expect(screen.getByLabelText("Next card").props.accessibilityHint).toBe(
        "Moves to the next item in Card carousel",
      );
    });

    it("has correct accessibility labels on arrows", () => {
      renderWithProviders(
        <CardCarousel {...defaultProps}>
          <Card label="Card A" />
          <Card label="Card B" />
          <Card label="Card C" />
        </CardCarousel>,
      );
      expect(screen.getByLabelText("Previous card")).toBeOnTheScreen();
      expect(screen.getByLabelText("Next card")).toBeOnTheScreen();
    });

    it("hides non-center cards from accessibility tree", () => {
      const { UNSAFE_getAllByProps, UNSAFE_getByProps } = renderWithProviders(
        <CardCarousel currentIndex={1} onIndexChange={jest.fn()}>
          <Card label="Left" />
          <Card label="Center" />
          <Card label="Right" />
        </CardCarousel>,
      );

      expect(
        UNSAFE_getByProps({
          accessible: false,
          importantForAccessibility: "no",
        }),
      ).toBeTruthy();
      expect(
        UNSAFE_getAllByProps({
          importantForAccessibility: "no-hide-descendants",
        }).length,
      ).toBeGreaterThanOrEqual(2);
    });

    it("clamps out-of-bounds currentIndex", () => {
      renderWithProviders(
        <CardCarousel currentIndex={10} onIndexChange={jest.fn()}>
          <Card label="Card A" />
          <Card label="Card B" />
        </CardCarousel>,
      );
      expect(
        screen.getByLabelText("Next card").props.accessibilityState?.disabled,
      ).toBe(true);
    });
  });

  // --- A11y contract (#360 Phase 4 hardening). Locks in the nav-arrow
  // guarantees from the issue's intent criteria so a future refactor can't
  // silently drop the role, hide the arrows, shrink the touch target, or reduce
  // the disabled state to a colour-only cue. ---
  describe("a11y contract (#360 Phase 4)", () => {
    const renderTrio = (currentIndex = 1) =>
      renderWithProviders(
        <CardCarousel currentIndex={currentIndex} onIndexChange={jest.fn()}>
          <Card label="Card A" />
          <Card label="Card B" />
          <Card label="Card C" />
        </CardCarousel>,
      );

    it.each(["Previous card", "Next card"])(
      "%s arrow is a reachable button (role=button, not hidden from a11y)",
      (label) => {
        renderTrio();
        const arrow = screen.getByLabelText(label);
        expect(arrow.props.accessibilityRole).toBe("button");
        expect(arrow.props.accessible).toBe(true);
        expect(arrow.props.accessibilityElementsHidden).toBeFalsy();
        expect(arrow.props.importantForAccessibility).not.toBe(
          "no-hide-descendants",
        );
      },
    );

    it.each(["Previous card", "Next card"])(
      "%s arrow meets the 44x44 minimum touch target",
      (label) => {
        renderTrio();
        const style = StyleSheet.flatten(
          screen.getByLabelText(label).props.style,
        );
        expect(style.width).toBeGreaterThanOrEqual(44);
        expect(style.height).toBeGreaterThanOrEqual(44);
      },
    );

    it("communicates the disabled arrow both programmatically and via a non-colour cue", () => {
      // currentIndex 0 → Previous is disabled, Next is enabled.
      renderTrio(0);
      const prev = screen.getByLabelText("Previous card");
      const next = screen.getByLabelText("Next card");

      expect(prev.props.accessibilityState?.disabled).toBe(true);
      expect(next.props.accessibilityState?.disabled).toBe(false);

      // The disabled cue is dimmed opacity — a change beyond colour alone — so
      // it still reads for users who can't distinguish the border colour.
      const prevStyle = StyleSheet.flatten(prev.props.style);
      const nextStyle = StyleSheet.flatten(next.props.style);
      expect(prevStyle.opacity).toBeLessThan(1);
      expect(nextStyle.opacity ?? 1).toBe(1);
    });
  });

  describe("E2E mode gating", () => {
    const originalE2E = process.env.EXPO_PUBLIC_E2E_MODE;
    beforeAll(() => {
      process.env.EXPO_PUBLIC_E2E_MODE = "true";
    });
    afterAll(() => {
      process.env.EXPO_PUBLIC_E2E_MODE = originalE2E;
    });

    it("drops adjustable role so descendant testIDs are reachable", () => {
      renderWithProviders(
        <CardCarousel {...defaultProps}>
          <Card label="Card A" />
          <Card label="Card B" />
          <Card label="Card C" />
        </CardCarousel>,
      );
      // Under EXPO_PUBLIC_E2E_MODE=true, the outer grouping is disabled so
      // Maestro can reach testIDs inside the center card.
      expect(screen.queryByRole("adjustable")).toBeNull();
    });
  });
});
