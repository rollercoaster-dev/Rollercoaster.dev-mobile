import React, { useState, useRef } from "react";
import {
  View,
  TextInput,
  AccessibilityInfo,
  Alert,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useReanimatedKeyboardAnimation } from "react-native-keyboard-controller";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
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
import { useTabScreenContentInset } from "../../navigation/useTabScreenContentInset";
import type { CaptureTextNoteScreenProps } from "../../navigation/types";
import { styles } from "./CaptureTextNote.styles";

/** Maximum characters for note content (NonEmptyString1000 constraint) */
const MAX_CONTENT_LENGTH = 1000;

/** Character count threshold to show warning color */
const WARNING_THRESHOLD = 900;

export function CaptureTextNote({ route }: CaptureTextNoteScreenProps) {
  const navigation = useNavigation();
  const { t } = useTranslation(["captureText"]);
  const { theme } = useUnistyles();
  const { goalId, stepId } = route.params;
  const textInputRef = useRef<TextInput>(null);
  const { paddingBottom: tabBarInset } = useTabScreenContentInset();
  const insets = useSafeAreaInsets();
  // height.value: 0 when keyboard closed, -keyboardHeight when open.
  // Reanimated lets the padding interpolate in lockstep with the keyboard.
  const { height } = useReanimatedKeyboardAnimation();
  // iOS folds the bottom safe area into the keyboard frame, so strip it to
  // keep the footer flush. Android's keyboard-controller already subtracts
  // the navigation-bar inset, so subtracting again would under-pad and let
  // the keyboard cover the Save button on devices with a bottom inset.
  const bottomInsetOffset = Platform.OS === "ios" ? insets.bottom : 0;
  const contentAnimatedStyle = useAnimatedStyle(() => {
    const keyboardPad = Math.max(0, -height.value - bottomInsetOffset);
    return {
      paddingBottom: Math.max(tabBarInset, keyboardPad),
    };
  });

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

      AccessibilityInfo.announceForAccessibility(
        t("captureText:a11y.noteSaved"),
      );
      navigation.goBack();
    } catch (error) {
      console.error("[CaptureTextNote] Failed to save text note", {
        goalId,
        stepId,
        error,
      });
      reportError(error, { area: "evidence.capture", kind: "text" });
      Alert.alert(
        t("captureText:errors.couldNotSaveTitle"),
        t("captureText:errors.couldNotSaveMessage"),
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.container}>
      <ScreenSubHeader
        label={t("captureText:title")}
        onBack={() => navigation.goBack()}
      />

      <Animated.View style={[styles.content, contentAnimatedStyle]}>
        {/* eslint-disable-next-line local/no-shared-component-reimplementation */}
        <TextInput
          ref={textInputRef}
          style={[styles.textInput, isFocused && styles.textInputFocused]}
          placeholder={t("captureText:input.placeholder")}
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
          accessibilityLabel={t("captureText:input.label")}
          accessibilityHint={t("captureText:input.hint")}
        />

        <View style={styles.captionContainer}>
          <Input
            label={t("captureText:caption.label")}
            placeholder={t("captureText:caption.placeholder")}
            value={caption}
            onChangeText={setCaption}
            maxLength={1000}
            returnKeyType="done"
          />
        </View>

        <View style={styles.footer}>
          <Text
            variant="caption"
            style={[
              styles.charCount,
              (isNearLimit || isOverLimit) && styles.charCountWarning,
            ]}
            accessibilityLabel={t("captureText:charCount.a11y", {
              count: charCount,
              max: MAX_CONTENT_LENGTH,
            })}
          >
            {charCount}/{MAX_CONTENT_LENGTH}
          </Text>
          <Button
            label={t("captureText:actions.save")}
            onPress={handleSave}
            disabled={!canSave}
            loading={saving}
          />
        </View>
      </Animated.View>
    </View>
  );
}
