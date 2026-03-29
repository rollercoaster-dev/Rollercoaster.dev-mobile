import React, { useState } from "react";
import { View, Alert, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import * as DocumentPicker from "expo-document-picker";
import { Text } from "../../components/Text";
import { Button } from "../../components/Button";
import { IconButton } from "../../components/IconButton";
import { Card } from "../../components/Card";
import { createEvidence, EvidenceType } from "../../db";
import type { GoalId, StepId } from "../../db";
import {
  saveFileToAppStorage,
  validateFile,
  MAX_FILE_SIZE_LABEL,
  ALLOWED_MIME_TYPES,
} from "../../utils/fileStorage";
import type { CaptureFileScreenProps } from "../../navigation/types";
import { styles } from "./CaptureFile.styles";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(mimeType: string | undefined): string {
  if (!mimeType) return "\u{1F4C4}"; // page facing up
  if (mimeType === "application/pdf") return "\u{1F4D5}"; // closed book (red)
  if (mimeType.startsWith("image/")) return "\u{1F5BC}"; // framed picture
  if (
    mimeType.includes("spreadsheet") ||
    mimeType.includes("excel") ||
    mimeType === "text/csv"
  )
    return "\u{1F4CA}"; // bar chart
  if (mimeType.includes("word") || mimeType.includes("document"))
    return "\u{1F4DD}"; // memo
  return "\u{1F4C4}"; // page facing up
}

export function CaptureFile({ route }: CaptureFileScreenProps) {
  const navigation = useNavigation();
  const { goalId, stepId } = route.params;
  const [busy, setBusy] = useState(false);

  async function handlePickFile() {
    if (busy) return;

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ALLOWED_MIME_TYPES,
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const asset = result.assets[0];
      const { uri, name, mimeType, size } = asset;

      // Validate file
      const validationError = validateFile(mimeType, size);
      if (validationError) {
        Alert.alert("Invalid file", validationError);
        return;
      }

      setBusy(true);

      // Copy to app storage
      const savedUri = saveFileToAppStorage(uri, name);

      // Build metadata JSON
      const metadata = JSON.stringify({
        filename: name,
        mimeType: mimeType ?? "application/octet-stream",
        size: size ?? 0,
      });

      // Create evidence record
      createEvidence({
        goalId: stepId ? undefined : (goalId as GoalId),
        stepId: stepId ? (stepId as StepId) : undefined,
        type: EvidenceType.file,
        uri: savedUri,
        metadata,
      });

      navigation.goBack();
    } catch (error) {
      console.error("[CaptureFile] Failed to save file", {
        goalId,
        stepId,
        error,
      });
      Alert.alert("Save failed", "Could not save the file. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (busy) {
    return (
      <SafeAreaView edges={["top"]} style={styles.container}>
        <View style={styles.content}>
          <ActivityIndicator size="large" accessibilityLabel="Saving file" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top"]} style={styles.container}>
      <View style={styles.topBar}>
        <IconButton
          icon={
            <Text variant="body" style={styles.backIcon}>
              {"<"}
            </Text>
          }
          onPress={() => navigation.goBack()}
          accessibilityLabel="Go back"
          size="sm"
        />
        <Text variant="label">Attach File</Text>
        <View style={styles.spacer} />
      </View>
      <View style={styles.content}>
        <Card>
          <Text variant="headline" style={styles.heading}>
            Attach a file
          </Text>
          <Text variant="body" style={styles.description}>
            Select a PDF, image, or document (max {MAX_FILE_SIZE_LABEL}).
          </Text>
          <View style={styles.buttonGroup}>
            <Button
              label="Choose File"
              variant="primary"
              onPress={handlePickFile}
            />
          </View>
        </Card>
      </View>
    </SafeAreaView>
  );
}
