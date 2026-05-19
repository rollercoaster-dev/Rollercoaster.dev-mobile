import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { View, Pressable, Alert } from "react-native";
import {
  CameraView,
  useCameraPermissions,
  useMicrophonePermissions,
} from "expo-camera";
import { Text } from "../Text";
import { Card } from "../Card";
import { Button } from "../Button";
import { VideoPreview } from "../VideoPreview";
import { formatDuration } from "../../utils/format";
import { reportError } from "../../services/sentry-report";
import { useTabScreenContentInset } from "../../navigation/useTabScreenContentInset";
import { styles } from "./VideoRecorder.styles";

const MAX_DURATION_SECONDS = 60;

type CameraFacing = "front" | "back";

export type VideoRecorderHandle = {
  /** Asks the recorder to exit. If a recording is in progress or unsaved,
   *  prompts the user to confirm; on confirm, fires `onCancel`. */
  requestExit: () => void;
};

export type VideoRecorderProps = {
  onRecorded: (
    uri: string,
    durationSeconds: number,
    facing: CameraFacing,
  ) => void;
  onCancel: () => void;
  isSaving?: boolean;
};

export const VideoRecorder = forwardRef<
  VideoRecorderHandle,
  VideoRecorderProps
>(function VideoRecorder({ onRecorded, onCancel, isSaving = false }, ref) {
  const tabInset = useTabScreenContentInset();

  const cameraRef = useRef<CameraView>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();

  const [isRecording, setIsRecording] = useState(false);
  const [recordedUri, setRecordedUri] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [facing, setFacing] = useState<CameraFacing>("back");

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const handleStartRecording = useCallback(async () => {
    if (!cameraRef.current || isRecording) return;

    setElapsed(0);
    setIsRecording(true);

    timerRef.current = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);

    try {
      const result = await cameraRef.current.recordAsync({
        maxDuration: MAX_DURATION_SECONDS,
      });
      if (result?.uri) {
        setRecordedUri(result.uri);
      }
    } catch (error) {
      console.error("[VideoRecorder] Recording failed:", error);
      reportError(error, { area: "evidence.capture", kind: "video" });
      Alert.alert(
        "Recording Failed",
        "Could not record video. Please try again.",
      );
    } finally {
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [isRecording]);

  const handleStopRecording = useCallback(() => {
    if (!cameraRef.current || !isRecording) return;
    cameraRef.current.stopRecording();
  }, [isRecording]);

  // Auto-stop recording when max duration reached
  useEffect(() => {
    if (isRecording && elapsed >= MAX_DURATION_SECONDS) {
      handleStopRecording();
    }
  }, [elapsed, isRecording, handleStopRecording]);

  const handleToggleRecording = useCallback(() => {
    if (isRecording) {
      handleStopRecording();
    } else {
      handleStartRecording();
    }
  }, [isRecording, handleStartRecording, handleStopRecording]);

  const handleFlipCamera = useCallback(() => {
    setFacing((prev) => (prev === "back" ? "front" : "back"));
  }, []);

  const handleRetake = useCallback(() => {
    setRecordedUri(null);
    setElapsed(0);
  }, []);

  const handleUseVideo = useCallback(() => {
    if (!recordedUri || isSaving) return;
    onRecorded(recordedUri, elapsed, facing);
  }, [recordedUri, isSaving, elapsed, facing, onRecorded]);

  const handleRequestPermissions = useCallback(async () => {
    await requestCameraPermission();
    await requestMicPermission();
  }, [requestCameraPermission, requestMicPermission]);

  useImperativeHandle(
    ref,
    () => ({
      requestExit() {
        if (isRecording) {
          Alert.alert(
            "Discard recording?",
            "You're still recording. Going back will stop and discard the video.",
            [
              { text: "Keep Recording", style: "cancel" },
              {
                text: "Discard",
                style: "destructive",
                onPress: () => {
                  cameraRef.current?.stopRecording();
                  if (timerRef.current) {
                    clearInterval(timerRef.current);
                    timerRef.current = null;
                  }
                  onCancel();
                },
              },
            ],
          );
          return;
        }
        if (recordedUri) {
          Alert.alert(
            "Discard recording?",
            "You have an unsaved video. Going back will discard it.",
            [
              { text: "Keep", style: "cancel" },
              {
                text: "Discard",
                style: "destructive",
                onPress: () => onCancel(),
              },
            ],
          );
          return;
        }
        onCancel();
      },
    }),
    [isRecording, recordedUri, onCancel],
  );

  const hasPermissions = cameraPermission?.granted && micPermission?.granted;
  const permissionsLoaded = cameraPermission !== null && micPermission !== null;

  if (!permissionsLoaded) {
    return (
      <View style={styles.permissionContainer}>
        <Text variant="body" style={styles.permissionText}>
          Loading...
        </Text>
      </View>
    );
  }

  if (!hasPermissions) {
    return (
      <View style={styles.permissionContainer}>
        <Card>
          <Text variant="headline" style={{ textAlign: "center" }}>
            Camera Access Needed
          </Text>
          <Text variant="body" style={styles.permissionText}>
            To record video evidence, this app needs access to your camera and
            microphone.
          </Text>
          <Button
            label="Grant Access"
            variant="primary"
            onPress={handleRequestPermissions}
          />
        </Card>
      </View>
    );
  }

  if (recordedUri) {
    return (
      <View style={styles.content}>
        <View style={styles.previewContainer}>
          <VideoPreview
            uri={recordedUri}
            durationSeconds={elapsed}
            accessibilityNoun="Recorded video"
          />
        </View>
        <Text variant="caption" style={styles.timer}>
          Duration: {formatDuration(elapsed * 1000)}
        </Text>
        <View style={[styles.previewControls, tabInset]}>
          <View style={styles.previewButton}>
            <Button label="Retake" variant="secondary" onPress={handleRetake} />
          </View>
          <View style={styles.previewButton}>
            <Button
              label={isSaving ? "Saving..." : "Use Video"}
              variant="primary"
              onPress={handleUseVideo}
            />
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.content}>
      <View style={styles.cameraContainer}>
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing={facing}
          mode="video"
          accessible
          accessibilityLabel={`Camera viewfinder, ${facing} camera`}
        />
      </View>
      <Text
        variant="caption"
        style={[styles.timer, isRecording && styles.timerRecording]}
        accessibilityLiveRegion="polite"
        accessibilityLabel={`Recording time: ${formatDuration(elapsed * 1000)}`}
      >
        {formatDuration(elapsed * 1000)}
      </Text>
      {elapsed >= MAX_DURATION_SECONDS - 10 && isRecording && (
        <Text
          variant="caption"
          style={styles.maxDurationWarning}
          accessibilityLiveRegion="assertive"
        >
          {MAX_DURATION_SECONDS - elapsed}s remaining
        </Text>
      )}
      <View style={[styles.controls, tabInset]}>
        <Pressable
          style={styles.recordButton}
          onPress={handleToggleRecording}
          accessible
          accessibilityRole="button"
          accessibilityLabel={
            isRecording ? "Stop recording" : "Start recording"
          }
        >
          <View
            style={
              isRecording
                ? styles.recordingButtonInner
                : styles.recordButtonInner
            }
          />
        </Pressable>
        <Pressable
          style={styles.flipButton}
          onPress={handleFlipCamera}
          disabled={isRecording}
          accessible
          accessibilityRole="button"
          accessibilityLabel={`Switch to ${facing === "back" ? "front" : "back"} camera`}
          accessibilityState={{ disabled: isRecording }}
        >
          <Text variant="body">{"↻"}</Text>
        </Pressable>
      </View>
    </View>
  );
});
