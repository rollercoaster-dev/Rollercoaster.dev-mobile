import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react-native";
import { Alert } from "react-native";

import { CaptureVideoScreen } from "../CaptureVideoScreen";
import { useCameraPermissions, useMicrophonePermissions } from "expo-camera";

// --- Mocks ---

const mockGoBack = jest.fn();
jest.mock("@react-navigation/native", () => ({
  ...jest.requireActual("@react-navigation/native"),
  useNavigation: () => ({
    goBack: mockGoBack,
    navigate: jest.fn(),
  }),
}));

const mockRecordAsync = jest.fn();
const mockStopRecording = jest.fn();

jest.mock("expo-camera", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require("react");
  const MockCameraView = React.forwardRef(function MockCameraView(
    props: Record<string, unknown>,
    ref: React.Ref<unknown>,
  ) {
    React.useImperativeHandle(ref, () => ({
      recordAsync: mockRecordAsync,
      stopRecording: mockStopRecording,
    }));
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { View } = require("react-native");
    return <View testID="camera-view" {...props} />;
  });
  return {
    CameraView: MockCameraView,
    useCameraPermissions: jest.fn(() => [{ granted: true }, jest.fn()]),
    useMicrophonePermissions: jest.fn(() => [{ granted: true }, jest.fn()]),
  };
});

jest.mock("expo-video", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View } = require("react-native");
  return {
    useVideoPlayer: jest.fn(() => ({
      play: jest.fn(),
      pause: jest.fn(),
      loop: false,
    })),
    VideoView: (props: Record<string, unknown>) => (
      <View testID="video-player" {...props} />
    ),
  };
});

const mockRequestMediaLibraryPermissionsAsync = jest.fn();
const mockLaunchImageLibraryAsync = jest.fn();

jest.mock("expo-image-picker", () => ({
  requestMediaLibraryPermissionsAsync: (...args: unknown[]) =>
    mockRequestMediaLibraryPermissionsAsync(...args),
  launchImageLibraryAsync: (...args: unknown[]) =>
    mockLaunchImageLibraryAsync(...args),
}));

const mockMoveVideo = jest.fn();
const mockCopyVideo = jest.fn();
jest.mock("../../../utils/videoStorage", () => ({
  moveVideoToAppStorage: (uri: string) => mockMoveVideo(uri),
  copyVideoToAppStorage: (uri: string) => mockCopyVideo(uri),
}));

const mockCreateEvidence = jest.fn();
jest.mock("../../../db", () => ({
  createEvidence: (...args: unknown[]) => mockCreateEvidence(...args),
  EvidenceType: {
    photo: "photo",
    text: "text",
    voice_memo: "voice_memo",
    video: "video",
    link: "link",
    file: "file",
  },
}));

const defaultRoute = {
  key: "CaptureVideo",
  name: "CaptureVideo" as const,
  params: { goalId: "goal-123" },
};

beforeEach(() => {
  jest.clearAllMocks();
  mockMoveVideo.mockReturnValue(
    "file:///mock/documents/evidence/videos/cam.mp4",
  );
  mockCopyVideo.mockReturnValue(
    "file:///mock/documents/evidence/videos/lib.mp4",
  );
});

describe("CaptureVideoScreen — chooser mode", () => {
  it("renders both entry-point buttons", () => {
    render(
      <CaptureVideoScreen
        route={defaultRoute}
        navigation={undefined as never}
      />,
    );

    expect(screen.getByText("Add a video")).toBeTruthy();
    expect(screen.getByText("Record Video")).toBeTruthy();
    expect(screen.getByText("Choose from Library")).toBeTruthy();
  });

  it("navigates back when back button is pressed from chooser", () => {
    render(
      <CaptureVideoScreen
        route={defaultRoute}
        navigation={undefined as never}
      />,
    );

    fireEvent.press(screen.getByLabelText("Go back"));
    expect(mockGoBack).toHaveBeenCalled();
  });

  it("enters recorder mode when Record Video is tapped", () => {
    render(
      <CaptureVideoScreen
        route={defaultRoute}
        navigation={undefined as never}
      />,
    );

    fireEvent.press(screen.getByText("Record Video"));
    expect(screen.getByTestId("camera-view")).toBeTruthy();
    expect(screen.getByLabelText("Start recording")).toBeTruthy();
  });
});

describe("CaptureVideoScreen — recorder mode", () => {
  it("shows permission request when camera permission not granted", () => {
    (useCameraPermissions as jest.Mock).mockReturnValueOnce([
      { granted: false },
      jest.fn(),
    ]);

    render(
      <CaptureVideoScreen
        route={defaultRoute}
        navigation={undefined as never}
      />,
    );

    fireEvent.press(screen.getByText("Record Video"));
    expect(screen.getByText("Camera Access Needed")).toBeTruthy();
    expect(screen.getByText("Grant Access")).toBeTruthy();
  });

  it("shows permission request when mic permission not granted", () => {
    (useMicrophonePermissions as jest.Mock).mockReturnValueOnce([
      { granted: false },
      jest.fn(),
    ]);

    render(
      <CaptureVideoScreen
        route={defaultRoute}
        navigation={undefined as never}
      />,
    );

    fireEvent.press(screen.getByText("Record Video"));
    expect(screen.getByText("Camera Access Needed")).toBeTruthy();
  });

  it("shows timer at 00:00 initially in recorder", () => {
    render(
      <CaptureVideoScreen
        route={defaultRoute}
        navigation={undefined as never}
      />,
    );

    fireEvent.press(screen.getByText("Record Video"));
    expect(screen.getByText("00:00")).toBeTruthy();
  });

  it("starts recording with 60s max duration", async () => {
    mockRecordAsync.mockResolvedValueOnce({ uri: "/tmp/video.mp4" });

    render(
      <CaptureVideoScreen
        route={defaultRoute}
        navigation={undefined as never}
      />,
    );

    fireEvent.press(screen.getByText("Record Video"));

    await act(async () => {
      fireEvent.press(screen.getByLabelText("Start recording"));
    });

    expect(mockRecordAsync).toHaveBeenCalledWith({ maxDuration: 60 });
  });

  it("saves recorded video with camera source metadata", async () => {
    mockRecordAsync.mockResolvedValueOnce({ uri: "/tmp/video.mp4" });

    render(
      <CaptureVideoScreen
        route={defaultRoute}
        navigation={undefined as never}
      />,
    );

    fireEvent.press(screen.getByText("Record Video"));

    await act(async () => {
      fireEvent.press(screen.getByLabelText("Start recording"));
    });

    await act(async () => {
      fireEvent.press(screen.getByText("Use Video"));
    });

    expect(mockMoveVideo).toHaveBeenCalledWith("/tmp/video.mp4");
    expect(mockCopyVideo).not.toHaveBeenCalled();

    const evidenceCall = mockCreateEvidence.mock.calls[0][0];
    expect(evidenceCall.type).toBe("video");
    expect(evidenceCall.uri).toBe(
      "file:///mock/documents/evidence/videos/cam.mp4",
    );
    const metadata = JSON.parse(evidenceCall.metadata);
    expect(metadata.source).toBe("camera");
    expect(metadata.facing).toBe("back");
    expect(typeof metadata.capturedAt).toBe("string");
    expect(mockGoBack).toHaveBeenCalled();
  });

  it("disables flip camera while recording", async () => {
    mockRecordAsync.mockImplementationOnce(() => new Promise(() => {}));

    render(
      <CaptureVideoScreen
        route={defaultRoute}
        navigation={undefined as never}
      />,
    );

    fireEvent.press(screen.getByText("Record Video"));

    expect(
      screen.getByLabelText("Switch to front camera").props.accessibilityState
        ?.disabled,
    ).not.toBe(true);

    await act(async () => {
      fireEvent.press(screen.getByLabelText("Start recording"));
    });

    expect(
      screen.getByLabelText("Switch to front camera").props.accessibilityState
        ?.disabled,
    ).toBe(true);
  });
});

describe("CaptureVideoScreen — library upload", () => {
  it("denies access when library permission is not granted", async () => {
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    mockRequestMediaLibraryPermissionsAsync.mockResolvedValueOnce({
      granted: false,
    });

    render(
      <CaptureVideoScreen
        route={defaultRoute}
        navigation={undefined as never}
      />,
    );

    await act(async () => {
      fireEvent.press(screen.getByText("Choose from Library"));
    });

    expect(alertSpy).toHaveBeenCalledWith(
      "Photo library access needed",
      expect.any(String),
    );
    expect(mockLaunchImageLibraryAsync).not.toHaveBeenCalled();
    expect(mockCreateEvidence).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  it("returns to chooser when user cancels the picker", async () => {
    mockRequestMediaLibraryPermissionsAsync.mockResolvedValueOnce({
      granted: true,
    });
    mockLaunchImageLibraryAsync.mockResolvedValueOnce({ canceled: true });

    render(
      <CaptureVideoScreen
        route={defaultRoute}
        navigation={undefined as never}
      />,
    );

    await act(async () => {
      fireEvent.press(screen.getByText("Choose from Library"));
    });

    // Still on chooser
    expect(screen.getByText("Add a video")).toBeTruthy();
    expect(mockCreateEvidence).not.toHaveBeenCalled();
  });

  it("saves picked video with library source metadata", async () => {
    mockRequestMediaLibraryPermissionsAsync.mockResolvedValueOnce({
      granted: true,
    });
    mockLaunchImageLibraryAsync.mockResolvedValueOnce({
      canceled: false,
      assets: [{ uri: "file:///library/clip.mov", duration: 12500 }],
    });

    render(
      <CaptureVideoScreen
        route={defaultRoute}
        navigation={undefined as never}
      />,
    );

    await act(async () => {
      fireEvent.press(screen.getByText("Choose from Library"));
    });

    expect(screen.getByText("Duration: 00:13")).toBeTruthy();

    await act(async () => {
      fireEvent.press(screen.getByText("Use Video"));
    });

    expect(mockCopyVideo).toHaveBeenCalledWith("file:///library/clip.mov");
    expect(mockMoveVideo).not.toHaveBeenCalled();

    const evidenceCall = mockCreateEvidence.mock.calls[0][0];
    expect(evidenceCall.type).toBe("video");
    expect(evidenceCall.uri).toBe(
      "file:///mock/documents/evidence/videos/lib.mp4",
    );
    const metadata = JSON.parse(evidenceCall.metadata);
    expect(metadata.source).toBe("library");
    expect(metadata.duration).toBe(13);
    expect(metadata.facing).toBeUndefined();
    expect(mockGoBack).toHaveBeenCalled();
  });

  it("returns to chooser when retake is pressed in library preview", async () => {
    mockRequestMediaLibraryPermissionsAsync.mockResolvedValueOnce({
      granted: true,
    });
    mockLaunchImageLibraryAsync.mockResolvedValueOnce({
      canceled: false,
      assets: [{ uri: "file:///library/clip.mov", duration: 5000 }],
    });

    render(
      <CaptureVideoScreen
        route={defaultRoute}
        navigation={undefined as never}
      />,
    );

    await act(async () => {
      fireEvent.press(screen.getByText("Choose from Library"));
    });

    await act(async () => {
      fireEvent.press(screen.getByText("Retake"));
    });

    expect(screen.getByText("Add a video")).toBeTruthy();
    expect(mockCreateEvidence).not.toHaveBeenCalled();
  });
});
