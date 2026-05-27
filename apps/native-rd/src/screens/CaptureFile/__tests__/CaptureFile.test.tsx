import React from "react";
import { Alert } from "react-native";
import {
  renderWithProviders,
  screen,
  fireEvent,
  waitFor,
} from "../../../__tests__/test-utils";
import { i18n } from "../../../i18n";
import { CaptureFile } from "../CaptureFile";

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

const mockGetDocumentAsync = jest.fn();
jest.mock("expo-document-picker", () => ({
  getDocumentAsync: (...args: unknown[]) => mockGetDocumentAsync(...args),
}));

const mockSaveFileToAppStorage = jest.fn();
const mockValidateFile = jest.fn();
jest.mock("../../../utils/fileStorage", () => ({
  saveFileToAppStorage: (...args: unknown[]) =>
    mockSaveFileToAppStorage(...args),
  validateFile: (...args: unknown[]) => mockValidateFile(...args),
  MAX_FILE_SIZE_LABEL: "50 MB",
  ALLOWED_MIME_TYPES: ["application/pdf", "image/jpeg"],
}));

const mockCreateEvidence = jest.fn();
jest.mock("../../../db", () => ({
  EvidenceType: { file: "file" },
  createEvidence: (...args: unknown[]) => mockCreateEvidence(...args),
}));

const defaultRoute = {
  params: { goalId: "goal-123" },
  key: "CaptureFile",
  name: "CaptureFile" as const,
};

function renderScreen(params?: { goalId: string; stepId?: string }) {
  const route = params ? { ...defaultRoute, params } : defaultRoute;
  return renderWithProviders(
    <CaptureFile route={route} navigation={{} as never} />,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockSaveFileToAppStorage.mockReturnValue("file:///saved/doc.pdf");
  mockValidateFile.mockReturnValue(null);
});

describe("CaptureFile", () => {
  it("renders title and Choose File button", () => {
    renderScreen();
    expect(screen.getByText(i18n.t("captureFile:title"))).toBeTruthy();
    expect(screen.getByText(i18n.t("captureFile:actions.choose"))).toBeTruthy();
    expect(
      screen.getByText(i18n.t("captureFile:description", { maxSize: "50 MB" })),
    ).toBeTruthy();
  });

  it("picks file and creates evidence with goalId", async () => {
    mockGetDocumentAsync.mockResolvedValue({
      canceled: false,
      assets: [
        {
          uri: "file:///tmp/doc.pdf",
          name: "doc.pdf",
          mimeType: "application/pdf",
          size: 1024,
        },
      ],
    });
    renderScreen();

    fireEvent.press(screen.getByText(i18n.t("captureFile:actions.choose")));

    await waitFor(() => {
      expect(mockGetDocumentAsync).toHaveBeenCalled();
      expect(mockSaveFileToAppStorage).toHaveBeenCalledWith(
        "file:///tmp/doc.pdf",
        "doc.pdf",
      );
      expect(mockCreateEvidence).toHaveBeenCalledWith({
        goalId: "goal-123",
        stepId: undefined,
        type: "file",
        uri: "file:///saved/doc.pdf",
        metadata: JSON.stringify({
          filename: "doc.pdf",
          mimeType: "application/pdf",
          size: 1024,
        }),
      });
      expect(mockGoBack).toHaveBeenCalled();
    });
  });

  it("creates evidence with stepId when stepId provided", async () => {
    mockGetDocumentAsync.mockResolvedValue({
      canceled: false,
      assets: [
        {
          uri: "file:///tmp/doc.pdf",
          name: "doc.pdf",
          mimeType: "application/pdf",
          size: 1024,
        },
      ],
    });
    renderScreen({ goalId: "goal-123", stepId: "step-456" });

    fireEvent.press(screen.getByText(i18n.t("captureFile:actions.choose")));

    await waitFor(() => {
      expect(mockCreateEvidence).toHaveBeenCalledWith({
        goalId: undefined,
        stepId: "step-456",
        type: "file",
        uri: "file:///saved/doc.pdf",
        metadata: expect.any(String),
      });
    });
  });

  it("does not create evidence when picker is cancelled", async () => {
    mockGetDocumentAsync.mockResolvedValue({ canceled: true });
    renderScreen();

    fireEvent.press(screen.getByText(i18n.t("captureFile:actions.choose")));

    await waitFor(() => {
      expect(mockGetDocumentAsync).toHaveBeenCalled();
    });
    expect(mockCreateEvidence).not.toHaveBeenCalled();
    expect(mockGoBack).not.toHaveBeenCalled();
  });

  it("shows alert when file validation fails", async () => {
    const alertSpy = jest.spyOn(Alert, "alert");
    mockValidateFile.mockReturnValue(
      "File is too large. Maximum size is 50 MB.",
    );
    mockGetDocumentAsync.mockResolvedValue({
      canceled: false,
      assets: [
        {
          uri: "file:///tmp/huge.pdf",
          name: "huge.pdf",
          mimeType: "application/pdf",
          size: 999999999,
        },
      ],
    });
    renderScreen();

    fireEvent.press(screen.getByText(i18n.t("captureFile:actions.choose")));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        i18n.t("captureFile:errors.invalidFileTitle"),
        "File is too large. Maximum size is 50 MB.",
      );
    });
    expect(mockSaveFileToAppStorage).not.toHaveBeenCalled();
    expect(mockCreateEvidence).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  it("shows alert and does not navigate when save fails", async () => {
    const alertSpy = jest.spyOn(Alert, "alert");
    mockSaveFileToAppStorage.mockImplementation(() => {
      throw new Error("disk full");
    });
    mockGetDocumentAsync.mockResolvedValue({
      canceled: false,
      assets: [
        {
          uri: "file:///tmp/doc.pdf",
          name: "doc.pdf",
          mimeType: "application/pdf",
          size: 1024,
        },
      ],
    });
    renderScreen();

    fireEvent.press(screen.getByText(i18n.t("captureFile:actions.choose")));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        i18n.t("captureFile:errors.saveFailedTitle"),
        i18n.t("captureFile:errors.saveFailedMessage"),
      );
    });
    expect(mockGoBack).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  it("navigates back when back button pressed", () => {
    renderScreen();

    fireEvent.press(screen.getByLabelText("Go back"));

    expect(mockGoBack).toHaveBeenCalled();
  });

  describe("pseudo locale", () => {
    afterEach(async () => {
      if (i18n.language !== "en") await i18n.changeLanguage("en");
    });

    // Representative spread: header, headline body, CTA button, and the
    // interpolated description. Catches missed t() calls on the four
    // visible Card surfaces.
    it.each([
      "captureFile:title",
      "captureFile:heading",
      "captureFile:actions.choose",
    ] as const)(
      "renders %s as bracketed copy under pseudo locale",
      async (key) => {
        await i18n.changeLanguage("pseudo");
        renderScreen();
        const pseudo = i18n.t(key);
        expect(pseudo.startsWith("[")).toBe(true);
        expect(screen.getByText(pseudo)).toBeOnTheScreen();
      },
    );

    it("renders interpolated description under pseudo locale", async () => {
      await i18n.changeLanguage("pseudo");
      renderScreen();
      const pseudo = i18n.t("captureFile:description", { maxSize: "50 MB" });
      expect(pseudo.startsWith("[")).toBe(true);
      expect(pseudo).toContain("50 MB");
      expect(screen.getByText(pseudo)).toBeOnTheScreen();
    });
  });
});
