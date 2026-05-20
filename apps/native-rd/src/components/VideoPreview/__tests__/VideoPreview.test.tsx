import React from "react";
import { render, screen } from "@testing-library/react-native";

import { VideoPreview } from "../VideoPreview";

jest.mock("expo-video", () => {
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

describe("VideoPreview", () => {
  it("renders a video view with a duration-aware accessibility label", () => {
    render(
      <VideoPreview
        uri="/clip.mp4"
        durationSeconds={42}
        accessibilityNoun="Recorded video"
      />,
    );

    const view = screen.getByTestId("video-view");
    expect(view).toBeTruthy();
    expect(view.props.accessibilityLabel).toBe(
      "Recorded video preview, 00:42 long",
    );
  });

  it("uses the provided noun in the accessibility label", () => {
    render(
      <VideoPreview
        uri="/clip.mp4"
        durationSeconds={5}
        accessibilityNoun="Selected video"
      />,
    );

    expect(screen.getByTestId("video-view").props.accessibilityLabel).toBe(
      "Selected video preview, 00:05 long",
    );
  });
});
