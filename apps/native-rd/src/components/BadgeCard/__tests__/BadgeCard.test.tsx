import React from "react";
import {
  renderWithProviders,
  screen,
  fireEvent,
} from "../../../__tests__/test-utils";
import { BadgeCard } from "../BadgeCard";
import type { BadgeDesign } from "../../../badges/types";
import { getBadgeLayoutBoxes } from "../../../badges/layoutBoxes";

const mockBadgeRenderer = jest.fn();
jest.mock("../../../badges/BadgeRenderer", () => ({
  BadgeRenderer: (props: { size: number }) => {
    mockBadgeRenderer(props);
    return "BadgeRenderer";
  },
}));

beforeEach(() => {
  mockBadgeRenderer.mockClear();
});

const baseProps = {
  title: "First Steps",
  earnedDate: "Jan 1, 2025",
};

describe("BadgeCard", () => {
  it("fires onPress when tapped", () => {
    const onPress = jest.fn();
    renderWithProviders(<BadgeCard {...baseProps} onPress={onPress} />);
    fireEvent.press(
      screen.getByLabelText("Badge: First Steps, earned Jan 1, 2025"),
    );
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("renders BadgeRenderer when design prop is provided and hides initials", () => {
    const design: BadgeDesign = {
      shape: "circle",
      frame: "none",
      color: "#a78bfa",
      iconName: "Trophy",
      iconWeight: "regular",
      title: "First Steps",
      centerMode: "icon",
    };
    renderWithProviders(<BadgeCard {...baseProps} design={design} />);
    // Initials fallback should NOT be present when design is provided
    expect(screen.queryByText("F")).toBeNull();
  });

  it("renders initials fallback when design is not provided", () => {
    renderWithProviders(<BadgeCard {...baseProps} />);
    expect(screen.getByText("F")).toBeOnTheScreen();
  });

  describe("description", () => {
    it("renders description when provided", () => {
      renderWithProviders(
        <BadgeCard {...baseProps} description="Read 30 books in 2025" />,
      );
      expect(screen.getByText("Read 30 books in 2025")).toBeOnTheScreen();
    });

    it("does not render description when omitted", () => {
      renderWithProviders(<BadgeCard {...baseProps} />);
      expect(screen.queryByText(/Read/)).toBeNull();
    });

    it("clamps description to 2 lines with tail ellipsis", () => {
      renderWithProviders(
        <BadgeCard {...baseProps} description="some long description text" />,
      );
      const desc = screen.getByText("some long description text");
      expect(desc.props.numberOfLines).toBe(2);
      expect(desc.props.ellipsizeMode).toBe("tail");
    });

    it("clamps title to 1 line with tail ellipsis", () => {
      renderWithProviders(<BadgeCard {...baseProps} />);
      const title = screen.getByText("First Steps");
      expect(title.props.numberOfLines).toBe(1);
      expect(title.props.ellipsizeMode).toBe("tail");
    });
  });

  describe("badge sizing", () => {
    it("passes a positive size derived from the theme to BadgeRenderer", () => {
      const design: BadgeDesign = {
        shape: "circle",
        frame: "none",
        color: "#a78bfa",
        iconName: "Trophy",
        iconWeight: "regular",
        title: "First Steps",
        centerMode: "icon",
      };
      renderWithProviders(<BadgeCard {...baseProps} design={design} />);
      expect(mockBadgeRenderer).toHaveBeenCalledTimes(1);
      const props = mockBadgeRenderer.mock.calls[0][0];
      expect(typeof props.size).toBe("number");
      expect(props.size).toBeGreaterThan(0);
    });

    it("layout boxes grow viewBox.h when a banner is present", () => {
      const size = 100;
      const plain: BadgeDesign = {
        shape: "circle",
        frame: "none",
        color: "#a78bfa",
        iconName: "Trophy",
        iconWeight: "regular",
        title: "T",
        centerMode: "icon",
      };
      const withBanner: BadgeDesign = {
        ...plain,
        banner: { text: "ACHIEVED", position: "top" },
      };
      const plainBox = getBadgeLayoutBoxes(plain, size);
      const bannerBox = getBadgeLayoutBoxes(withBanner, size);
      expect(bannerBox.viewBox.h).toBeGreaterThan(plainBox.viewBox.h);
    });

    it("layout boxes grow viewBox.h when a bottom label is present", () => {
      const size = 100;
      const plain: BadgeDesign = {
        shape: "circle",
        frame: "none",
        color: "#a78bfa",
        iconName: "Trophy",
        iconWeight: "regular",
        title: "T",
        centerMode: "icon",
      };
      const withLabel: BadgeDesign = { ...plain, bottomLabel: "v1" };
      const plainBox = getBadgeLayoutBoxes(plain, size);
      const labelBox = getBadgeLayoutBoxes(withLabel, size);
      expect(labelBox.viewBox.h).toBeGreaterThan(plainBox.viewBox.h);
    });
  });

  describe("evidence count", () => {
    it.each([
      [1, "1 piece of evidence"],
      [3, "3 pieces of evidence"],
      [0, "0 pieces of evidence"],
    ])('displays "%s" as "%s"', (count, expected) => {
      renderWithProviders(<BadgeCard {...baseProps} evidenceCount={count} />);
      expect(screen.getByText(expected)).toBeOnTheScreen();
    });

    it("does not display evidence text when evidenceCount is undefined", () => {
      renderWithProviders(<BadgeCard {...baseProps} />);
      expect(screen.queryByText(/evidence/)).toBeNull();
    });
  });

  describe("accessibility", () => {
    it('has role "button" when onPress is provided', () => {
      renderWithProviders(<BadgeCard {...baseProps} onPress={() => {}} />);
      expect(screen.getByRole("button")).toBeOnTheScreen();
    });

    it('does not have role "button" when onPress is omitted', () => {
      renderWithProviders(<BadgeCard {...baseProps} />);
      expect(screen.queryByRole("button")).toBeNull();
    });

    it("includes title and date in accessibilityLabel", () => {
      renderWithProviders(<BadgeCard {...baseProps} />);
      expect(
        screen.getByLabelText("Badge: First Steps, earned Jan 1, 2025"),
      ).toBeOnTheScreen();
    });
  });
});
