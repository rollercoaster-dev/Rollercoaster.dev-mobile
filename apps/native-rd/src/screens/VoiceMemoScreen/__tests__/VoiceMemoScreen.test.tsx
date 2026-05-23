/**
 * Tests for VoiceMemoScreen component
 *
 * Tests the UI rendering and user interactions:
 * - Initial idle state display
 * - Recording controls visibility
 * - Permission denied state
 * - Save flow (evidence creation)
 */
import React from "react";
import {
  renderWithProviders,
  screen,
  fireEvent,
  act,
} from "../../../__tests__/test-utils";
import { i18n } from "../../../i18n";
import { VoiceMemoScreen } from "../VoiceMemoScreen";
import type { CaptureVoiceMemoScreenProps } from "../../../navigation/types";

// Mock the useAudioRecorder hook
const mockStartRecording = jest.fn();
const mockStopRecording = jest.fn();
const mockPauseRecording = jest.fn();
const mockResumeRecording = jest.fn();
const mockStartPlayback = jest.fn();
const mockStopPlayback = jest.fn();
const mockReset = jest.fn();

let mockStatus = "idle";
let mockDurationMs = 0;
let mockUri: string | null = null;
let mockError: string | null = null;
let mockPlaybackPositionMs = 0;

jest.mock("../../../hooks/useAudioRecorder", () => ({
  useAudioRecorder: () => ({
    status: mockStatus,
    durationMs: mockDurationMs,
    playbackPositionMs: mockPlaybackPositionMs,
    uri: mockUri,
    error: mockError,
    startRecording: mockStartRecording,
    stopRecording: mockStopRecording,
    pauseRecording: mockPauseRecording,
    resumeRecording: mockResumeRecording,
    startPlayback: mockStartPlayback,
    stopPlayback: mockStopPlayback,
    reset: mockReset,
  }),
}));

// Mock createEvidence
jest.mock("../../../db", () => ({
  createEvidence: jest.fn(),
  EvidenceType: { voice_memo: "voice_memo" },
}));

const mockRoute = {
  params: { goalId: "goal_123" },
  key: "CaptureVoiceMemo-123",
  name: "CaptureVoiceMemo" as const,
} as CaptureVoiceMemoScreenProps["route"];

function renderScreen(route = mockRoute) {
  return renderWithProviders(
    <VoiceMemoScreen route={route} navigation={undefined as never} />,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockStatus = "idle";
  mockDurationMs = 0;
  mockUri = null;
  mockError = null;
  mockPlaybackPositionMs = 0;
});

describe("VoiceMemoScreen", () => {
  describe("idle state", () => {
    it("renders the screen title", () => {
      renderScreen();
      expect(screen.getByText(i18n.t("captureVoice:title"))).toBeOnTheScreen();
    });

    it("shows timer at 00:00", () => {
      renderScreen();
      expect(screen.getByText("00:00")).toBeOnTheScreen();
    });

    it("shows start recording hint", () => {
      renderScreen();
      expect(
        screen.getByText(i18n.t("captureVoice:status.idle")),
      ).toBeOnTheScreen();
    });

    it("renders the start recording button", () => {
      renderScreen();
      expect(
        screen.getByLabelText(i18n.t("captureVoice:a11y.startRecording")),
      ).toBeOnTheScreen();
    });

    it("renders the go back button", () => {
      renderScreen();
      expect(screen.getByLabelText("Go back")).toBeOnTheScreen();
    });
  });

  describe("recording state", () => {
    beforeEach(() => {
      mockStatus = "recording";
      mockDurationMs = 3500;
    });

    it("shows recording status text", () => {
      renderScreen();
      expect(
        screen.getByText(i18n.t("captureVoice:status.recording")),
      ).toBeOnTheScreen();
    });

    it("shows formatted duration", () => {
      renderScreen();
      expect(screen.getByText("00:03")).toBeOnTheScreen();
    });

    it("shows stop recording button", () => {
      renderScreen();
      expect(
        screen.getByLabelText(i18n.t("captureVoice:a11y.stopRecording")),
      ).toBeOnTheScreen();
    });

    it("shows pause button", () => {
      renderScreen();
      expect(
        screen.getByLabelText(i18n.t("captureVoice:a11y.pauseRecording")),
      ).toBeOnTheScreen();
    });
  });

  describe("paused state", () => {
    beforeEach(() => {
      mockStatus = "paused";
      mockDurationMs = 5000;
    });

    it("shows paused status", () => {
      renderScreen();
      expect(
        screen.getByText(i18n.t("captureVoice:status.paused")),
      ).toBeOnTheScreen();
    });

    it("shows resume button", () => {
      renderScreen();
      expect(
        screen.getByLabelText(i18n.t("captureVoice:a11y.resumeRecording")),
      ).toBeOnTheScreen();
    });
  });

  describe("recorded state", () => {
    beforeEach(() => {
      mockStatus = "recorded";
      mockDurationMs = 10000;
      mockUri = "file:///recording.m4a";
    });

    it("shows recording complete status", () => {
      renderScreen();
      expect(
        screen.getByText(i18n.t("captureVoice:status.recorded")),
      ).toBeOnTheScreen();
    });

    it("shows duration", () => {
      renderScreen();
      expect(screen.getByText("00:10")).toBeOnTheScreen();
    });

    it("shows play button", () => {
      renderScreen();
      expect(
        screen.getByText(i18n.t("captureVoice:actions.play")),
      ).toBeOnTheScreen();
    });

    it("shows re-record button", () => {
      renderScreen();
      expect(
        screen.getByText(i18n.t("captureVoice:actions.reRecord")),
      ).toBeOnTheScreen();
    });

    it("shows caption input", () => {
      renderScreen();
      expect(
        screen.getByLabelText(i18n.t("captureVoice:caption.a11yLabel")),
      ).toBeOnTheScreen();
    });

    it("shows attach button", () => {
      renderScreen();
      expect(
        screen.getByText(i18n.t("captureVoice:actions.attach")),
      ).toBeOnTheScreen();
    });

    it("shows discard button", () => {
      renderScreen();
      expect(
        screen.getByText(i18n.t("captureVoice:actions.discard")),
      ).toBeOnTheScreen();
    });

    it("calls startPlayback when play is pressed", () => {
      renderScreen();
      fireEvent.press(screen.getByText(i18n.t("captureVoice:actions.play")));
      expect(mockStartPlayback).toHaveBeenCalled();
    });

    it("calls reset when re-record is pressed", () => {
      renderScreen();
      fireEvent.press(
        screen.getByText(i18n.t("captureVoice:actions.reRecord")),
      );
      expect(mockReset).toHaveBeenCalled();
    });
  });

  describe("playing state", () => {
    beforeEach(() => {
      mockStatus = "playing";
      mockDurationMs = 10000;
      mockPlaybackPositionMs = 5000;
      mockUri = "file:///recording.m4a";
    });

    it("shows playing status", () => {
      renderScreen();
      expect(
        screen.getByText(i18n.t("captureVoice:status.playing")),
      ).toBeOnTheScreen();
    });

    it("shows stop button instead of play", () => {
      renderScreen();
      expect(
        screen.getByText(i18n.t("captureVoice:actions.stop")),
      ).toBeOnTheScreen();
    });

    it("shows playback progress bar", () => {
      renderScreen();
      expect(screen.getByRole("progressbar")).toBeOnTheScreen();
    });
  });

  describe("permission denied state", () => {
    beforeEach(() => {
      mockStatus = "permission-denied";
      mockError = "Microphone permission is required";
    });

    it("shows permission denied heading", () => {
      renderScreen();
      expect(
        screen.getByText(i18n.t("permissions:microphone.title")),
      ).toBeOnTheScreen();
    });

    it("shows open settings button", () => {
      renderScreen();
      expect(
        screen.getByText(i18n.t("permissions:microphone.settingsCta")),
      ).toBeOnTheScreen();
    });

    it("shows try again button", () => {
      renderScreen();
      expect(
        screen.getByText(i18n.t("captureVoice:actions.tryAgain")),
      ).toBeOnTheScreen();
    });

    it("calls startRecording when try again is pressed", () => {
      renderScreen();
      fireEvent.press(
        screen.getByText(i18n.t("captureVoice:actions.tryAgain")),
      );
      expect(mockStartRecording).toHaveBeenCalled();
    });
  });

  describe("error state", () => {
    beforeEach(() => {
      mockStatus = "idle";
      mockError = "Something went wrong";
    });

    it("displays error message", () => {
      renderScreen();
      expect(screen.getByText("Something went wrong")).toBeOnTheScreen();
    });

    it("shows dismiss button", () => {
      renderScreen();
      expect(
        screen.getByText(i18n.t("common:actions.dismiss")),
      ).toBeOnTheScreen();
    });
  });

  describe("pseudo locale", () => {
    afterEach(async () => {
      if (i18n.language !== "en") {
        await act(async () => {
          await i18n.changeLanguage("en");
        });
      }
    });

    it("renders idle state strings in pseudo", async () => {
      await i18n.changeLanguage("pseudo");
      const pseudoTitle = i18n.t("captureVoice:title");
      expect(pseudoTitle).not.toBe("Voice Memo");
      renderScreen();
      expect(screen.getByText(pseudoTitle)).toBeOnTheScreen();
      expect(
        screen.getByText(i18n.t("captureVoice:status.idle")),
      ).toBeOnTheScreen();
    });
  });

  describe("duration formatting", () => {
    it("formats seconds correctly", () => {
      mockDurationMs = 65000; // 1:05
      renderScreen();
      expect(screen.getByText("01:05")).toBeOnTheScreen();
    });

    it("formats zero correctly", () => {
      mockDurationMs = 0;
      renderScreen();
      expect(screen.getByText("00:00")).toBeOnTheScreen();
    });
  });
});
