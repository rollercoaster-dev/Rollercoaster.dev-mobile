import React, { useState } from "react";
import { View, Alert, ActivityIndicator } from "react-native";
import { useNavigation } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import { Text } from "../../components/Text";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { ScreenSubHeader } from "../../components/ScreenHeader";
import { createEvidence, EvidenceType } from "../../db";
import type { GoalId, StepId } from "../../db";
import { saveImageToAppStorage } from "../../utils/imageStorage";
import type { CapturePhotoScreenProps } from "../../navigation/types";
import { styles } from "./CapturePhoto.styles";

const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ["images"],
  allowsEditing: true,
  aspect: [4, 3] as [number, number],
  quality: 0.8,
};

export function CapturePhoto({ route }: CapturePhotoScreenProps) {
  const navigation = useNavigation();
  const { goalId, stepId } = route.params;
  const [busy, setBusy] = useState(false);

  function savePhoto(result: ImagePicker.ImagePickerSuccessResult) {
    setBusy(true);
    try {
      const asset = result.assets[0];
      const savedUri = saveImageToAppStorage(asset.uri);
      createEvidence({
        ...(stepId
          ? { stepId: stepId as StepId }
          : { goalId: goalId as GoalId }),
        type: EvidenceType.photo,
        uri: savedUri,
      });
      navigation.goBack();
    } catch (error) {
      console.error("[CapturePhoto] Failed to save photo", {
        goalId,
        stepId,
        error,
      });
      Alert.alert("Save failed", "Could not save the photo. Please try again.");
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
          "Camera access needed",
          "Please allow camera access in your device settings to take photos.",
        );
        return;
      }
      const result = await ImagePicker.launchCameraAsync(PICKER_OPTIONS);
      if (!result.canceled) {
        savePhoto(result);
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
          "Photo library access needed",
          "Please allow photo library access in your device settings to select photos.",
        );
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS);
      if (!result.canceled) {
        savePhoto(result);
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
          <ActivityIndicator size="large" accessibilityLabel="Saving photo" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenSubHeader
        label="Capture Photo"
        onBack={() => navigation.goBack()}
      />
      <View style={styles.content}>
        <Card>
          <Text variant="headline" style={styles.heading}>
            Add a photo
          </Text>
          <View style={styles.buttonGroup}>
            <Button
              label="Take Photo"
              variant="primary"
              onPress={handleTakePhoto}
            />
            <Button
              label="Choose from Library"
              variant="secondary"
              onPress={handleChooseFromLibrary}
            />
          </View>
        </Card>
      </View>
    </View>
  );
}
