import React, { useState } from "react";
import { View, Alert, ActivityIndicator } from "react-native";
import { useNavigation } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import { useTranslation } from "react-i18next";
import { Text } from "../../components/Text";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { ScreenSubHeader } from "../../components/ScreenHeader";
import { createEvidence, EvidenceType } from "../../db";
import type { GoalId, StepId } from "../../db";
import { saveImageToAppStorage } from "../../utils/imageStorage";
import { reportError } from "../../services/sentry-report";
import { useEvidenceStartBreadcrumb } from "../../hooks/useEvidenceStartBreadcrumb";
import type { CapturePhotoScreenProps } from "../../navigation/types";
import { styles } from "./CapturePhoto.styles";

const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ["images"],
  allowsEditing: false,
  quality: 0.8,
};

export function CapturePhoto({ route }: CapturePhotoScreenProps) {
  const navigation = useNavigation();
  const { t } = useTranslation(["capturePhoto", "permissions"]);
  const { goalId, stepId } = route.params;
  const [busy, setBusy] = useState(false);

  useEvidenceStartBreadcrumb("photo");

  function savePhoto(
    result: ImagePicker.ImagePickerSuccessResult,
    source: "camera" | "library",
  ) {
    setBusy(true);
    try {
      const asset = result.assets[0];
      const savedUri = saveImageToAppStorage(asset.uri);
      const metadata = JSON.stringify({
        capturedAt: new Date().toISOString(),
        source,
      });
      createEvidence({
        ...(stepId
          ? { stepId: stepId as StepId }
          : { goalId: goalId as GoalId }),
        type: EvidenceType.photo,
        uri: savedUri,
        metadata,
      });
      navigation.goBack();
    } catch (error) {
      console.error("[CapturePhoto] Failed to save photo", {
        goalId,
        stepId,
        error,
      });
      reportError(error, { area: "evidence.capture", kind: "photo" });
      Alert.alert(
        t("capturePhoto:errors.saveFailedTitle"),
        t("capturePhoto:errors.saveFailedMessage"),
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleTakePhoto() {
    if (busy) return;
    setBusy(true);
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          t("permissions:camera.title"),
          t("permissions:camera.message"),
        );
        return;
      }
      const result = await ImagePicker.launchCameraAsync(PICKER_OPTIONS);
      if (!result.canceled) {
        savePhoto(result, "camera");
        return; // savePhoto manages busy state from here
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleChooseFromLibrary() {
    if (busy) return;
    setBusy(true);
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          t("permissions:photoLibrary.title"),
          t("permissions:photoLibrary.message"),
        );
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS);
      if (!result.canceled) {
        savePhoto(result, "library");
        return; // savePhoto manages busy state from here
      }
    } finally {
      setBusy(false);
    }
  }

  if (busy) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <ActivityIndicator
            size="large"
            accessibilityLabel={t("capturePhoto:a11y.savingPhoto")}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenSubHeader
        label={t("capturePhoto:title")}
        onBack={() => navigation.goBack()}
      />
      <View style={styles.content}>
        <Card>
          <Text variant="headline" style={styles.heading}>
            {t("capturePhoto:heading")}
          </Text>
          <View style={styles.buttonGroup}>
            <Button
              label={t("capturePhoto:actions.takePhoto")}
              variant="primary"
              onPress={handleTakePhoto}
            />
            <Button
              label={t("capturePhoto:actions.chooseFromLibrary")}
              variant="secondary"
              onPress={handleChooseFromLibrary}
            />
          </View>
        </Card>
      </View>
    </View>
  );
}
