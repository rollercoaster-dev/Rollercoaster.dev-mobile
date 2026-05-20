import React, { useCallback, useRef, useState } from "react";
import { View, Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import { Text } from "../../components/Text";
import { Card } from "../../components/Card";
import { Button } from "../../components/Button";
import { ScreenSubHeader } from "../../components/ScreenHeader";
import { VideoPreview } from "../../components/VideoPreview";
import {
  VideoRecorder,
  type VideoRecorderHandle,
} from "../../components/VideoRecorder";
import { createEvidence, EvidenceType } from "../../db";
import type { GoalId, StepId } from "../../db";
import {
  moveVideoToAppStorage,
  copyVideoToAppStorage,
} from "../../utils/videoStorage";
import { formatDuration } from "../../utils/format";
import { reportError } from "../../services/sentry-report";
import { useEvidenceStartBreadcrumb } from "../../hooks/useEvidenceStartBreadcrumb";
import type { CaptureVideoScreenProps } from "../../navigation/types";
import { useTabScreenContentInset } from "../../navigation/useTabScreenContentInset";
import { styles } from "./CaptureVideoScreen.styles";

type Mode = "chooser" | "recorder" | "library-preview";

type CameraFacing = "front" | "back";

type SaveArgs =
  | {
      source: "camera";
      uri: string;
      durationSeconds: number;
      facing: CameraFacing;
    }
  | { source: "library"; uri: string; durationSeconds: number };

export function CaptureVideoScreen({ route }: CaptureVideoScreenProps) {
  const navigation = useNavigation();
  const { goalId, stepId } = route.params;
  const recorderRef = useRef<VideoRecorderHandle>(null);
  const tabInset = useTabScreenContentInset();

  const [mode, setMode] = useState<Mode>("chooser");
  const [uploadedVideo, setUploadedVideo] = useState<{
    uri: string;
    durationSeconds: number;
  } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isPickerBusy, setIsPickerBusy] = useState(false);

  useEvidenceStartBreadcrumb("video");

  const handleSaveVideo = useCallback(
    async (args: SaveArgs) => {
      if (isSaving) return;
      setIsSaving(true);
      try {
        const destUri =
          args.source === "camera"
            ? moveVideoToAppStorage(args.uri)
            : copyVideoToAppStorage(args.uri);

        const metadata = JSON.stringify({
          duration: args.durationSeconds,
          capturedAt: new Date().toISOString(),
          source: args.source,
          ...(args.source === "camera" ? { facing: args.facing } : {}),
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
        reportError(error, { area: "evidence.capture", kind: "video" });
        Alert.alert("Save Failed", "Could not save video. Please try again.");
      } finally {
        setIsSaving(false);
      }
    },
    [isSaving, goalId, stepId, navigation],
  );

  const handleRecorded = useCallback(
    (uri: string, durationSeconds: number, facing: CameraFacing) => {
      handleSaveVideo({ source: "camera", uri, durationSeconds, facing });
    },
    [handleSaveVideo],
  );

  const handleUseUploaded = useCallback(() => {
    if (!uploadedVideo) return;
    handleSaveVideo({
      source: "library",
      uri: uploadedVideo.uri,
      durationSeconds: uploadedVideo.durationSeconds,
    });
  }, [uploadedVideo, handleSaveVideo]);

  const handleRetakeUploaded = useCallback(() => {
    setUploadedVideo(null);
    setMode("chooser");
  }, []);

  const handleRecorderCancel = useCallback(() => {
    setMode("chooser");
  }, []);

  const handlePickFromLibrary = useCallback(async () => {
    if (isPickerBusy) return;
    setIsPickerBusy(true);
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Photo library access needed",
          "Please allow photo library access in your device settings to select videos.",
        );
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["videos"],
        allowsEditing: false,
        videoQuality: 1,
      });
      if (!result.canceled) {
        const asset = result.assets[0];
        const durationSeconds = Math.round((asset.duration ?? 0) / 1000);
        setUploadedVideo({ uri: asset.uri, durationSeconds });
        setMode("library-preview");
      }
    } finally {
      setIsPickerBusy(false);
    }
  }, [isPickerBusy]);

  const handleGoBack = useCallback(() => {
    if (mode === "recorder") {
      recorderRef.current?.requestExit();
      return;
    }
    if (mode === "library-preview" && uploadedVideo) {
      Alert.alert(
        "Discard video?",
        "You have an unsaved video. Going back will discard it.",
        [
          { text: "Keep", style: "cancel" },
          {
            text: "Discard",
            style: "destructive",
            onPress: () => {
              setUploadedVideo(null);
              navigation.goBack();
            },
          },
        ],
      );
      return;
    }
    navigation.goBack();
  }, [mode, uploadedVideo, navigation]);

  function renderBody() {
    if (mode === "recorder") {
      return (
        <VideoRecorder
          ref={recorderRef}
          onRecorded={handleRecorded}
          onCancel={handleRecorderCancel}
          isSaving={isSaving}
        />
      );
    }

    if (mode === "library-preview" && uploadedVideo) {
      return (
        <View style={styles.previewWrapper}>
          <View style={styles.previewContainer}>
            <VideoPreview
              uri={uploadedVideo.uri}
              durationSeconds={uploadedVideo.durationSeconds}
              accessibilityNoun="Selected video"
            />
          </View>
          <Text variant="caption" style={styles.previewCaption}>
            Duration: {formatDuration(uploadedVideo.durationSeconds * 1000)}
          </Text>
          <View style={[styles.previewControls, tabInset]}>
            <View style={styles.previewButton}>
              <Button
                label="Retake"
                variant="secondary"
                onPress={handleRetakeUploaded}
                disabled={isSaving}
              />
            </View>
            <View style={styles.previewButton}>
              <Button
                label={isSaving ? "Saving..." : "Use Video"}
                variant="primary"
                onPress={handleUseUploaded}
                loading={isSaving}
              />
            </View>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.chooserContent}>
        <Card>
          <Text variant="headline" style={styles.chooserHeading}>
            Add a video
          </Text>
          <View style={styles.chooserButtonGroup}>
            <Button
              label="Record Video"
              variant="primary"
              onPress={() => setMode("recorder")}
            />
            <Button
              label="Choose from Library"
              variant="secondary"
              onPress={handlePickFromLibrary}
              loading={isPickerBusy}
            />
          </View>
        </Card>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenSubHeader label="Capture Video" onBack={handleGoBack} />
      {renderBody()}
    </View>
  );
}
