import React, { useCallback, useRef, useState } from "react";
import { View, Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Paths, File, Directory } from "expo-file-system";
import { ScreenSubHeader } from "../../components/ScreenHeader";
import {
  VideoRecorder,
  type VideoRecorderHandle,
} from "../../components/VideoRecorder";
import { createEvidence, EvidenceType } from "../../db";
import type { GoalId, StepId } from "../../db";
import { reportError } from "../../services/sentry-report";
import { useEvidenceStartBreadcrumb } from "../../hooks/useEvidenceStartBreadcrumb";
import type { CaptureVideoScreenProps } from "../../navigation/types";
import { styles } from "./CaptureVideoScreen.styles";

type CameraFacing = "front" | "back";

export function CaptureVideoScreen({ route }: CaptureVideoScreenProps) {
  const navigation = useNavigation();
  const { goalId, stepId } = route.params;
  const recorderRef = useRef<VideoRecorderHandle>(null);

  const [isSaving, setIsSaving] = useState(false);

  useEvidenceStartBreadcrumb("video");

  const handleSaveRecording = useCallback(
    async (uri: string, durationSeconds: number, facing: CameraFacing) => {
      if (isSaving) return;
      setIsSaving(true);
      try {
        const filename = `video_${Date.now()}.mp4`;
        const evidenceDir = new Directory(Paths.document, "evidence");
        if (!evidenceDir.exists) {
          evidenceDir.create();
        }
        const sourceFile = new File(uri);
        const destFile = new File(evidenceDir, filename);
        sourceFile.move(destFile);

        const metadata = JSON.stringify({
          duration: durationSeconds,
          facing,
          capturedAt: new Date().toISOString(),
        });

        createEvidence({
          ...(stepId
            ? { stepId: stepId as StepId }
            : { goalId: goalId as GoalId }),
          type: EvidenceType.video,
          uri: destFile.uri,
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

  const handleGoBack = useCallback(() => {
    if (recorderRef.current) {
      recorderRef.current.requestExit();
      return;
    }
    navigation.goBack();
  }, [navigation]);

  const handleCancel = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  return (
    <View style={styles.container}>
      <ScreenSubHeader label="Record Video" onBack={handleGoBack} />
      <VideoRecorder
        ref={recorderRef}
        onRecorded={handleSaveRecording}
        onCancel={handleCancel}
        isSaving={isSaving}
      />
    </View>
  );
}
