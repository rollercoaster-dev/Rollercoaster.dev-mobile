import React from "react";
import {
  renderWithProviders,
  screen,
  fireEvent,
  waitFor,
} from "../../../__tests__/test-utils";
import { i18n } from "../../../i18n";
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

    expect(screen.getByText(i18n.t("captureLink:header"))).toBeTruthy();
    expect(
      screen.getByLabelText(i18n.t("captureLink:urlInput.label")),
    ).toBeTruthy();
    expect(
      screen.getByLabelText(i18n.t("captureLink:captionInput.label")),
    ).toBeTruthy();
    expect(screen.getByText(i18n.t("captureLink:actions.save"))).toBeTruthy();
    expect(screen.getByText(i18n.t("common:actions.cancel"))).toBeTruthy();
  });

  it("shows validation error for empty URL on save", () => {
    renderScreen();

    fireEvent.press(screen.getByText(i18n.t("captureLink:actions.save")));

    expect(
      screen.getByText(i18n.t("captureLink:validation.urlRequired")),
    ).toBeTruthy();
    expect(mockCreateEvidence).not.toHaveBeenCalled();
  });

  it("shows validation error for invalid URL", () => {
    renderScreen();

    fireEvent.changeText(
      screen.getByLabelText(i18n.t("captureLink:urlInput.label")),
      "not-a-url",
    );
    fireEvent.press(screen.getByText(i18n.t("captureLink:actions.save")));

    expect(
      screen.getByText(i18n.t("captureLink:validation.urlInvalid")),
    ).toBeTruthy();
    expect(mockCreateEvidence).not.toHaveBeenCalled();
  });

  it("clears validation error when user types", () => {
    renderScreen();

    // Trigger the error first
    fireEvent.press(screen.getByText(i18n.t("captureLink:actions.save")));
    expect(
      screen.getByText(i18n.t("captureLink:validation.urlRequired")),
    ).toBeTruthy();

    // Start typing to clear error
    fireEvent.changeText(
      screen.getByLabelText(i18n.t("captureLink:urlInput.label")),
      "h",
    );

    expect(
      screen.queryByText(i18n.t("captureLink:validation.urlRequired")),
    ).toBeNull();
  });

  it("saves link evidence with goalId and navigates back", () => {
    renderScreen();

    fireEvent.changeText(
      screen.getByLabelText(i18n.t("captureLink:urlInput.label")),
      "https://example.com",
    );
    fireEvent.press(screen.getByText(i18n.t("captureLink:actions.save")));

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
      screen.getByLabelText(i18n.t("captureLink:urlInput.label")),
      "https://example.com/article",
    );
    fireEvent.changeText(
      screen.getByLabelText(i18n.t("captureLink:captionInput.label")),
      "Great article",
    );
    fireEvent.press(screen.getByText(i18n.t("captureLink:actions.save")));

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

    fireEvent.changeText(
      screen.getByLabelText(i18n.t("captureLink:urlInput.label")),
      "https://example.com",
    );
    fireEvent.press(screen.getByText(i18n.t("captureLink:actions.save")));

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

    fireEvent.press(screen.getByText(i18n.t("common:actions.cancel")));

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
      screen.getByLabelText(i18n.t("captureLink:urlInput.label")),
      "https://example.com/path",
    );

    expect(
      screen.getByLabelText(
        i18n.t("captureLink:preview.a11y", {
          url: "https://example.com/path",
        }),
      ),
    ).toBeTruthy();
  });

  it("does not show link preview for invalid URL", () => {
    renderScreen();

    fireEvent.changeText(
      screen.getByLabelText(i18n.t("captureLink:urlInput.label")),
      "not-a-url",
    );

    expect(screen.queryByLabelText(/Link preview:/)).toBeNull();
  });

  describe("pseudo locale", () => {
    afterEach(async () => {
      if (i18n.language !== "en") await i18n.changeLanguage("en");
    });

    // Representative spread: header (text), URL input label (a11y), save
    // button (text), and the cross-namespace Cancel button (text, common).
    // A reverted t() call on any of these surfaces shows up as plain English
    // under pseudo.
    it.each([
      { key: "captureLink:header", query: "text" },
      { key: "captureLink:urlInput.label", query: "label" },
      { key: "captureLink:actions.save", query: "text" },
      { key: "common:actions.cancel", query: "text" },
    ] as const)(
      "renders $key as bracketed copy under pseudo locale",
      async ({ key, query }) => {
        await i18n.changeLanguage("pseudo");
        renderScreen();
        const pseudo = i18n.t(key);
        expect(pseudo.startsWith("[")).toBe(true);
        const get = query === "text" ? screen.getByText : screen.getByLabelText;
        expect(get(pseudo)).toBeOnTheScreen();
      },
    );

    it("renders interpolated preview.a11y under pseudo locale", async () => {
      await i18n.changeLanguage("pseudo");
      renderScreen();
      fireEvent.changeText(
        screen.getByLabelText(i18n.t("captureLink:urlInput.label")),
        "https://example.com/path",
      );
      const pseudo = i18n.t("captureLink:preview.a11y", {
        url: "https://example.com/path",
      });
      expect(pseudo.startsWith("[")).toBe(true);
      expect(pseudo).toContain("https://example.com/path");
      expect(screen.getByLabelText(pseudo)).toBeOnTheScreen();
    });
  });
});
