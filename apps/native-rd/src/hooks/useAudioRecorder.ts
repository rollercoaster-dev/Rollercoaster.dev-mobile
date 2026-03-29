/**
 * Custom hook for audio recording and playback using expo-audio.
 *
 * Encapsulates the full recording lifecycle:
 * idle -> recording -> recorded -> playing -> recorded
 *
 * Handles microphone permission requests, recording configuration,
 * duration tracking, and playback preview.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  useAudioRecorder as useExpoRecorder,
  useAudioPlayer,
  useAudioPlayerStatus,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  RecordingPresets,
} from "expo-audio";

/** Recording status states */
export type RecorderStatus =
  | "idle"
  | "requesting-permission"
  | "permission-denied"
  | "recording"
  | "paused"
  | "recorded"
  | "playing";

export interface AudioRecorderState {
  /** Current recorder status */
  status: RecorderStatus;
  /** Duration of current/completed recording in milliseconds */
  durationMs: number;
  /** Playback position in milliseconds (when playing) */
  playbackPositionMs: number;
  /** Local file URI of the recorded audio (available after recording stops) */
  uri: string | null;
  /** Error message if something went wrong */
  error: string | null;
}

export interface AudioRecorderActions {
  /** Request permission and start recording */
  startRecording: () => Promise<void>;
  /** Stop the current recording */
  stopRecording: () => Promise<void>;
  /** Pause the current recording */
  pauseRecording: () => Promise<void>;
  /** Resume a paused recording */
  resumeRecording: () => Promise<void>;
  /** Start playback of the recorded audio */
  startPlayback: () => Promise<void>;
  /** Stop playback */
  stopPlayback: () => Promise<void>;
  /** Reset to idle state, discarding any recording */
  reset: () => Promise<void>;
}

export function useAudioRecorder(): AudioRecorderState & AudioRecorderActions {
  const [status, setStatus] = useState<RecorderStatus>("idle");
  const [durationMs, setDurationMs] = useState(0);
  const [playbackPositionMs, setPlaybackPositionMs] = useState(0);
  const [uri, setUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const recorder = useExpoRecorder(
    RecordingPresets.HIGH_QUALITY,
    (recStatus) => {
      if (recStatus.isFinished && recStatus.url) {
        setUri(recStatus.url);
        const state = recorder.getStatus();
        setDurationMs(state.durationMillis);
        setStatus("recorded");
      }
      if (recStatus.hasError) {
        setError(recStatus.error);
      }
    },
  );

  // Player for playback preview — source changes when uri updates
  const player = useAudioPlayer(uri ?? undefined);
  const playerStatus = useAudioPlayerStatus(player);

  // Track playback position and completion
  const wasPlayingRef = useRef(false);
  useEffect(() => {
    if (status === "playing") {
      setPlaybackPositionMs(Math.round(playerStatus.currentTime * 1000));

      if (playerStatus.didJustFinish) {
        setStatus("recorded");
        setPlaybackPositionMs(0);
        wasPlayingRef.current = false;
      }
    }
  }, [status, playerStatus.currentTime, playerStatus.didJustFinish]);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      setStatus("requesting-permission");

      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        setStatus("permission-denied");
        setError("Microphone permission is required to record voice memos.");
        return;
      }

      // Configure audio mode for recording
      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });

      await recorder.prepareToRecordAsync();
      recorder.record();
      setStatus("recording");
      setDurationMs(0);
    } catch (err) {
      setStatus("idle");
      setError(
        err instanceof Error
          ? err.message
          : "Failed to start recording. Please try again.",
      );
    }
  }, [recorder]);

  const stopRecording = useCallback(async () => {
    try {
      if (!recorder.isRecording) return;

      await recorder.stop();

      // Reset audio mode so playback works
      await setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: true,
      });

      const state = recorder.getStatus();
      setUri(recorder.uri);
      setDurationMs(state.durationMillis);
      setStatus("recorded");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to stop recording. Please try again.",
      );
    }
  }, [recorder]);

  const pauseRecording = useCallback(async () => {
    try {
      if (!recorder.isRecording) return;
      recorder.pause();
      setStatus("paused");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to pause recording.",
      );
    }
  }, [recorder]);

  const resumeRecording = useCallback(async () => {
    try {
      recorder.record();
      setStatus("recording");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to resume recording.",
      );
    }
  }, [recorder]);

  const startPlayback = useCallback(async () => {
    try {
      if (!uri) return;
      setError(null);

      player.seekTo(0);
      player.play();

      wasPlayingRef.current = true;
      setStatus("playing");
      setPlaybackPositionMs(0);
    } catch (err) {
      setStatus("recorded");
      setError(
        err instanceof Error ? err.message : "Failed to play recording.",
      );
    }
  }, [uri, player]);

  const stopPlayback = useCallback(async () => {
    try {
      player.pause();
      setStatus("recorded");
      setPlaybackPositionMs(0);
      wasPlayingRef.current = false;
    } catch (err) {
      setStatus("recorded");
      setError(err instanceof Error ? err.message : "Failed to stop playback.");
    }
  }, [player]);

  const reset = useCallback(async () => {
    try {
      if (recorder.isRecording) {
        await recorder.stop().catch(() => {});
      }
      player.pause();

      setStatus("idle");
      setDurationMs(0);
      setPlaybackPositionMs(0);
      setUri(null);
      setError(null);
    } catch {
      // Best effort cleanup
      setStatus("idle");
    }
  }, [recorder, player]);

  return {
    status,
    durationMs,
    playbackPositionMs,
    uri,
    error,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    startPlayback,
    stopPlayback,
    reset,
  };
}
