import React from "react";
import {
  renderWithProviders,
  screen,
  fireEvent,
} from "../../../__tests__/test-utils";
import { i18n } from "../../../i18n";
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
    expect(screen.getByText(i18n.t("captureText:header"))).toBeOnTheScreen();
  });

  it("renders text input with placeholder", () => {
    renderWithProviders(
      <CaptureTextNote route={defaultRoute} navigation={{} as any} />,
    );
    expect(
      screen.getByLabelText(i18n.t("captureText:input.label")),
    ).toBeOnTheScreen();
  });

  it("renders caption input", () => {
    renderWithProviders(
      <CaptureTextNote route={defaultRoute} navigation={{} as any} />,
    );
    expect(
      screen.getByText(i18n.t("captureText:caption.label")),
    ).toBeOnTheScreen();
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

  it("disables Save button when content is empty", () => {
    renderWithProviders(
      <CaptureTextNote route={defaultRoute} navigation={{} as any} />,
    );
    const saveButton = screen.getByLabelText(
      i18n.t("captureText:actions.save"),
    );
    expect(saveButton.props.accessibilityState?.disabled).toBe(true);
  });

  it("enables Save button when content is entered", () => {
    renderWithProviders(
      <CaptureTextNote route={defaultRoute} navigation={{} as any} />,
    );
    fireEvent.changeText(
      screen.getByLabelText(i18n.t("captureText:input.label")),
      "My first note",
    );
    const saveButton = screen.getByLabelText(
      i18n.t("captureText:actions.save"),
    );
    expect(saveButton.props.accessibilityState?.disabled).not.toBe(true);
  });

  it("updates character counter as user types", () => {
    renderWithProviders(
      <CaptureTextNote route={defaultRoute} navigation={{} as any} />,
    );
    fireEvent.changeText(
      screen.getByLabelText(i18n.t("captureText:input.label")),
      "Hello",
    );
    expect(screen.getByText("5/1000")).toBeOnTheScreen();
  });

  it("saves evidence with goal attachment when no stepId", () => {
    renderWithProviders(
      <CaptureTextNote route={defaultRoute} navigation={{} as any} />,
    );
    fireEvent.changeText(
      screen.getByLabelText(i18n.t("captureText:input.label")),
      "My learning note",
    );
    fireEvent.press(screen.getByText(i18n.t("captureText:actions.save")));

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
    fireEvent.changeText(
      screen.getByLabelText(i18n.t("captureText:input.label")),
      "Step note",
    );
    fireEvent.press(screen.getByText(i18n.t("captureText:actions.save")));

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
      screen.getByLabelText(i18n.t("captureText:input.label")),
      "My note content",
    );
    fireEvent.changeText(
      screen.getByLabelText(i18n.t("captureText:caption.label")),
      "My caption",
    );
    fireEvent.press(screen.getByText(i18n.t("captureText:actions.save")));

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
      screen.getByLabelText(i18n.t("captureText:input.label")),
      "  trimmed note  ",
    );
    fireEvent.press(screen.getByText(i18n.t("captureText:actions.save")));

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
    fireEvent.changeText(
      screen.getByLabelText(i18n.t("captureText:input.label")),
      "   ",
    );
    // Character counter should show 0 (trimmed)
    expect(screen.getByText("0/1000")).toBeOnTheScreen();
    expect(createEvidence).not.toHaveBeenCalled();
  });

  it("has accessible character count label", () => {
    renderWithProviders(
      <CaptureTextNote route={defaultRoute} navigation={{} as any} />,
    );
    fireEvent.changeText(
      screen.getByLabelText(i18n.t("captureText:input.label")),
      "Hello",
    );
    expect(
      screen.getByLabelText(
        i18n.t("captureText:charCount.a11y", { count: 5, max: 1000 }),
      ),
    ).toBeOnTheScreen();
  });

  describe("pseudo locale", () => {
    afterEach(async () => {
      if (i18n.language !== "en") await i18n.changeLanguage("en");
    });

    // Representative spread: header (text), input.label (a11y), and the
    // save-button label (text). Covers the three visible surfaces a missed
    // t() call would leave in plain English under pseudo.
    it.each([
      { key: "captureText:header", query: "text" },
      { key: "captureText:input.label", query: "label" },
      { key: "captureText:actions.save", query: "text" },
    ] as const)(
      "renders $key as bracketed copy under pseudo locale",
      async ({ key, query }) => {
        await i18n.changeLanguage("pseudo");
        renderWithProviders(
          <CaptureTextNote route={defaultRoute} navigation={{} as any} />,
        );
        const pseudo = i18n.t(key);
        expect(pseudo.startsWith("[")).toBe(true);
        const get = query === "text" ? screen.getByText : screen.getByLabelText;
        expect(get(pseudo)).toBeOnTheScreen();
      },
    );

    it("renders interpolated charCount.a11y under pseudo locale", async () => {
      await i18n.changeLanguage("pseudo");
      renderWithProviders(
        <CaptureTextNote route={defaultRoute} navigation={{} as any} />,
      );
      fireEvent.changeText(
        screen.getByLabelText(i18n.t("captureText:input.label")),
        "Hello",
      );
      const pseudo = i18n.t("captureText:charCount.a11y", {
        count: 5,
        max: 1000,
      });
      expect(pseudo.startsWith("[")).toBe(true);
      expect(screen.getByLabelText(pseudo)).toBeOnTheScreen();
    });
  });
});
