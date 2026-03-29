import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";

const mockPlay = jest.fn();
const mockPause = jest.fn();
const mockSeekTo = jest.fn();
const mockPlayerStatus = {
  playing: false,
  currentTime: 0,
  duration: 30,
  didJustFinish: false,
};

jest.mock("expo-audio", () => ({
  useAudioPlayer: jest.fn(() => ({
    play: mockPlay,
    pause: mockPause,
    seekTo: mockSeekTo,
  })),
  useAudioPlayerStatus: jest.fn(() => mockPlayerStatus),
}));

import { AudioPlayer } from "../AudioPlayer";

beforeEach(() => {
  jest.clearAllMocks();
  mockPlayerStatus.playing = false;
  mockPlayerStatus.currentTime = 0;
  mockPlayerStatus.didJustFinish = false;
});

describe("AudioPlayer", () => {
  it("renders play button initially", () => {
    render(<AudioPlayer uri="/audio.m4a" />);
    expect(screen.getByLabelText("Play audio")).toBeTruthy();
  });

  it("calls player.play when play is pressed", () => {
    render(<AudioPlayer uri="/audio.m4a" />);
    fireEvent.press(screen.getByLabelText("Play audio"));
    expect(mockPlay).toHaveBeenCalled();
  });

  it("calls player.pause when paused", () => {
    mockPlayerStatus.playing = true;
    render(<AudioPlayer uri="/audio.m4a" />);
    fireEvent.press(screen.getByLabelText("Pause audio"));
    expect(mockPause).toHaveBeenCalled();
  });

  it("seeks to start and plays when replaying after finish", () => {
    mockPlayerStatus.playing = false;
    mockPlayerStatus.didJustFinish = true;
    render(<AudioPlayer uri="/audio.m4a" />);
    fireEvent.press(screen.getByLabelText("Play audio"));
    expect(mockSeekTo).toHaveBeenCalledWith(0);
    expect(mockPlay).toHaveBeenCalled();
  });

  it("does not seek when playing from non-finished state", () => {
    mockPlayerStatus.playing = false;
    mockPlayerStatus.didJustFinish = false;
    render(<AudioPlayer uri="/audio.m4a" />);
    fireEvent.press(screen.getByLabelText("Play audio"));
    expect(mockSeekTo).not.toHaveBeenCalled();
    expect(mockPlay).toHaveBeenCalled();
  });

  it("handles zero duration without crashing", () => {
    mockPlayerStatus.duration = 0;
    mockPlayerStatus.currentTime = 0;
    render(<AudioPlayer uri="/audio.m4a" />);
    const progressBar = screen.getByRole("progressbar");
    expect(progressBar.props.accessibilityValue.now).toBe(0);
  });

  it("shows time display", () => {
    render(<AudioPlayer uri="/audio.m4a" durationMs={65000} />);
    expect(screen.getByText("00:00")).toBeTruthy();
  });

  it("shows current time with correct formatting", () => {
    mockPlayerStatus.currentTime = 65; // 65 seconds = 1:05
    render(<AudioPlayer uri="/audio.m4a" />);
    expect(screen.getByText("01:05")).toBeTruthy();
  });

  it("shows duration in accessibility label", () => {
    mockPlayerStatus.currentTime = 5;
    render(<AudioPlayer uri="/audio.m4a" durationMs={120000} />);
    expect(screen.getByLabelText("00:05 of 02:00")).toBeTruthy();
  });

  it("shows progress bar", () => {
    render(<AudioPlayer uri="/audio.m4a" />);
    expect(screen.getByRole("progressbar")).toBeTruthy();
  });

  it("calculates progress percentage correctly", () => {
    mockPlayerStatus.currentTime = 15; // 15 seconds
    mockPlayerStatus.duration = 30; // 30 seconds total
    render(<AudioPlayer uri="/audio.m4a" />);
    const progressBar = screen.getByRole("progressbar");
    expect(progressBar.props.accessibilityValue.now).toBe(50);
  });

  it("uses durationMs prop over status.duration when provided", () => {
    mockPlayerStatus.currentTime = 0;
    mockPlayerStatus.duration = 100; // 100 seconds from status
    render(<AudioPlayer uri="/audio.m4a" durationMs={60000} />); // 60s from prop
    expect(screen.getByLabelText("00:00 of 01:00")).toBeTruthy();
  });

  it("handles playback error gracefully", () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation();
    mockPlay.mockImplementation(() => {
      throw new Error("Audio error");
    });
    render(<AudioPlayer uri="/audio.m4a" />);
    fireEvent.press(screen.getByLabelText("Play audio"));
    expect(consoleSpy).toHaveBeenCalledWith(
      "[AudioPlayer] Playback error",
      expect.objectContaining({ uri: "/audio.m4a" }),
    );
    consoleSpy.mockRestore();
  });
});
