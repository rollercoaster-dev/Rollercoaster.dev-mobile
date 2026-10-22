import React from "react";
import {
  renderWithProviders,
  screen,
  fireEvent,
} from "../../../__tests__/test-utils";
import { BadgeCard } from "../BadgeCard";
import type { BadgeDesign } from "../../../badges/types";
import { getBadgeLayoutBoxes } from "../../../badges/layoutBoxes";
import { mockFontScale } from "../../../__tests__/fontScale";
import { mockTheme } from "../../../__tests__/mocks/unistyles";

const mockBadgeRenderer = jest.fn();
jest.mock("../../../badges/BadgeRenderer", () => ({
  BadgeRenderer: (props: { size: number }) => {
    mockBadgeRenderer(props);
    return "BadgeRenderer";
  },
  getRendererLayoutOptions: () => ({ strokeWidth: 3, hasShadow: false }),
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
    // Each text-column line grows by its role's capped scale (headline 1.5,
    // body and caption 2.0), so the badge tracks what the column really draws.
    test.each([
      [1, 1, 1],
      [1.4, 1.4, 1.4],
      [3.1, 1.5, 2],
    ])(
      "at fontScale %s sizes the badge to headline x%s, body/caption x%s",
      (fontScale, headlineScale, contentScale) => {
        const { headline, body, caption } = mockTheme.textStyles;
        const expected = Math.round(
          headline.lineHeight * headlineScale +
            mockTheme.space[1] +
            body.lineHeight * 2 * contentScale +
            mockTheme.space[2] +
            caption.lineHeight * contentScale,
        );
        mockFontScale(fontScale);
        renderWithProviders(
          <BadgeCard {...baseProps} description="Ran a mile" />,
        );
        // The math above assumes these caps; pin the rendered nodes to them.
        expect(
          screen.getByText("First Steps").props.maxFontSizeMultiplier,
        ).toBe(1.5);
        expect(screen.getByText("Ran a mile").props.maxFontSizeMultiplier).toBe(
          2,
        );
        expect(
          screen.getByText("Jan 1, 2025").props.maxFontSizeMultiplier,
        ).toBe(2);
        // The initials tile is badgeSize square with its letter at 0.4x; the
        // letter opts out of OS scaling because badgeSize already includes it.
        expect(screen.getByText("F").props.allowFontScaling).toBe(false);
        expect(screen.getByText("F")).toHaveStyle({
          fontSize: Math.round(expected * 0.4),
        });
      },
    );

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

    it("threads description into accessibilityHint", () => {
      renderWithProviders(
        <BadgeCard {...baseProps} description="Read 30 books in 2025" />,
      );
      const pressable = screen.getByLabelText(
        "Badge: First Steps, earned Jan 1, 2025",
      );
      expect(pressable.props.accessibilityHint).toBe("Read 30 books in 2025");
    });

    it("omits accessibilityHint when no description", () => {
      renderWithProviders(<BadgeCard {...baseProps} />);
      const pressable = screen.getByLabelText(
        "Badge: First Steps, earned Jan 1, 2025",
      );
      expect(pressable.props.accessibilityHint).toBeUndefined();
    });
  });
});
