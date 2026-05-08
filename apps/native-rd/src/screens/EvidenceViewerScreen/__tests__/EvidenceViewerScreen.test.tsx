import React from "react";
import { AccessibilityInfo } from "react-native";
import {
  renderWithProviders,
  screen,
  fireEvent,
} from "../../../__tests__/test-utils";
import type { EvidenceViewerScreenProps } from "../../../navigation/types";

const mockGoBack = jest.fn();
jest.mock("@react-navigation/native", () => {
  const actual = jest.requireActual("../../../__tests__/mocks/navigation");
  return {
    ...actual,
    useNavigation: jest.fn(() => ({
      ...actual.useNavigation(),
      goBack: mockGoBack,
    })),
  };
});

const mockUseAllEvidenceForGoal = jest.fn();
jest.mock("../../../hooks/useAllEvidenceForGoal", () => ({
  useAllEvidenceForGoal: (...args: unknown[]) =>
    mockUseAllEvidenceForGoal(...args),
}));

import { EvidenceViewerScreen } from "../EvidenceViewerScreen";

const baseRoute = {
  key: "EvidenceViewer-1",
  name: "EvidenceViewer" as const,
  params: { goalId: "goal-1", initialEvidenceId: "ev-2" },
};

// Screen only destructures `route`; an empty navigation stub is enough.
const routeProps: EvidenceViewerScreenProps = {
  route: baseRoute,
  navigation: {} as EvidenceViewerScreenProps["navigation"],
};

const ITEMS = [
  {
    id: "ev-1",
    title: "First note",
    type: "text" as const,
    uri: "content:text;hello",
    metadata: undefined,
    source: "step" as const,
    stepId: "step-a",
    stepTitle: "Step A",
  },
  {
    id: "ev-2",
    title: "Goal photo",
    type: "photo" as const,
    uri: "/photo.jpg",
    metadata: undefined,
    source: "goal" as const,
    stepId: null,
    stepTitle: null,
  },
];

beforeEach(() => {
  jest.clearAllMocks();
});

describe("EvidenceViewerScreen", () => {
  it("renders empty state when no evidence exists", () => {
    mockUseAllEvidenceForGoal.mockReturnValue([]);
    renderWithProviders(<EvidenceViewerScreen {...routeProps} />);
    expect(screen.getByText("No evidence to view.")).toBeOnTheScreen();
  });

  it("opens at the initial evidence id", () => {
    mockUseAllEvidenceForGoal.mockReturnValue(ITEMS);
    renderWithProviders(<EvidenceViewerScreen {...routeProps} />);
    // ev-2 is index 1 of 2 items, so counter shows "2 / 2"
    expect(screen.getByText("2 / 2")).toBeOnTheScreen();
  });

  it("falls back to first item if initialEvidenceId is unknown", () => {
    mockUseAllEvidenceForGoal.mockReturnValue(ITEMS);
    renderWithProviders(
      <EvidenceViewerScreen
        {...routeProps}
        route={{
          ...baseRoute,
          params: { ...baseRoute.params, initialEvidenceId: "missing" },
        }}
      />,
    );
    expect(screen.getByText("1 / 2")).toBeOnTheScreen();
  });

  it("switches active item when a thumbnail is pressed", () => {
    mockUseAllEvidenceForGoal.mockReturnValue(ITEMS);
    renderWithProviders(<EvidenceViewerScreen {...routeProps} />);
    // Tap thumb for ev-1 (text evidence, source = step)
    fireEvent.press(
      screen.getByLabelText("text evidence: First note, from Step A"),
    );
    expect(screen.getByText("1 / 2")).toBeOnTheScreen();
  });

  it("hides counter and strip when only one item exists", () => {
    mockUseAllEvidenceForGoal.mockReturnValue([ITEMS[0]]);
    renderWithProviders(<EvidenceViewerScreen {...routeProps} />);
    expect(screen.queryByText(/\d \/ \d/)).toBeNull();
  });

  it("back button navigates back", () => {
    mockUseAllEvidenceForGoal.mockReturnValue(ITEMS);
    renderWithProviders(<EvidenceViewerScreen {...routeProps} />);
    fireEvent.press(screen.getByLabelText("Go back"));
    expect(mockGoBack).toHaveBeenCalled();
  });

  it("clamps activeIndex and announces when evidence is removed mid-view", () => {
    const announce = jest
      .spyOn(AccessibilityInfo, "announceForAccessibility")
      .mockImplementation(() => undefined);
    mockUseAllEvidenceForGoal.mockReturnValue(ITEMS);
    const { rerender } = renderWithProviders(
      <EvidenceViewerScreen {...routeProps} />,
    );
    expect(screen.getByText("2 / 2")).toBeOnTheScreen();

    // Re-render with the active item removed.
    mockUseAllEvidenceForGoal.mockReturnValue([ITEMS[0]]);
    rerender(<EvidenceViewerScreen {...routeProps} />);

    // Strip is hidden for single-item lists, so just verify the announcement.
    expect(announce).toHaveBeenCalledWith(
      "Evidence was removed. Showing the next available item.",
    );
    announce.mockRestore();
  });

  it("announces when all evidence is removed mid-view", () => {
    const announce = jest
      .spyOn(AccessibilityInfo, "announceForAccessibility")
      .mockImplementation(() => undefined);
    mockUseAllEvidenceForGoal.mockReturnValue(ITEMS);
    const { rerender } = renderWithProviders(
      <EvidenceViewerScreen {...routeProps} />,
    );

    mockUseAllEvidenceForGoal.mockReturnValue([]);
    rerender(<EvidenceViewerScreen {...routeProps} />);

    expect(screen.getByText("No evidence to view.")).toBeOnTheScreen();
    expect(announce).toHaveBeenCalledWith("All evidence was removed.");
    announce.mockRestore();
  });
});
