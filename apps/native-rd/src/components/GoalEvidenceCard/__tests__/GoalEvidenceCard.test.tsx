import React from "react";
import { StyleSheet } from "react-native";
import {
  renderWithProviders,
  screen,
  fireEvent,
} from "../../../__tests__/test-utils";
import { i18n } from "../../../i18n";
import { GoalEvidenceCard } from "../GoalEvidenceCard";

jest.mock("expo-haptics", () => ({
  impactAsync: jest.fn().mockResolvedValue(undefined),
  ImpactFeedbackStyle: { Light: "light", Medium: "medium", Heavy: "heavy" },
}));

const mockBadgeRenderer = jest.fn();
jest.mock("../../../badges/BadgeRenderer", () => ({
  BadgeRenderer: (props: { size: number }) => {
    mockBadgeRenderer(props);
    return null;
  },
  getRendererLayoutOptions: () => ({ strokeWidth: 3, hasShadow: false }),
}));

const defaultProps = {
  goalTitle: "Run my first 5k",
  goalDescription: "Build up from couch-to-5k over 8 weeks.",
  goalColor: "#FFD400",
  goalDesignJson: null,
  onBadgePress: jest.fn(),
  evidenceCount: 0,
  onEvidenceTap: jest.fn(),
};

describe("GoalEvidenceCard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockBadgeRenderer.mockClear();
  });

  it("renders the goal title with header role", () => {
    renderWithProviders(<GoalEvidenceCard {...defaultProps} />);
    expect(screen.getByRole("header")).toHaveTextContent("Run my first 5k");
  });

  it("renders the goal description when non-null", () => {
    renderWithProviders(<GoalEvidenceCard {...defaultProps} />);
    expect(
      screen.getByText("Build up from couch-to-5k over 8 weeks."),
    ).toBeOnTheScreen();
  });

  it("does not render a description element when goalDescription is null", () => {
    renderWithProviders(
      <GoalEvidenceCard {...defaultProps} goalDescription={null} />,
    );
    // Title still present; no extra body text rendered.
    expect(screen.queryByText(/Build up from/)).toBeNull();
  });

  it("renders a BadgeRenderer with a synthesized default design when goalDesignJson is null", () => {
    renderWithProviders(<GoalEvidenceCard {...defaultProps} />);
    expect(mockBadgeRenderer).toHaveBeenCalled();
    const props = mockBadgeRenderer.mock.calls[0]?.[0] as {
      design: { title: string };
      size: number;
    };
    expect(props.design.title).toBe("Run my first 5k");
    expect(props.size).toBeGreaterThan(0);
  });

  it("exposes the badge as a labeled button", () => {
    renderWithProviders(<GoalEvidenceCard {...defaultProps} />);
    expect(
      screen.getByLabelText(
        i18n.t("common:goalCard.a11y.badgePreview", {
          title: "Run my first 5k",
        }),
      ),
    ).toBeOnTheScreen();
  });

  it("sizes the badge wrapper to the SVG viewBox so banner/bottomLabel overflow grows the card horizontally", () => {
    // Regression: a fully-decorated badge (banner + bottom label) used to push
    // the card vertically because the wrapper was a fixed square. The wrapper
    // must now adopt the viewBox dimensions, which exceed the rendered badge
    // size when overflow text is present.
    const designWithOverflow = JSON.stringify({
      shape: "roundedRect",
      frame: "none",
      color: "#FFD400",
      iconName: "Trophy",
      iconWeight: "regular",
      title: "Run my first 5k",
      centerMode: "icon",
      bottomLabel: "AND THE BOTTOM",
      banner: { text: "WITH BANNER", position: "top" },
    });

    renderWithProviders(
      <GoalEvidenceCard
        {...defaultProps}
        goalDesignJson={designWithOverflow}
      />,
    );

    const renderedSize = (
      mockBadgeRenderer.mock.calls[0]?.[0] as { size: number }
    ).size;
    const pressable = screen.getByLabelText(
      i18n.t("common:goalCard.a11y.badgePreview", {
        title: "Run my first 5k",
      }),
    );
    const flatStyle = StyleSheet.flatten(pressable.props.style) as {
      width?: number;
      height?: number;
    };

    // Banner + bottomLabel overflow is vertical (see buildViewBox in
    // layoutBoxes.ts), so the height grows past renderedSize while width
    // stays equal.
    expect(flatStyle.height).toBeGreaterThan(renderedSize);
  });

  it("calls onBadgePress when the badge is tapped", () => {
    const onBadgePress = jest.fn();
    renderWithProviders(
      <GoalEvidenceCard {...defaultProps} onBadgePress={onBadgePress} />,
    );
    fireEvent.press(
      screen.getByLabelText(
        i18n.t("common:goalCard.a11y.badgePreview", {
          title: "Run my first 5k",
        }),
      ),
    );
    expect(onBadgePress).toHaveBeenCalledTimes(1);
  });

  it("displays evidence count with plural label", () => {
    renderWithProviders(
      <GoalEvidenceCard {...defaultProps} evidenceCount={5} />,
    );
    expect(screen.getByText("5 items")).toBeOnTheScreen();
  });

  it("displays singular evidence label for 1 item", () => {
    renderWithProviders(
      <GoalEvidenceCard {...defaultProps} evidenceCount={1} />,
    );
    expect(screen.getByText("1 item")).toBeOnTheScreen();
  });

  it('displays "add evidence" prompt when count is 0', () => {
    renderWithProviders(<GoalEvidenceCard {...defaultProps} />);
    expect(screen.getByText("+ add evidence")).toBeOnTheScreen();
  });

  it("calls onEvidenceTap when evidence badge is pressed", () => {
    const onEvidenceTap = jest.fn();
    renderWithProviders(
      <GoalEvidenceCard
        {...defaultProps}
        evidenceCount={3}
        onEvidenceTap={onEvidenceTap}
      />,
    );
    fireEvent.press(
      screen.getByLabelText(
        i18n.t("common:goalCard.a11y.evidenceCount", { count: 3 }),
      ),
    );
    expect(onEvidenceTap).toHaveBeenCalledTimes(1);
  });

  it("has accessible evidence badge label", () => {
    renderWithProviders(
      <GoalEvidenceCard {...defaultProps} evidenceCount={7} />,
    );
    expect(
      screen.getByLabelText(
        i18n.t("common:goalCard.a11y.evidenceCount", { count: 7 }),
      ),
    ).toBeOnTheScreen();
  });

  describe("Mark Complete affordance", () => {
    it("does not render the check or Ready badge when onMarkComplete is omitted", () => {
      renderWithProviders(<GoalEvidenceCard {...defaultProps} />);
      expect(
        screen.queryByRole("button", {
          name: i18n.t("common:goalCard.markComplete"),
        }),
      ).toBeNull();
      expect(
        screen.queryByText(i18n.t("common:goalCard.readyBadge")),
      ).toBeNull();
    });

    it("renders the check and Ready badge when onMarkComplete is provided", () => {
      renderWithProviders(
        <GoalEvidenceCard {...defaultProps} onMarkComplete={jest.fn()} />,
      );
      expect(
        screen.getByRole("button", {
          name: i18n.t("common:goalCard.markComplete"),
        }),
      ).toBeOnTheScreen();
      expect(
        screen.getByText(i18n.t("common:goalCard.readyBadge")),
      ).toBeOnTheScreen();
    });

    it("calls onMarkComplete when the check is tapped", () => {
      const onMarkComplete = jest.fn();
      renderWithProviders(
        <GoalEvidenceCard {...defaultProps} onMarkComplete={onMarkComplete} />,
      );
      fireEvent.press(
        screen.getByRole("button", {
          name: i18n.t("common:goalCard.markComplete"),
        }),
      );
      expect(onMarkComplete).toHaveBeenCalledTimes(1);
    });
  });
});
