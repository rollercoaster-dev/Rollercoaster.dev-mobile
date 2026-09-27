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
import { Alert } from "react-native";
import { usePreventRemove } from "@react-navigation/native";
import { createEvidence } from "../../../db";
import {
  renderWithProviders,
  screen,
  fireEvent,
  act,
} from "../../../__tests__/test-utils";
import { i18n } from "../../../i18n";
import { VoiceMemoScreen } from "../VoiceMemoScreen";
import type { CaptureVoiceMemoScreenProps } from "../../../navigation/types";

const mockGoBack = jest.fn();
const mockDispatch = jest.fn();
jest.mock("@react-navigation/native", () => {
  const actual = jest.requireActual("../../../__tests__/mocks/navigation");
  return {
    ...actual,
    useNavigation: jest.fn(() => ({
      ...actual.useNavigation(),
      goBack: mockGoBack,
      dispatch: mockDispatch,
    })),
  };
});

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
  (createEvidence as jest.Mock).mockReturnValue({
    ok: true,
    value: { id: "evidence_test" },
  });
  mockReset.mockResolvedValue(undefined);
  mockStatus = "idle";
  mockDurationMs = 0;
  mockUri = null;
  mockError = null;
  mockPlaybackPositionMs = 0;
});

describe("VoiceMemoScreen", () => {
  it("leaves an idle, clean recorder immediately", () => {
    renderScreen();
    fireEvent.press(screen.getByLabelText("Go back"));
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it.each(["recording", "paused", "recorded", "playing"])(
    "guards a %s recording from native removal",
    (status) => {
      mockStatus = status;
      renderScreen();
      expect(usePreventRemove).toHaveBeenLastCalledWith(
        true,
        expect.any(Function),
      );
    },
  );

  it("guards exit while microphone permission is pending", () => {
    mockStatus = "requesting-permission";
    renderScreen();
    expect(usePreventRemove).toHaveBeenLastCalledWith(
      true,
      expect.any(Function),
    );
  });

  it("keeps or discards a recorded memo after a clear choice", async () => {
    mockStatus = "recorded";
    mockUri = "file:///recording.m4a";
    const alert = jest
      .spyOn(Alert, "alert")
      .mockImplementation(() => undefined);
    try {
      renderScreen();
      fireEvent.press(screen.getByLabelText("Go back"));
      expect(mockGoBack).not.toHaveBeenCalled();
      const buttons = alert.mock.calls.at(-1)?.[2] ?? [];
      expect(buttons.map((button) => button.text)).toEqual([
        i18n.t("common:unsavedChanges.keep"),
        i18n.t("common:unsavedChanges.discard"),
      ]);
      act(() => buttons[0]?.onPress?.());
      expect(mockReset).not.toHaveBeenCalled();
      expect(mockGoBack).not.toHaveBeenCalled();
      fireEvent.press(screen.getByLabelText("Go back"));
      const secondButtons = alert.mock.calls.at(-1)?.[2] ?? [];
      expect(alert).toHaveBeenCalledTimes(2);
      await act(async () => {
        secondButtons[1]?.onPress?.();
        await Promise.resolve();
      });
      expect(mockReset).toHaveBeenCalledTimes(1);
      expect(mockGoBack).toHaveBeenCalledTimes(1);
    } finally {
      alert.mockRestore();
    }
  });

  it("continues protecting a caption draft after the recording is reset", () => {
    mockStatus = "recorded";
    mockUri = "file:///recording.m4a";
    const { rerender } = renderScreen();
    fireEvent.changeText(
      screen.getByLabelText(i18n.t("captureVoice:caption.a11yLabel")),
      "Why this mattered",
    );
    mockStatus = "idle";
    mockUri = null;
    rerender(
      <VoiceMemoScreen route={mockRoute} navigation={undefined as never} />,
    );
    expect(usePreventRemove).toHaveBeenLastCalledWith(
      true,
      expect.any(Function),
    );
  });

  it("describes caption-only work without claiming a recording exists", () => {
    mockStatus = "recorded";
    mockUri = "file:///recording.m4a";
    const alert = jest
      .spyOn(Alert, "alert")
      .mockImplementation(() => undefined);
    try {
      const { rerender } = renderScreen();
      fireEvent.changeText(
        screen.getByLabelText(i18n.t("captureVoice:caption.a11yLabel")),
        "Caption still in progress",
      );
      mockStatus = "idle";
      mockUri = null;
      rerender(
        <VoiceMemoScreen route={mockRoute} navigation={undefined as never} />,
      );
      fireEvent.press(screen.getByLabelText("Go back"));
      expect(alert).toHaveBeenCalledWith(
        i18n.t("common:unsavedChanges.title"),
        i18n.t("common:unsavedChanges.message"),
        expect.any(Array),
      );
    } finally {
      alert.mockRestore();
    }
  });

  it("leaves after Attach without a discard prompt", () => {
    mockStatus = "recorded";
    mockUri = "file:///recording.m4a";
    const alert = jest
      .spyOn(Alert, "alert")
      .mockImplementation(() => undefined);
    try {
      renderScreen();
      fireEvent.press(screen.getByText(i18n.t("captureVoice:actions.attach")));
      expect(createEvidence).toHaveBeenCalledTimes(1);
      expect(mockGoBack).toHaveBeenCalledTimes(1);
      expect(alert).not.toHaveBeenCalled();
    } finally {
      alert.mockRestore();
    }
  });

  it("retains a recording when the database rejects Attach", () => {
    mockStatus = "recorded";
    mockUri = "file:///recording.m4a";
    const alert = jest
      .spyOn(Alert, "alert")
      .mockImplementation(() => undefined);
    (createEvidence as jest.Mock).mockReturnValueOnce({
      ok: false,
      error: new Error("write failed"),
    });
    try {
      renderScreen();
      fireEvent.press(screen.getByText(i18n.t("captureVoice:actions.attach")));

      expect(mockGoBack).not.toHaveBeenCalled();
      expect(mockReset).not.toHaveBeenCalled();
      expect(usePreventRemove).toHaveBeenLastCalledWith(
        true,
        expect.any(Function),
      );
      expect(alert).toHaveBeenCalledWith(
        i18n.t("captureVoice:errors.saveFailedTitle"),
        i18n.t("captureVoice:errors.saveFailedMessage"),
      );
    } finally {
      alert.mockRestore();
    }
  });

  it("clears a caption when the in-screen Discard resets a recording", () => {
    mockStatus = "recorded";
    mockUri = "file:///recording.m4a";
    const alert = jest
      .spyOn(Alert, "alert")
      .mockImplementation(() => undefined);
    try {
      const { rerender } = renderScreen();
      fireEvent.changeText(
        screen.getByLabelText(i18n.t("captureVoice:caption.a11yLabel")),
        "Unsaved caption",
      );
      fireEvent.press(screen.getByText(i18n.t("captureVoice:actions.discard")));
      const buttons = alert.mock.calls.at(-1)?.[2] ?? [];
      act(() => buttons[1]?.onPress?.());
      expect(mockReset).toHaveBeenCalledTimes(1);
      mockStatus = "idle";
      mockUri = null;
      rerender(
        <VoiceMemoScreen route={mockRoute} navigation={undefined as never} />,
      );
      expect(usePreventRemove).toHaveBeenLastCalledWith(
        false,
        expect.any(Function),
      );
    } finally {
      alert.mockRestore();
    }
  });

  describe("idle state", () => {
    it("renders the screen title", () => {
      renderScreen();
      expect(screen.getByText(i18n.t("captureVoice:title"))).toBeOnTheScreen();
    });

    it("shows timer at 00:00", () => {
      renderScreen();
      expect(screen.getByTestId("voice-timer")).toHaveTextContent("00:00");
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
      expect(screen.getByTestId("voice-timer")).toHaveTextContent("00:03");
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
      expect(screen.getByTestId("voice-timer")).toHaveTextContent("00:10");
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
      expect(screen.getByTestId("voice-timer")).toHaveTextContent("01:05");
    });

    it("formats zero correctly", () => {
      mockDurationMs = 0;
      renderScreen();
      expect(screen.getByTestId("voice-timer")).toHaveTextContent("00:00");
    });
  });
});
