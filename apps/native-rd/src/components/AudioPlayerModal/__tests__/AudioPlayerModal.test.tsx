import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { AudioPlayerModal } from "../AudioPlayerModal";

jest.mock("expo-audio", () => ({
  useAudioPlayer: jest.fn(() => ({
    play: jest.fn(),
    pause: jest.fn(),
    seekTo: jest.fn(),
  })),
  useAudioPlayerStatus: jest.fn(() => ({
    playing: false,
    currentTime: 0,
    duration: 0,
    didJustFinish: false,
  })),
}));

describe("AudioPlayerModal", () => {
  it("renders nothing when uri is null", () => {
    const { toJSON } = render(
      <AudioPlayerModal visible={true} uri={null} onClose={jest.fn()} />,
    );
    expect(toJSON()).toBeNull();
  });

  it("renders audio player when visible with uri", () => {
    render(
      <AudioPlayerModal visible={true} uri="/audio.m4a" onClose={jest.fn()} />,
    );
    expect(screen.getByText("Voice Memo")).toBeTruthy();
    expect(screen.getByLabelText("Close audio player")).toBeTruthy();
    expect(screen.getByLabelText("Audio player")).toBeTruthy();
  });

  it("calls onClose when close button is pressed", () => {
    const onClose = jest.fn();
    render(
      <AudioPlayerModal visible={true} uri="/audio.m4a" onClose={onClose} />,
    );
    fireEvent.press(screen.getByLabelText("Close audio player"));
    expect(onClose).toHaveBeenCalled();
  });
});
