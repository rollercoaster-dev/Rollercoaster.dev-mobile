import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Pressable, Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import {
  CameraView,
  useCameraPermissions,
  useMicrophonePermissions,
} from "expo-camera";
import { useVideoPlayer, VideoView } from "expo-video";
import { Paths, File, Directory } from "expo-file-system";
import { Text } from "../../components/Text";
import { Card } from "../../components/Card";
import { Button } from "../../components/Button";
import { ScreenSubHeader } from "../../components/ScreenHeader";
import { createEvidence, EvidenceType } from "../../db";
import type { GoalId, StepId } from "../../db";
import type { CaptureVideoScreenProps } from "../../navigation/types";
import { styles } from "./CaptureVideoScreen.styles";

/** Maximum recording duration in seconds */
const MAX_DURATION_SECONDS = 60;

/** Format seconds as MM:SS */
function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

type CameraFacing = "front" | "back";

function Preview({ uri, elapsed }: { uri: string; elapsed: number }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = false;
  });
  return (
    <VideoView
      player={player}
      style={styles.previewVideo}
      fullscreenOptions={{ enable: true }}
      nativeControls
      contentFit="contain"
      accessibilityLabel={`Recorded video preview, ${formatDuration(elapsed)} long`}
    />
  );
}

export function CaptureVideoScreen({ route }: CaptureVideoScreenProps) {
  const navigation = useNavigation();
  const { goalId, stepId } = route.params;

  const cameraRef = useRef<CameraView>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();

  const [isRecording, setIsRecording] = useState(false);
  const [recordedUri, setRecordedUri] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [facing, setFacing] = useState<CameraFacing>("back");
  const [isSaving, setIsSaving] = useState(false);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // Auto-stop recording when max duration reached
  useEffect(() => {
    if (isRecording && elapsed >= MAX_DURATION_SECONDS) {
      handleStopRecording();
    }
  }, [elapsed, isRecording]);

  const handleStartRecording = useCallback(async () => {
    if (!cameraRef.current || isRecording) return;

    setElapsed(0);
    setIsRecording(true);

    // Start timer
    timerRef.current = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);

    try {
      const result = await cameraRef.current.recordAsync({
        maxDuration: MAX_DURATION_SECONDS,
      });
      // Recording finished (either stopped manually or max duration reached)
      if (result?.uri) {
        setRecordedUri(result.uri);
      }
    } catch (error) {
      console.error("[CaptureVideoScreen] Recording failed:", error);
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

  const handleGoBack = useCallback(() => {
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
              navigation.goBack();
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
            onPress: () => navigation.goBack(),
          },
        ],
      );
      return;
    }
    navigation.goBack();
  }, [isRecording, recordedUri, navigation]);

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

  const handleSave = useCallback(async () => {
    if (!recordedUri || isSaving) return;

    setIsSaving(true);
    try {
      // Move video to app's document directory for persistent storage
      const filename = `video_${Date.now()}.mp4`;
      const evidenceDir = new Directory(Paths.document, "evidence");

      // Ensure directory exists
      if (!evidenceDir.exists) {
        evidenceDir.create();
      }

      // Move recorded file to evidence directory
      const sourceFile = new File(recordedUri);
      const destFile = new File(evidenceDir, filename);
      sourceFile.move(destFile);
      const destUri = destFile.uri;

      // Create evidence record in database
      const metadata = JSON.stringify({
        duration: elapsed,
        facing,
        capturedAt: new Date().toISOString(),
      });

      createEvidence({
        ...(stepId
          ? { stepId: stepId as StepId }
          : { goalId: goalId as GoalId }),
        type: EvidenceType.video,
        uri: destUri,
        metadata,
      });

      navigation.goBack();
    } catch (error) {
      console.error("[CaptureVideoScreen] Save failed:", error);
      Alert.alert("Save Failed", "Could not save video. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }, [recordedUri, isSaving, elapsed, facing, goalId, stepId, navigation]);

  // Request permissions if not granted
  const handleRequestPermissions = useCallback(async () => {
    await requestCameraPermission();
    await requestMicPermission();
  }, [requestCameraPermission, requestMicPermission]);

  const hasPermissions = cameraPermission?.granted && micPermission?.granted;
  const permissionsLoaded = cameraPermission !== null && micPermission !== null;

  return (
    <View style={styles.container}>
      <ScreenSubHeader label="Record Video" onBack={handleGoBack} />

      {!permissionsLoaded ? (
        <View style={styles.permissionContainer}>
          <Text variant="body" style={styles.permissionText}>
            Loading...
          </Text>
        </View>
      ) : !hasPermissions ? (
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
      ) : recordedUri ? (
        /* Preview mode */
        <View style={styles.content}>
          <View style={styles.previewContainer}>
            <Preview uri={recordedUri} elapsed={elapsed} />
          </View>
          <Text variant="caption" style={styles.timer}>
            Duration: {formatDuration(elapsed)}
          </Text>
          <View style={styles.previewControls}>
            <View style={styles.previewButton}>
              <Button
                label="Retake"
                variant="secondary"
                onPress={handleRetake}
              />
            </View>
            <View style={styles.previewButton}>
              <Button
                label={isSaving ? "Saving..." : "Use Video"}
                variant="primary"
                onPress={handleSave}
              />
            </View>
          </View>
        </View>
      ) : (
        /* Camera mode */
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
            accessibilityLabel={`Recording time: ${formatDuration(elapsed)}`}
          >
            {formatDuration(elapsed)}
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
          <View style={styles.controls}>
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
      )}
    </View>
  );
}
