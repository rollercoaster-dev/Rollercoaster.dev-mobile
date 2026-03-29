import React from "react";
import {
  renderWithProviders,
  screen,
  fireEvent,
} from "../../../__tests__/test-utils";
import { CaptureTextNote } from "../CaptureTextNote";

const mockGoBack = jest.fn();

jest.mock("@react-navigation/native", () => {
  const actual = jest.requireActual("@react-navigation/native");
  return {
    ...actual,
    useNavigation: () => ({
      goBack: mockGoBack,
      navigate: jest.fn(),
      setOptions: jest.fn(),
      addListener: jest.fn(() => jest.fn()),
      canGoBack: jest.fn(() => true),
    }),
  };
});

jest.mock("../../../db", () => ({
  createEvidence: jest.fn(),
  EvidenceType: {
    photo: "photo",
    screenshot: "screenshot",
    text: "text",
    voice_memo: "voice_memo",
    video: "video",
    link: "link",
    file: "file",
  },
  TEXT_EVIDENCE_PREFIX: "content:text;",
}));

const { createEvidence } = require("../../../db");

const defaultRoute = {
  key: "CaptureTextNote-test",
  name: "CaptureTextNote" as const,
  params: { goalId: "goal_test_123" },
};

const routeWithStep = {
  key: "CaptureTextNote-test",
  name: "CaptureTextNote" as const,
  params: { goalId: "goal_test_123", stepId: "step_test_456" },
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("CaptureTextNote", () => {
  it("renders the screen with header", () => {
    renderWithProviders(
      <CaptureTextNote route={defaultRoute} navigation={{} as any} />,
    );
    expect(screen.getByText("Write a Note")).toBeOnTheScreen();
  });

  it("renders text input with placeholder", () => {
    renderWithProviders(
      <CaptureTextNote route={defaultRoute} navigation={{} as any} />,
    );
    expect(screen.getByLabelText("Note content")).toBeOnTheScreen();
  });

  it("renders caption input", () => {
    renderWithProviders(
      <CaptureTextNote route={defaultRoute} navigation={{} as any} />,
    );
    expect(screen.getByText("Caption (optional)")).toBeOnTheScreen();
  });

  it("renders character counter starting at 0", () => {
    renderWithProviders(
      <CaptureTextNote route={defaultRoute} navigation={{} as any} />,
    );
    expect(screen.getByText("0/1000")).toBeOnTheScreen();
  });

  it("has go back button with accessibility label", () => {
    renderWithProviders(
      <CaptureTextNote route={defaultRoute} navigation={{} as any} />,
    );
    expect(screen.getByLabelText("Go back")).toBeOnTheScreen();
  });

  it("navigates back when back button is pressed", () => {
    renderWithProviders(
      <CaptureTextNote route={defaultRoute} navigation={{} as any} />,
    );
    fireEvent.press(screen.getByLabelText("Go back"));
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it("disables Save buttons when content is empty", () => {
    renderWithProviders(
      <CaptureTextNote route={defaultRoute} navigation={{} as any} />,
    );
    // There are two save buttons (top bar + footer)
    const saveButtons = screen.getAllByLabelText("Save Note");
    for (const btn of saveButtons) {
      expect(btn.props.accessibilityState?.disabled).toBe(true);
    }
  });

  it("enables Save buttons when content is entered", () => {
    renderWithProviders(
      <CaptureTextNote route={defaultRoute} navigation={{} as any} />,
    );
    fireEvent.changeText(
      screen.getByLabelText("Note content"),
      "My first note",
    );
    // The footer Save Note button should now be enabled
    const saveButtons = screen.getAllByLabelText("Save Note");
    const enabledButton = saveButtons.find(
      (btn) => btn.props.accessibilityState?.disabled !== true,
    );
    expect(enabledButton).toBeDefined();
  });

  it("updates character counter as user types", () => {
    renderWithProviders(
      <CaptureTextNote route={defaultRoute} navigation={{} as any} />,
    );
    fireEvent.changeText(screen.getByLabelText("Note content"), "Hello");
    expect(screen.getByText("5/1000")).toBeOnTheScreen();
  });

  it("saves evidence with goal attachment when no stepId", () => {
    renderWithProviders(
      <CaptureTextNote route={defaultRoute} navigation={{} as any} />,
    );
    fireEvent.changeText(
      screen.getByLabelText("Note content"),
      "My learning note",
    );
    fireEvent.press(screen.getByText("Save Note"));

    expect(createEvidence).toHaveBeenCalledWith({
      goalId: "goal_test_123",
      stepId: undefined,
      type: "text",
      uri: "content:text;My learning note",
      description: undefined,
    });
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it("saves evidence with step attachment when stepId is provided", () => {
    renderWithProviders(
      <CaptureTextNote route={routeWithStep} navigation={{} as any} />,
    );
    fireEvent.changeText(screen.getByLabelText("Note content"), "Step note");
    fireEvent.press(screen.getByText("Save Note"));

    expect(createEvidence).toHaveBeenCalledWith({
      goalId: undefined,
      stepId: "step_test_456",
      type: "text",
      uri: "content:text;Step note",
      description: undefined,
    });
  });

  it("includes caption as description when provided", () => {
    renderWithProviders(
      <CaptureTextNote route={defaultRoute} navigation={{} as any} />,
    );
    fireEvent.changeText(
      screen.getByLabelText("Note content"),
      "My note content",
    );
    fireEvent.changeText(
      screen.getByLabelText("Caption (optional)"),
      "My caption",
    );
    fireEvent.press(screen.getByText("Save Note"));

    expect(createEvidence).toHaveBeenCalledWith(
      expect.objectContaining({
        description: "My caption",
      }),
    );
  });

  it("trims content before saving", () => {
    renderWithProviders(
      <CaptureTextNote route={defaultRoute} navigation={{} as any} />,
    );
    fireEvent.changeText(
      screen.getByLabelText("Note content"),
      "  trimmed note  ",
    );
    fireEvent.press(screen.getByText("Save Note"));

    expect(createEvidence).toHaveBeenCalledWith(
      expect.objectContaining({
        uri: "content:text;trimmed note",
      }),
    );
  });

  it("does not save when content is only whitespace", () => {
    renderWithProviders(
      <CaptureTextNote route={defaultRoute} navigation={{} as any} />,
    );
    fireEvent.changeText(screen.getByLabelText("Note content"), "   ");
    // Character counter should show 0 (trimmed)
    expect(screen.getByText("0/1000")).toBeOnTheScreen();
    expect(createEvidence).not.toHaveBeenCalled();
  });

  it("has accessible character count label", () => {
    renderWithProviders(
      <CaptureTextNote route={defaultRoute} navigation={{} as any} />,
    );
    fireEvent.changeText(screen.getByLabelText("Note content"), "Hello");
    expect(
      screen.getByLabelText("5 of 1000 characters used"),
    ).toBeOnTheScreen();
  });
});
