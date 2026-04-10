import React from "react";
import { View, Text } from "react-native";
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

    it("disables both arrows for single card", () => {
      const onIndexChange = jest.fn();
      renderWithProviders(
        <CardCarousel currentIndex={0} onIndexChange={onIndexChange}>
          <Card label="Solo" />
        </CardCarousel>,
      );
      fireEvent.press(screen.getByLabelText("Previous card"));
      fireEvent.press(screen.getByLabelText("Next card"));
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
});
