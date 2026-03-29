/**
 * Tests for useAudioRecorder hook
 *
 * Tests the state machine logic: idle -> recording -> recorded -> playing
 * and permission handling. Uses expo-audio mock from __tests__/mocks/expo-audio.ts.
 */
import { renderHook, act } from "@testing-library/react-native";
import {
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
} from "expo-audio";
import { useAudioRecorder } from "../useAudioRecorder";

// Access mock instances for assertions
const {
  __mockRecorderInstance: mockRecorder,
  __mockPlayerInstance: mockPlayer,
  // eslint-disable-next-line @typescript-eslint/no-require-imports
} = require("expo-audio");

beforeEach(() => {
  jest.clearAllMocks();
  // Reset recorder state
  mockRecorder.isRecording = false;
  mockRecorder.uri = "file:///mock-recording.m4a";
  // Default: permission granted
  (requestRecordingPermissionsAsync as jest.Mock).mockResolvedValue({
    granted: true,
    status: "granted",
    canAskAgain: true,
    expires: "never",
  });
});

describe("useAudioRecorder", () => {
  describe("initial state", () => {
    it("starts in idle status", () => {
      const { result } = renderHook(() => useAudioRecorder());
      expect(result.current.status).toBe("idle");
      expect(result.current.durationMs).toBe(0);
      expect(result.current.uri).toBeNull();
      expect(result.current.error).toBeNull();
    });
  });

  describe("startRecording", () => {
    it("requests permission and starts recording", async () => {
      const { result } = renderHook(() => useAudioRecorder());

      await act(async () => {
        await result.current.startRecording();
      });

      expect(requestRecordingPermissionsAsync).toHaveBeenCalled();
      expect(setAudioModeAsync).toHaveBeenCalledWith({
        allowsRecording: true,
        playsInSilentMode: true,
      });
      expect(mockRecorder.prepareToRecordAsync).toHaveBeenCalled();
      expect(mockRecorder.record).toHaveBeenCalled();
      expect(result.current.status).toBe("recording");
    });

    it("sets permission-denied when permission is not granted", async () => {
      (requestRecordingPermissionsAsync as jest.Mock).mockResolvedValue({
        granted: false,
        status: "denied",
        canAskAgain: false,
        expires: "never",
      });

      const { result } = renderHook(() => useAudioRecorder());

      await act(async () => {
        await result.current.startRecording();
      });

      expect(result.current.status).toBe("permission-denied");
      expect(result.current.error).toContain("Microphone permission");
    });

    it("handles recording start failure gracefully", async () => {
      mockRecorder.prepareToRecordAsync.mockRejectedValueOnce(
        new Error("Microphone busy"),
      );

      const { result } = renderHook(() => useAudioRecorder());

      await act(async () => {
        await result.current.startRecording();
      });

      expect(result.current.status).toBe("idle");
      expect(result.current.error).toBe("Microphone busy");
    });
  });

  describe("stopRecording", () => {
    it("stops recording and provides URI", async () => {
      const { result } = renderHook(() => useAudioRecorder());

      await act(async () => {
        mockRecorder.isRecording = true;
        await result.current.startRecording();
      });

      await act(async () => {
        await result.current.stopRecording();
      });

      expect(mockRecorder.stop).toHaveBeenCalled();
      expect(result.current.status).toBe("recorded");
      expect(result.current.uri).toBe("file:///mock-recording.m4a");
      expect(result.current.durationMs).toBe(5000);
    });
  });

  describe("pauseRecording", () => {
    it("pauses the current recording", async () => {
      const { result } = renderHook(() => useAudioRecorder());

      await act(async () => {
        mockRecorder.isRecording = true;
        await result.current.startRecording();
      });

      await act(async () => {
        await result.current.pauseRecording();
      });

      expect(mockRecorder.pause).toHaveBeenCalled();
      expect(result.current.status).toBe("paused");
    });
  });

  describe("resumeRecording", () => {
    it("resumes a paused recording", async () => {
      const { result } = renderHook(() => useAudioRecorder());

      await act(async () => {
        mockRecorder.isRecording = true;
        await result.current.startRecording();
      });

      await act(async () => {
        await result.current.pauseRecording();
      });

      await act(async () => {
        await result.current.resumeRecording();
      });

      // record called twice: initial start + resume
      expect(mockRecorder.record).toHaveBeenCalledTimes(2);
      expect(result.current.status).toBe("recording");
    });
  });

  describe("playback", () => {
    it("starts playback of recorded audio", async () => {
      const { result } = renderHook(() => useAudioRecorder());

      // Record first
      await act(async () => {
        mockRecorder.isRecording = true;
        await result.current.startRecording();
      });
      await act(async () => {
        await result.current.stopRecording();
      });

      // Play
      await act(async () => {
        await result.current.startPlayback();
      });

      expect(mockPlayer.seekTo).toHaveBeenCalledWith(0);
      expect(mockPlayer.play).toHaveBeenCalled();
      expect(result.current.status).toBe("playing");
    });

    it("stops playback and returns to recorded state", async () => {
      const { result } = renderHook(() => useAudioRecorder());

      await act(async () => {
        mockRecorder.isRecording = true;
        await result.current.startRecording();
      });
      await act(async () => {
        await result.current.stopRecording();
      });
      await act(async () => {
        await result.current.startPlayback();
      });
      await act(async () => {
        await result.current.stopPlayback();
      });

      expect(mockPlayer.pause).toHaveBeenCalled();
      expect(result.current.status).toBe("recorded");
    });
  });

  describe("reset", () => {
    it("returns to idle state and clears all data", async () => {
      const { result } = renderHook(() => useAudioRecorder());

      await act(async () => {
        mockRecorder.isRecording = true;
        await result.current.startRecording();
      });
      await act(async () => {
        await result.current.stopRecording();
      });

      expect(result.current.uri).not.toBeNull();

      await act(async () => {
        await result.current.reset();
      });

      expect(result.current.status).toBe("idle");
      expect(result.current.durationMs).toBe(0);
      expect(result.current.uri).toBeNull();
      expect(result.current.error).toBeNull();
    });
  });
});
