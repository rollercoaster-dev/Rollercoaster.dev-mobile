import React, { useState, useRef } from "react";
import {
  View,
  TextInput,
  KeyboardAvoidingView,
  AccessibilityInfo,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { KEYBOARD_AVOIDING_PROPS } from "../../utils/keyboard";
import { useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { useUnistyles } from "react-native-unistyles";
import { Text } from "../../components/Text";
import { Button } from "../../components/Button";
import { Input } from "../../components/Input";
import { ScreenSubHeader } from "../../components/ScreenHeader";
import { createEvidence, EvidenceType, TEXT_EVIDENCE_PREFIX } from "../../db";
import type { GoalId, StepId } from "../../db";
import { reportError } from "../../services/sentry-report";
import { useEvidenceStartBreadcrumb } from "../../hooks/useEvidenceStartBreadcrumb";
import type { CaptureTextNoteScreenProps } from "../../navigation/types";
import { styles } from "./CaptureTextNote.styles";

/** Maximum characters for note content (NonEmptyString1000 constraint) */
const MAX_CONTENT_LENGTH = 1000;

/** Character count threshold to show warning color */
const WARNING_THRESHOLD = 900;

export function CaptureTextNote({ route }: CaptureTextNoteScreenProps) {
  const navigation = useNavigation();
  const { t } = useTranslation("captureText");
  const { theme } = useUnistyles();
  const { goalId, stepId } = route.params;
  const textInputRef = useRef<TextInput>(null);

  const [content, setContent] = useState("");
  const [caption, setCaption] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [saving, setSaving] = useState(false);

  useEvidenceStartBreadcrumb("text");

  const trimmedContent = content.trim();
  const canSave =
    trimmedContent.length > 0 && trimmedContent.length <= MAX_CONTENT_LENGTH;
  const charCount = trimmedContent.length;
  const isNearLimit = charCount >= WARNING_THRESHOLD;
  const isOverLimit = charCount > MAX_CONTENT_LENGTH;

  function handleSave() {
    if (!canSave || saving) return;

    setSaving(true);
    try {
      createEvidence({
        ...(stepId
          ? { stepId: stepId as StepId }
          : { goalId: goalId as GoalId }),
        type: EvidenceType.text,
        uri: `${TEXT_EVIDENCE_PREFIX}${trimmedContent}`,
        description: caption.trim() || undefined,
      });

      AccessibilityInfo.announceForAccessibility(t("a11y.noteSaved"));
      navigation.goBack();
    } catch (error) {
      console.error("[CaptureTextNote] Failed to save text note", {
        goalId,
        stepId,
        error,
      });
      reportError(error, { area: "evidence.capture", kind: "text" });
      Alert.alert(
        t("errors.couldNotSaveTitle"),
        t("errors.couldNotSaveMessage"),
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.container}>
      <ScreenSubHeader label={t("header")} onBack={() => navigation.goBack()} />

      <KeyboardAvoidingView style={styles.content} {...KEYBOARD_AVOIDING_PROPS}>
        <TextInput
          ref={textInputRef}
          style={[styles.textInput, isFocused && styles.textInputFocused]}
          placeholder={t("input.placeholder")}
          placeholderTextColor={theme.colors.textMuted}
          value={content}
          onChangeText={setContent}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          multiline
          textAlignVertical="top"
          autoFocus
          maxLength={MAX_CONTENT_LENGTH + 100}
          accessible
          accessibilityLabel={t("input.label")}
          accessibilityHint={t("input.hint")}
        />

        <View style={styles.captionContainer}>
          <Input
            label={t("caption.label")}
            placeholder={t("caption.placeholder")}
            value={caption}
            onChangeText={setCaption}
            maxLength={1000}
            returnKeyType="done"
          />
        </View>
      </KeyboardAvoidingView>

      <SafeAreaView edges={["bottom"]}>
        <View style={styles.footer}>
          <Text
            variant="caption"
            style={[
              styles.charCount,
              (isNearLimit || isOverLimit) && styles.charCountWarning,
            ]}
            accessibilityLabel={t("charCount.a11y", {
              count: charCount,
              max: MAX_CONTENT_LENGTH,
            })}
          >
            {charCount}/{MAX_CONTENT_LENGTH}
          </Text>
          <Button
            label={t("actions.save")}
            onPress={handleSave}
            disabled={!canSave}
            loading={saving}
          />
        </View>
      </SafeAreaView>
    </View>
  );
}
