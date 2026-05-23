import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";

import { useCameraPermissions, useMicrophonePermissions } from "expo-camera";

import { i18n } from "../../../i18n";
import { VideoRecorder } from "../VideoRecorder";

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
      <View testID="video-view" {...props} />
    ),
  };
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe("VideoRecorder", () => {
  it("renders the camera viewfinder and start-record button when permissions are granted", () => {
    render(<VideoRecorder onRecorded={jest.fn()} onCancel={jest.fn()} />);

    expect(screen.getByTestId("camera-view")).toBeTruthy();
    expect(
      screen.getByLabelText(
        i18n.t("captureVideo:recorder.a11y.startRecording"),
      ),
    ).toBeTruthy();
    expect(
      screen.getByLabelText(
        i18n.t("captureVideo:recorder.a11y.switchToFrontCamera"),
      ),
    ).toBeTruthy();
  });

  it("renders the permission prompt when camera permission is not granted", () => {
    (useCameraPermissions as jest.Mock).mockReturnValueOnce([
      { granted: false },
      jest.fn(),
    ]);

    render(<VideoRecorder onRecorded={jest.fn()} onCancel={jest.fn()} />);

    expect(
      screen.getByText(i18n.t("captureVideo:recorder.permissionTitle")),
    ).toBeTruthy();
    expect(screen.queryByTestId("camera-view")).toBeNull();
  });

  it("renders the loading placeholder before permissions resolve", () => {
    (useCameraPermissions as jest.Mock).mockReturnValueOnce([null, jest.fn()]);
    (useMicrophonePermissions as jest.Mock).mockReturnValueOnce([
      null,
      jest.fn(),
    ]);

    render(<VideoRecorder onRecorded={jest.fn()} onCancel={jest.fn()} />);

    expect(
      screen.getByText(i18n.t("captureVideo:recorder.loading")),
    ).toBeTruthy();
  });

  it("flips camera facing when the flip button is pressed", () => {
    render(<VideoRecorder onRecorded={jest.fn()} onCancel={jest.fn()} />);

    expect(
      screen.getByLabelText(
        i18n.t("captureVideo:recorder.a11y.cameraViewfinderBack"),
      ),
    ).toBeTruthy();
    fireEvent.press(
      screen.getByLabelText(
        i18n.t("captureVideo:recorder.a11y.switchToFrontCamera"),
      ),
    );
    expect(
      screen.getByLabelText(
        i18n.t("captureVideo:recorder.a11y.cameraViewfinderFront"),
      ),
    ).toBeTruthy();
  });
});
