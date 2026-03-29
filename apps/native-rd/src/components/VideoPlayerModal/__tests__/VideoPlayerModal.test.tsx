import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";

jest.mock("expo-video", () => {
  const { View } = require("react-native");
  return {
    useVideoPlayer: jest.fn(() => ({
      play: jest.fn(),
      pause: jest.fn(),
      loop: false,
      addListener: jest.fn(() => ({ remove: jest.fn() })),
    })),
    VideoView: (props: Record<string, unknown>) => (
      <View testID="video-player" {...props} />
    ),
  };
});

import { VideoPlayerModal } from "../VideoPlayerModal";

describe("VideoPlayerModal", () => {
  it("renders nothing when not visible", () => {
    const { toJSON } = render(
      <VideoPlayerModal visible={false} uri={null} onClose={jest.fn()} />,
    );
    expect(toJSON()).toBeNull();
  });

  it("shows error state when visible with null uri", () => {
    render(<VideoPlayerModal visible={true} uri={null} onClose={jest.fn()} />);
    expect(screen.getByText("Failed to load video")).toBeTruthy();
    expect(screen.getByLabelText("Close video player")).toBeTruthy();
  });

  it("renders video player when visible with uri", () => {
    render(
      <VideoPlayerModal
        visible={true}
        uri="/path/to/video.mp4"
        onClose={jest.fn()}
      />,
    );

    expect(screen.getByTestId("video-player")).toBeTruthy();
    expect(screen.getByLabelText("Close video player")).toBeTruthy();
  });

  it("calls onClose when close button is pressed", () => {
    const onClose = jest.fn();
    render(
      <VideoPlayerModal
        visible={true}
        uri="/path/to/video.mp4"
        onClose={onClose}
      />,
    );

    fireEvent.press(screen.getByLabelText("Close video player"));
    expect(onClose).toHaveBeenCalled();
  });

  it("shows error text when player reports error status", () => {
    const { useVideoPlayer } = require("expo-video");
    let statusCallback: (payload: { status: string }) => void;
    useVideoPlayer.mockImplementation(() => ({
      play: jest.fn(),
      pause: jest.fn(),
      loop: false,
      addListener: jest.fn(
        (event: string, cb: (payload: { status: string }) => void) => {
          if (event === "statusChange") statusCallback = cb;
          return { remove: jest.fn() };
        },
      ),
    }));

    render(
      <VideoPlayerModal
        visible={true}
        uri="/bad-video.mp4"
        onClose={jest.fn()}
      />,
    );

    expect(screen.getByTestId("video-player")).toBeTruthy();

    // Simulate error status
    React.act(() => {
      statusCallback({ status: "error" });
    });

    expect(screen.getByText("Failed to load video")).toBeTruthy();
  });
});
