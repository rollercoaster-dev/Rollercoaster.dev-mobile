import React, { useState } from "react";
import { View, Alert, ScrollView } from "react-native";
import { KeyboardAvoidingFrame } from "../../components/KeyboardAvoidingFrame";
import { useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { Text } from "../../components/Text";
import { Card } from "../../components/Card";
import { Button } from "../../components/Button";
import { Input } from "../../components/Input";
import { ScreenSubHeader } from "../../components/ScreenHeader";
import { createEvidence, EvidenceType } from "../../db";
import type { GoalId, StepId } from "../../db";
import { reportError } from "../../services/sentry-report";
import { useEvidenceStartBreadcrumb } from "../../hooks/useEvidenceStartBreadcrumb";
import { useTabScreenContentInset } from "../../navigation/useTabScreenContentInset";
import type { CaptureLinkScreenProps } from "../../navigation/types";
import { isValidUrl, normalizeUrl } from "../../utils/url";
import { styles } from "./CaptureLinkScreen.styles";

export function CaptureLinkScreen({ route }: CaptureLinkScreenProps) {
  const navigation = useNavigation();
  const { t } = useTranslation(["captureLink", "common"]);
  const { goalId, stepId } = route.params;
  const tabInset = useTabScreenContentInset();

  const [url, setUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [urlError, setUrlError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  useEvidenceStartBreadcrumb("link");

  const trimmedUrl = normalizeUrl(url);
  const hasValidUrl = isValidUrl(trimmedUrl);

  function handleUrlChange(text: string) {
    setUrl(text);
    // Clear error when the user starts typing
    if (urlError) {
      setUrlError(undefined);
    }
  }

  function validateUrl(): boolean {
    if (!trimmedUrl) {
      setUrlError(t("captureLink:validation.urlRequired"));
      return false;
    }
    if (!hasValidUrl) {
      setUrlError(t("captureLink:validation.urlInvalid"));
      return false;
    }
    return true;
  }

  function handleSave() {
    if (!validateUrl()) return;

    setSaving(true);
    try {
      createEvidence({
        ...(stepId
          ? { stepId: stepId as StepId }
          : { goalId: goalId as GoalId }),
        type: EvidenceType.link,
        uri: trimmedUrl,
        description: caption.trim() || undefined,
      });
      navigation.goBack();
    } catch (error) {
      console.error("[CaptureLinkScreen] Failed to save link evidence", {
        error,
      });
      reportError(error, { area: "evidence.capture", kind: "link" });
      Alert.alert(
        t("captureLink:errors.couldNotSaveTitle"),
        t("captureLink:errors.couldNotSaveMessage"),
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.container}>
      <ScreenSubHeader
        label={t("captureLink:title")}
        onBack={() => navigation.goBack()}
      />

      {/* The frame shrinks the scroll viewport to the space above the keyboard;
          header stays outside so no vertical offset is needed. Save/Cancel
          scroll with the body (not a pinned footer), so they are reachable at
          any text size, and taps on them survive an open keyboard. */}
      <KeyboardAvoidingFrame style={styles.keyboardFrame}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.content, tabInset]}
          keyboardShouldPersistTaps="handled"
          testID="capture-link-scroll"
        >
          <View style={styles.inputSection}>
            <Input
              label={t("captureLink:urlInput.label")}
              placeholder={t("captureLink:urlInput.placeholder")}
              value={url}
              onChangeText={handleUrlChange}
              error={urlError}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              // "done", not "next": nothing is wired to advance focus to the
              // caption (Input exposes no ref), so the key blurs and dismisses.
              returnKeyType="done"
              textContentType="URL"
              testID="capture-link-url"
            />

            <Input
              label={t("captureLink:captionInput.label")}
              placeholder={t("captureLink:captionInput.placeholder")}
              value={caption}
              onChangeText={setCaption}
              maxLength={1000}
              returnKeyType="done"
              testID="capture-link-caption"
            />
          </View>

          {hasValidUrl && (
            <Card>
              <View style={styles.previewCard}>
                <Text style={styles.previewIcon} accessibilityElementsHidden>
                  {"\u{1F517}"}
                </Text>
                <Text
                  variant="body"
                  style={styles.previewUrl}
                  numberOfLines={2}
                  accessibilityLabel={t("captureLink:preview.a11y", {
                    url: trimmedUrl,
                  })}
                >
                  {trimmedUrl}
                </Text>
                {caption.trim() ? (
                  <Text variant="caption">{caption.trim()}</Text>
                ) : null}
              </View>
            </Card>
          )}

          <View style={styles.actions}>
            <Button
              label={t("captureLink:actions.save")}
              variant="primary"
              onPress={handleSave}
              disabled={saving}
              loading={saving}
              testID="capture-link-save"
            />
            <Button
              label={t("common:actions.cancel")}
              variant="secondary"
              onPress={() => navigation.goBack()}
              disabled={saving}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingFrame>
    </View>
  );
}
