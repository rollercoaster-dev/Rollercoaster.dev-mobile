import React from "react";
import { Alert } from "react-native";
import {
  renderWithProviders,
  screen,
  fireEvent,
  waitFor,
} from "../../../__tests__/test-utils";
import { i18n } from "../../../i18n";
import { CapturePhoto } from "../CapturePhoto";

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

const mockLaunchCameraAsync = jest.fn();
const mockLaunchImageLibraryAsync = jest.fn();
const mockRequestCameraPermissionsAsync = jest.fn();
const mockRequestMediaLibraryPermissionsAsync = jest.fn();

jest.mock("expo-image-picker", () => ({
  launchCameraAsync: (...args: unknown[]) => mockLaunchCameraAsync(...args),
  launchImageLibraryAsync: (...args: unknown[]) =>
    mockLaunchImageLibraryAsync(...args),
  requestCameraPermissionsAsync: () => mockRequestCameraPermissionsAsync(),
  requestMediaLibraryPermissionsAsync: () =>
    mockRequestMediaLibraryPermissionsAsync(),
}));

const mockSaveImageToAppStorage = jest.fn();
jest.mock("../../../utils/imageStorage", () => ({
  saveImageToAppStorage: (...args: unknown[]) =>
    mockSaveImageToAppStorage(...args),
}));

const mockCreateEvidence = jest.fn();
jest.mock("../../../db", () => ({
  EvidenceType: { photo: "photo" },
  createEvidence: (...args: unknown[]) => mockCreateEvidence(...args),
}));

const defaultRoute = {
  params: { goalId: "goal-123" },
  key: "CapturePhoto",
  name: "CapturePhoto" as const,
};

function renderScreen(params?: { goalId: string; stepId?: string }) {
  const route = params ? { ...defaultRoute, params } : defaultRoute;
  return renderWithProviders(
    <CapturePhoto route={route} navigation={{} as never} />,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockRequestCameraPermissionsAsync.mockResolvedValue({ granted: true });
  mockRequestMediaLibraryPermissionsAsync.mockResolvedValue({ granted: true });
  mockSaveImageToAppStorage.mockReturnValue("file:///saved/photo.jpg");
});

describe("CapturePhoto", () => {
  it("renders title and both buttons", () => {
    renderScreen();
    expect(screen.getByText(i18n.t("capturePhoto:title"))).toBeTruthy();
    expect(
      screen.getByText(i18n.t("capturePhoto:actions.takePhoto")),
    ).toBeTruthy();
    expect(
      screen.getByText(i18n.t("capturePhoto:actions.chooseFromLibrary")),
    ).toBeTruthy();
  });

  it("launches camera when Take Photo pressed", async () => {
    mockLaunchCameraAsync.mockResolvedValue({ canceled: true });
    renderScreen();

    fireEvent.press(screen.getByText(i18n.t("capturePhoto:actions.takePhoto")));

    await waitFor(() => {
      expect(mockRequestCameraPermissionsAsync).toHaveBeenCalled();
      expect(mockLaunchCameraAsync).toHaveBeenCalled();
    });
  });

  it("launches library when Choose from Library pressed", async () => {
    mockLaunchImageLibraryAsync.mockResolvedValue({ canceled: true });
    renderScreen();

    fireEvent.press(
      screen.getByText(i18n.t("capturePhoto:actions.chooseFromLibrary")),
    );

    await waitFor(() => {
      expect(mockRequestMediaLibraryPermissionsAsync).toHaveBeenCalled();
      expect(mockLaunchImageLibraryAsync).toHaveBeenCalled();
    });
  });

  it("creates evidence with goalId and camera source when photo taken", async () => {
    mockLaunchCameraAsync.mockResolvedValue({
      canceled: false,
      assets: [{ uri: "file:///tmp/photo.jpg" }],
    });
    renderScreen();

    fireEvent.press(screen.getByText(i18n.t("capturePhoto:actions.takePhoto")));

    await waitFor(() => {
      expect(mockSaveImageToAppStorage).toHaveBeenCalledWith(
        "file:///tmp/photo.jpg",
      );
      expect(mockCreateEvidence).toHaveBeenCalledWith(
        expect.objectContaining({
          goalId: "goal-123",
          type: "photo",
          uri: "file:///saved/photo.jpg",
          metadata: expect.stringContaining('"source":"camera"'),
        }),
      );
      expect(mockGoBack).toHaveBeenCalled();
    });
  });

  it("creates evidence with library source when picked from library", async () => {
    mockLaunchImageLibraryAsync.mockResolvedValue({
      canceled: false,
      assets: [{ uri: "file:///tmp/lib.jpg" }],
    });
    renderScreen();

    fireEvent.press(
      screen.getByText(i18n.t("capturePhoto:actions.chooseFromLibrary")),
    );

    await waitFor(() => {
      expect(mockCreateEvidence).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "photo",
          metadata: expect.stringContaining('"source":"library"'),
        }),
      );
    });
  });

  it("creates evidence with stepId when stepId provided", async () => {
    mockLaunchCameraAsync.mockResolvedValue({
      canceled: false,
      assets: [{ uri: "file:///tmp/photo.jpg" }],
    });
    renderScreen({ goalId: "goal-123", stepId: "step-456" });

    fireEvent.press(screen.getByText(i18n.t("capturePhoto:actions.takePhoto")));

    await waitFor(() => {
      expect(mockCreateEvidence).toHaveBeenCalledWith(
        expect.objectContaining({
          stepId: "step-456",
          type: "photo",
          uri: "file:///saved/photo.jpg",
        }),
      );
    });
  });

  it("does not create evidence when camera picker cancelled", async () => {
    mockLaunchCameraAsync.mockResolvedValue({ canceled: true });
    renderScreen();

    fireEvent.press(screen.getByText(i18n.t("capturePhoto:actions.takePhoto")));

    await waitFor(() => {
      expect(mockLaunchCameraAsync).toHaveBeenCalled();
    });
    expect(mockCreateEvidence).not.toHaveBeenCalled();
    expect(mockGoBack).not.toHaveBeenCalled();
  });

  it("does not launch camera when permission denied", async () => {
    mockRequestCameraPermissionsAsync.mockResolvedValue({ granted: false });
    renderScreen();

    fireEvent.press(screen.getByText(i18n.t("capturePhoto:actions.takePhoto")));

    await waitFor(() => {
      expect(mockRequestCameraPermissionsAsync).toHaveBeenCalled();
    });
    expect(mockLaunchCameraAsync).not.toHaveBeenCalled();
  });

  it("does not launch library when permission denied", async () => {
    mockRequestMediaLibraryPermissionsAsync.mockResolvedValue({
      granted: false,
    });
    renderScreen();

    fireEvent.press(
      screen.getByText(i18n.t("capturePhoto:actions.chooseFromLibrary")),
    );

    await waitFor(() => {
      expect(mockRequestMediaLibraryPermissionsAsync).toHaveBeenCalled();
    });
    expect(mockLaunchImageLibraryAsync).not.toHaveBeenCalled();
  });

  it("shows alert and does not navigate when save fails", async () => {
    const alertSpy = jest.spyOn(Alert, "alert");
    mockSaveImageToAppStorage.mockImplementation(() => {
      throw new Error("disk full");
    });
    mockLaunchCameraAsync.mockResolvedValue({
      canceled: false,
      assets: [{ uri: "file:///tmp/photo.jpg" }],
    });
    renderScreen();

    fireEvent.press(screen.getByText(i18n.t("capturePhoto:actions.takePhoto")));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        i18n.t("capturePhoto:errors.saveFailedTitle"),
        i18n.t("capturePhoto:errors.saveFailedMessage"),
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
    beforeAll(async () => {
      await i18n.changeLanguage("pseudo");
    });
    afterAll(async () => {
      await i18n.changeLanguage("en");
    });

    it("renders pseudo-localized title and buttons", () => {
      renderScreen();
      const pseudoTitle = i18n.t("capturePhoto:title");
      expect(pseudoTitle).not.toBe("Capture Photo");
      expect(screen.getByText(pseudoTitle)).toBeTruthy();
      expect(
        screen.getByText(i18n.t("capturePhoto:actions.takePhoto")),
      ).toBeTruthy();
    });
  });
});
