import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react-native";

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
  const React = require("react");
  const MockCameraView = React.forwardRef(function MockCameraView(
    props: Record<string, unknown>,
    ref: React.Ref<unknown>,
  ) {
    React.useImperativeHandle(ref, () => ({
      recordAsync: mockRecordAsync,
      stopRecording: mockStopRecording,
    }));
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

jest.mock("expo-file-system", () => ({
  Paths: { document: "/mock/documents/" },
  File: jest.fn().mockImplementation(() => ({
    uri: "/mock/documents/evidence/video_123.mp4",
    exists: true,
    move: jest.fn(),
  })),
  Directory: jest.fn().mockImplementation(() => ({
    uri: "/mock/documents/evidence/",
    exists: true,
    create: jest.fn(),
  })),
}));

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
}));

import { CaptureVideoScreen } from "../CaptureVideoScreen";
import { useCameraPermissions, useMicrophonePermissions } from "expo-camera";

const defaultRoute = {
  key: "CaptureVideo",
  name: "CaptureVideo" as const,
  params: { goalId: "goal-123" },
};

describe("CaptureVideoScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders camera view when permissions are granted", () => {
    render(
      <CaptureVideoScreen
        route={defaultRoute}
        navigation={undefined as never}
      />,
    );

    expect(screen.getByText("Record Video")).toBeTruthy();
    expect(screen.getByTestId("camera-view")).toBeTruthy();
    expect(screen.getByLabelText("Start recording")).toBeTruthy();
  });

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

    expect(screen.getByText("Camera Access Needed")).toBeTruthy();
  });

  it("shows timer at 00:00 initially", () => {
    render(
      <CaptureVideoScreen
        route={defaultRoute}
        navigation={undefined as never}
      />,
    );

    expect(screen.getByText("00:00")).toBeTruthy();
  });

  it("has flip camera and record buttons", () => {
    render(
      <CaptureVideoScreen
        route={defaultRoute}
        navigation={undefined as never}
      />,
    );

    expect(screen.getByLabelText("Switch to front camera")).toBeTruthy();
    expect(screen.getByLabelText("Start recording")).toBeTruthy();
  });

  it("navigates back when back button is pressed", () => {
    render(
      <CaptureVideoScreen
        route={defaultRoute}
        navigation={undefined as never}
      />,
    );

    fireEvent.press(screen.getByLabelText("Go back"));
    expect(mockGoBack).toHaveBeenCalled();
  });

  it("starts recording when record button is pressed", async () => {
    mockRecordAsync.mockResolvedValueOnce({ uri: "/tmp/video.mp4" });

    render(
      <CaptureVideoScreen
        route={defaultRoute}
        navigation={undefined as never}
      />,
    );

    await act(async () => {
      fireEvent.press(screen.getByLabelText("Start recording"));
    });

    expect(mockRecordAsync).toHaveBeenCalledWith({
      maxDuration: 60,
    });
  });

  it("shows preview after recording completes", async () => {
    mockRecordAsync.mockResolvedValueOnce({ uri: "/tmp/video.mp4" });

    render(
      <CaptureVideoScreen
        route={defaultRoute}
        navigation={undefined as never}
      />,
    );

    await act(async () => {
      fireEvent.press(screen.getByLabelText("Start recording"));
    });

    // After recording resolves, preview should be shown
    expect(screen.getByText("Use Video")).toBeTruthy();
    expect(screen.getByText("Retake")).toBeTruthy();
    expect(screen.getByTestId("video-player")).toBeTruthy();
  });

  it("returns to camera view when retake is pressed", async () => {
    mockRecordAsync.mockResolvedValueOnce({ uri: "/tmp/video.mp4" });

    render(
      <CaptureVideoScreen
        route={defaultRoute}
        navigation={undefined as never}
      />,
    );

    await act(async () => {
      fireEvent.press(screen.getByLabelText("Start recording"));
    });

    await act(async () => {
      fireEvent.press(screen.getByText("Retake"));
    });

    expect(screen.getByTestId("camera-view")).toBeTruthy();
  });
});
