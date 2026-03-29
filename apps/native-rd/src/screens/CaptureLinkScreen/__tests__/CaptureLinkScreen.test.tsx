import React from "react";
import {
  renderWithProviders,
  screen,
  fireEvent,
  waitFor,
} from "../../../__tests__/test-utils";
import { CaptureLinkScreen } from "../CaptureLinkScreen";
import { createEvidence, EvidenceType } from "../../../db";

// Mock navigation
const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
jest.mock("@react-navigation/native", () => {
  const actual = jest.requireActual("@react-navigation/native");
  return {
    ...actual,
    useNavigation: () => ({
      goBack: mockGoBack,
      navigate: mockNavigate,
    }),
  };
});

// Mock createEvidence
jest.mock("../../../db", () => {
  const actual = jest.requireActual("../../../db");
  return {
    ...actual,
    createEvidence: jest.fn(),
  };
});

const mockCreateEvidence = createEvidence as jest.MockedFunction<
  typeof createEvidence
>;

const defaultRoute = {
  key: "CaptureLink-test",
  name: "CaptureLink" as const,
  params: { goalId: "goal_test_123" },
};

function renderScreen(params?: { goalId: string; stepId?: string }) {
  const route = {
    ...defaultRoute,
    params: params ?? defaultRoute.params,
  };
  return renderWithProviders(
    <CaptureLinkScreen route={route as any} navigation={{} as any} />,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("CaptureLinkScreen", () => {
  it("renders URL and caption input fields", () => {
    renderScreen();

    expect(screen.getByText("Add Link")).toBeTruthy();
    expect(screen.getByLabelText("URL")).toBeTruthy();
    expect(screen.getByLabelText("Caption (optional)")).toBeTruthy();
    expect(screen.getByText("Save Link")).toBeTruthy();
    expect(screen.getByText("Cancel")).toBeTruthy();
  });

  it("shows validation error for empty URL on save", () => {
    renderScreen();

    fireEvent.press(screen.getByText("Save Link"));

    expect(screen.getByText("Please enter a URL")).toBeTruthy();
    expect(mockCreateEvidence).not.toHaveBeenCalled();
  });

  it("shows validation error for invalid URL", () => {
    renderScreen();

    fireEvent.changeText(screen.getByLabelText("URL"), "not-a-url");
    fireEvent.press(screen.getByText("Save Link"));

    expect(
      screen.getByText("Please enter a valid URL (e.g. https://example.com)"),
    ).toBeTruthy();
    expect(mockCreateEvidence).not.toHaveBeenCalled();
  });

  it("clears validation error when user types", () => {
    renderScreen();

    // Trigger the error first
    fireEvent.press(screen.getByText("Save Link"));
    expect(screen.getByText("Please enter a URL")).toBeTruthy();

    // Start typing to clear error
    fireEvent.changeText(screen.getByLabelText("URL"), "h");

    expect(screen.queryByText("Please enter a URL")).toBeNull();
  });

  it("saves link evidence with goalId and navigates back", () => {
    renderScreen();

    fireEvent.changeText(screen.getByLabelText("URL"), "https://example.com");
    fireEvent.press(screen.getByText("Save Link"));

    expect(mockCreateEvidence).toHaveBeenCalledWith({
      goalId: "goal_test_123",
      stepId: undefined,
      type: EvidenceType.link,
      uri: "https://example.com",
      description: undefined,
    });
    expect(mockGoBack).toHaveBeenCalled();
  });

  it("saves link evidence with caption when provided", () => {
    renderScreen();

    fireEvent.changeText(
      screen.getByLabelText("URL"),
      "https://example.com/article",
    );
    fireEvent.changeText(
      screen.getByLabelText("Caption (optional)"),
      "Great article",
    );
    fireEvent.press(screen.getByText("Save Link"));

    expect(mockCreateEvidence).toHaveBeenCalledWith({
      goalId: "goal_test_123",
      stepId: undefined,
      type: EvidenceType.link,
      uri: "https://example.com/article",
      description: "Great article",
    });
  });

  it("saves with stepId when provided (goal-level evidence omits goalId)", () => {
    renderScreen({ goalId: "goal_test_123", stepId: "step_test_456" });

    fireEvent.changeText(screen.getByLabelText("URL"), "https://example.com");
    fireEvent.press(screen.getByText("Save Link"));

    expect(mockCreateEvidence).toHaveBeenCalledWith({
      goalId: undefined,
      stepId: "step_test_456",
      type: EvidenceType.link,
      uri: "https://example.com",
      description: undefined,
    });
  });

  it("navigates back when Cancel is pressed", () => {
    renderScreen();

    fireEvent.press(screen.getByText("Cancel"));

    expect(mockGoBack).toHaveBeenCalled();
  });

  it("navigates back when back button is pressed", () => {
    renderScreen();

    fireEvent.press(screen.getByLabelText("Go back"));

    expect(mockGoBack).toHaveBeenCalled();
  });

  it("shows link preview when a valid URL is entered", () => {
    renderScreen();

    fireEvent.changeText(
      screen.getByLabelText("URL"),
      "https://example.com/path",
    );

    expect(
      screen.getByLabelText("Link preview: https://example.com/path"),
    ).toBeTruthy();
  });

  it("does not show link preview for invalid URL", () => {
    renderScreen();

    fireEvent.changeText(screen.getByLabelText("URL"), "not-a-url");

    expect(screen.queryByLabelText(/Link preview:/)).toBeNull();
  });
});
