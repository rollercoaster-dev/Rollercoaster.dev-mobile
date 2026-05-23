/**
 * Voice Memo capture screen.
 *
 * Records audio via device microphone, provides playback preview,
 * and saves the recording as evidence attached to a goal or step.
 */
import React, { useState } from "react";
import { View, TextInput, Alert, Pressable, Linking } from "react-native";
import { useUnistyles } from "react-native-unistyles";
import { useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { Text } from "../../components/Text";
import { Card } from "../../components/Card";
import { Button } from "../../components/Button";
import { IconButton } from "../../components/IconButton";
import { ScreenSubHeader } from "../../components/ScreenHeader";
import { useAudioRecorder } from "../../hooks/useAudioRecorder";
import { createEvidence, EvidenceType } from "../../db";
import type { GoalId, StepId } from "../../db";
import { reportError } from "../../services/sentry-report";
import { Logger } from "../../shims/rd-logger";
import type { CaptureVoiceMemoScreenProps } from "../../navigation/types";
import { styles } from "./VoiceMemoScreen.styles";

const logger = new Logger("VoiceMemoScreen");

/** Format milliseconds as MM:SS */
function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

export function VoiceMemoScreen({ route }: CaptureVoiceMemoScreenProps) {
  const navigation = useNavigation();
  const { theme } = useUnistyles();
  const { t } = useTranslation(["captureVoice", "common", "permissions"]);
  const { goalId, stepId } = route.params;
  const [caption, setCaption] = useState("");

  const {
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
  } = useAudioRecorder();

  function handleGoBack() {
    if (
      status === "recording" ||
      status === "paused" ||
      status === "recorded" ||
      status === "playing"
    ) {
      Alert.alert(
        t("captureVoice:discardUnsaved.title"),
        t("captureVoice:discardUnsaved.message"),
        [
          { text: t("captureVoice:discardUnsaved.keep"), style: "cancel" },
          {
            text: t("captureVoice:discardUnsaved.discard"),
            style: "destructive",
            onPress: async () => {
              await reset();
              navigation.goBack();
            },
          },
        ],
      );
    } else {
      navigation.goBack();
    }
  }

  async function handleSave() {
    if (!uri) return;

    try {
      const metadata = JSON.stringify({
        durationMs,
        format: "m4a",
      });

      createEvidence({
        ...(stepId
          ? { stepId: stepId as StepId }
          : { goalId: goalId as GoalId }),
        type: EvidenceType.voice_memo,
        uri,
        description: caption.trim() || undefined,
        metadata,
      });

      navigation.goBack();
    } catch (err) {
      logger.error("Failed to save voice memo", { error: err });
      reportError(err, { area: "evidence.capture", kind: "voice_memo" });
      Alert.alert(
        t("captureVoice:errors.saveFailedTitle"),
        t("captureVoice:errors.saveFailedMessage"),
      );
    }
  }

  function handleOpenSettings() {
    Linking.openSettings();
  }

  // Permission denied state
  if (status === "permission-denied") {
    return (
      <View style={styles.container}>
        <ScreenSubHeader
          label={t("captureVoice:title")}
          onBack={() => navigation.goBack()}
        />
        <View style={styles.content}>
          <Card>
            <View style={styles.permissionContent}>
              <Text style={styles.permissionIcon} accessibilityElementsHidden>
                {"\uD83C\uDF99\uFE0F"}
              </Text>
              <Text variant="headline" accessibilityRole="header">
                {t("permissions:microphone.title")}
              </Text>
              <Text variant="body" style={styles.permissionText}>
                {t("permissions:microphone.message")}
              </Text>
              <Button
                label={t("permissions:microphone.settingsCta")}
                variant="primary"
                onPress={handleOpenSettings}
              />
              <Button
                label={t("captureVoice:actions.tryAgain")}
                variant="secondary"
                onPress={startRecording}
              />
            </View>
          </Card>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenSubHeader label={t("captureVoice:title")} onBack={handleGoBack} />

      <View style={styles.content}>
        {/* Timer display */}
        <Text
          style={styles.timerText}
          accessibilityLabel={t("captureVoice:a11y.timerLabel", {
            time: formatDuration(
              status === "playing" ? playbackPositionMs : durationMs,
            ),
          })}
          accessibilityLiveRegion="polite"
        >
          {formatDuration(
            status === "playing" ? playbackPositionMs : durationMs,
          )}
        </Text>

        {/* Status indicator */}
        <View style={styles.statusRow}>
          {status === "recording" && (
            <View
              style={styles.recordingIndicator}
              accessibilityElementsHidden
            />
          )}
          <Text variant="caption" style={styles.statusText}>
            {status === "idle" && t("captureVoice:status.idle")}
            {status === "requesting-permission" &&
              t("captureVoice:status.requestingPermission")}
            {status === "recording" && t("captureVoice:status.recording")}
            {status === "paused" && t("captureVoice:status.paused")}
            {status === "recorded" && t("captureVoice:status.recorded")}
            {status === "playing" && t("captureVoice:status.playing")}
          </Text>
        </View>

        {/* Error display */}
        {error && (
          <Card>
            <Text variant="body" style={styles.errorText}>
              {error}
            </Text>
            <Button
              label={t("common:actions.dismiss")}
              variant="ghost"
              onPress={() => reset()}
            />
          </Card>
        )}

        {/* Recording controls */}
        {(status === "idle" ||
          status === "recording" ||
          status === "paused") && (
          <View style={styles.controls}>
            {status === "recording" && (
              <IconButton
                icon={
                  <View style={styles.pauseIcon}>
                    <View style={styles.pauseIconBar} />
                    <View style={styles.pauseIconBar} />
                  </View>
                }
                onPress={pauseRecording}
                tone="surface"
                accessibilityLabel={t("captureVoice:a11y.pauseRecording")}
                size="md"
              />
            )}
            {status === "paused" && (
              <IconButton
                icon={<View style={styles.playIcon} />}
                onPress={resumeRecording}
                tone="surface"
                accessibilityLabel={t("captureVoice:a11y.resumeRecording")}
                size="md"
              />
            )}

            <Pressable
              onPress={status === "idle" ? startRecording : stopRecording}
              accessible
              accessibilityRole="button"
              accessibilityLabel={
                status === "idle"
                  ? t("captureVoice:a11y.startRecording")
                  : t("captureVoice:a11y.stopRecording")
              }
              style={({ pressed }) => [
                styles.recordButton,
                pressed && styles.recordButtonPressed,
              ]}
            >
              {status === "idle" ? (
                <View style={styles.recordButtonIdle} />
              ) : (
                <View style={styles.recordButtonInner} />
              )}
            </Pressable>
          </View>
        )}

        {/* Playback controls (after recording) */}
        {(status === "recorded" || status === "playing") && (
          <>
            <View style={styles.playbackControls}>
              {status === "playing" ? (
                <Button
                  label={t("captureVoice:actions.stop")}
                  variant="secondary"
                  onPress={stopPlayback}
                />
              ) : (
                <Button
                  label={t("captureVoice:actions.play")}
                  variant="secondary"
                  onPress={startPlayback}
                />
              )}
              <Button
                label={t("captureVoice:actions.reRecord")}
                variant="ghost"
                onPress={reset}
              />
            </View>

            {/* Playback progress bar */}
            {status === "playing" && durationMs > 0 && (
              <View
                style={styles.playbackProgress}
                accessible
                accessibilityRole="progressbar"
                accessibilityValue={{
                  min: 0,
                  max: 100,
                  now: Math.round((playbackPositionMs / durationMs) * 100),
                }}
              >
                <View
                  style={[
                    styles.playbackProgressFill,
                    {
                      width: `${Math.round((playbackPositionMs / durationMs) * 100)}%`,
                    },
                  ]}
                />
              </View>
            )}

            {/* Save section */}
            <View style={styles.saveSection}>
              <TextInput
                style={styles.captionInput}
                placeholder={t("captureVoice:caption.placeholder")}
                placeholderTextColor={theme.colors.textMuted}
                value={caption}
                onChangeText={setCaption}
                maxLength={200}
                returnKeyType="done"
                accessible
                accessibilityLabel={t("captureVoice:caption.a11yLabel")}
              />
              <View style={styles.buttonRow}>
                <View style={styles.buttonFlex}>
                  <Button
                    label={t("captureVoice:actions.attach")}
                    variant="primary"
                    onPress={handleSave}
                  />
                </View>
                <View style={styles.buttonFlex}>
                  <Button
                    label={t("captureVoice:actions.discard")}
                    variant="destructive"
                    onPress={() => {
                      Alert.alert(
                        t("captureVoice:discardConfirm.title"),
                        t("captureVoice:discardConfirm.message"),
                        [
                          {
                            text: t("captureVoice:discardConfirm.keep"),
                            style: "cancel",
                          },
                          {
                            text: t("captureVoice:discardConfirm.discard"),
                            style: "destructive",
                            onPress: () => {
                              reset();
                            },
                          },
                        ],
                      );
                    }}
                  />
                </View>
              </View>
            </View>
          </>
        )}
      </View>
    </View>
  );
}
