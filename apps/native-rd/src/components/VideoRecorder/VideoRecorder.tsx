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
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation(["captureVideo", "permissions"]);
  const tabInset = useTabScreenContentInset();

  const cameraRef = useRef<CameraView>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Guards setState in recordAsync's finally block when the parent unmounts
  // the recorder (e.g. user cancels) before the in-flight promise resolves.
  const isMountedRef = useRef(true);

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();

  const [isRecording, setIsRecording] = useState(false);
  const [recordedUri, setRecordedUri] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [facing, setFacing] = useState<CameraFacing>("back");

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
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
      if (result?.uri && isMountedRef.current) {
        setRecordedUri(result.uri);
      }
    } catch (error) {
      console.error("[VideoRecorder] Recording failed:", error);
      reportError(error, { area: "evidence.capture", kind: "video" });
      if (isMountedRef.current) {
        Alert.alert(
          t("captureVideo:recorder.errors.recordingFailedTitle"),
          t("captureVideo:recorder.errors.recordingFailedMessage"),
        );
      }
    } finally {
      if (isMountedRef.current) {
        setIsRecording(false);
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [isRecording, t]);

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
            t("captureVideo:recorder.discardWhileRecording.title"),
            t("captureVideo:recorder.discardWhileRecording.message"),
            [
              {
                text: t("captureVideo:recorder.discardWhileRecording.keep"),
                style: "cancel",
              },
              {
                text: t("captureVideo:recorder.discardWhileRecording.discard"),
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
            t("captureVideo:recorder.discardRecorded.title"),
            t("captureVideo:recorder.discardRecorded.message"),
            [
              {
                text: t("captureVideo:recorder.discardRecorded.keep"),
                style: "cancel",
              },
              {
                text: t("captureVideo:recorder.discardRecorded.discard"),
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
    [isRecording, recordedUri, onCancel, t],
  );

  const hasPermissions = cameraPermission?.granted && micPermission?.granted;
  const permissionsLoaded = cameraPermission !== null && micPermission !== null;

  if (!permissionsLoaded) {
    return (
      <View style={styles.permissionContainer}>
        <Text variant="body" style={styles.permissionText}>
          {t("captureVideo:recorder.loading")}
        </Text>
      </View>
    );
  }

  if (!hasPermissions) {
    return (
      <View style={styles.permissionContainer}>
        <Card>
          <Text variant="headline" style={{ textAlign: "center" }}>
            {t("permissions:camera.title")}
          </Text>
          <Text variant="body" style={styles.permissionText}>
            {t("permissions:camera.message")}
          </Text>
          <Button
            label={t("permissions:camera.settingsCta")}
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
            accessibilityNoun={t("captureVideo:recorder.recordedVideoNoun")}
          />
        </View>
        <Text variant="caption" style={styles.timer}>
          {t("captureVideo:preview.durationLabel", {
            duration: formatDuration(elapsed * 1000),
          })}
        </Text>
        <View style={[styles.previewControls, tabInset]}>
          <View style={styles.previewButton}>
            <Button
              label={t("captureVideo:actions.retake")}
              variant="secondary"
              onPress={handleRetake}
              disabled={isSaving}
            />
          </View>
          <View style={styles.previewButton}>
            <Button
              label={
                isSaving
                  ? t("captureVideo:actions.saving")
                  : t("captureVideo:actions.useVideo")
              }
              variant="primary"
              onPress={handleUseVideo}
              loading={isSaving}
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
          accessibilityLabel={
            facing === "back"
              ? t("captureVideo:recorder.a11y.cameraViewfinderBack")
              : t("captureVideo:recorder.a11y.cameraViewfinderFront")
          }
        />
      </View>
      <Text
        variant="caption"
        style={[styles.timer, isRecording && styles.timerRecording]}
        testID="video-recorder-timer"
        accessibilityLiveRegion="polite"
        accessibilityLabel={t("captureVideo:recorder.a11y.recordingTime", {
          time: formatDuration(elapsed * 1000),
        })}
      >
        {formatDuration(elapsed * 1000)}
      </Text>
      {elapsed >= MAX_DURATION_SECONDS - 10 && isRecording && (
        <Text
          variant="caption"
          style={styles.maxDurationWarning}
          accessibilityLiveRegion="assertive"
        >
          {t("captureVideo:recorder.countdown", {
            seconds: MAX_DURATION_SECONDS - elapsed,
          })}
        </Text>
      )}
      <View style={[styles.controls, tabInset]}>
        <Pressable
          style={styles.recordButton}
          onPress={handleToggleRecording}
          accessible
          accessibilityRole="button"
          accessibilityLabel={
            isRecording
              ? t("captureVideo:recorder.a11y.stopRecording")
              : t("captureVideo:recorder.a11y.startRecording")
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
          accessibilityLabel={
            facing === "back"
              ? t("captureVideo:recorder.a11y.switchToFrontCamera")
              : t("captureVideo:recorder.a11y.switchToBackCamera")
          }
          accessibilityState={{ disabled: isRecording }}
        >
          <Text variant="body">{"↻"}</Text>
        </Pressable>
      </View>
    </View>
  );
});
