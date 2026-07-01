/**
 * BadgeShareSheet — the Badge Detail screen's single "Share badge" CTA plus the
 * bottom sheet it opens (Track D3 of Epic #384, issue #412).
 *
 * Replaces the old stacked 3-button export Card with one primary CTA and a
 * bottom sheet that writes the trade-off into each of the three export paths:
 *   1. Share verifiable badge  — RECOMMENDED, the provable PNG
 *   2. Save as image           — plain picture, may drop the credential
 *   3. Export credential (JSON)— for verifiers & wallets
 *
 * Pure, prop-driven, and i18n-free (D6): all copy arrives as string props with
 * English defaults; #380 threads t() output through when it wires the screen.
 * The sheet is a plain bottom-anchored Modal (D3) — no gesture library — so it
 * renders open/closed states in Storybook with zero new dependencies.
 */
import React from "react";
import { View, Modal, Pressable, ActivityIndicator } from "react-native";
import {
  ShareNetwork,
  Star,
  Image as ImageIcon,
  CodeBlock,
} from "phosphor-react-native";
import { useUnistyles } from "react-native-unistyles";
import { Text } from "../../components/Text";
import { styles } from "./BadgeShareSheet.styles";

export interface BadgeShareSheetProps {
  /** Goal title, interpolated into the sheet header via {{goalTitle}}. */
  goalTitle: string;
  isSheetOpen: boolean;
  onOpenSheet: () => void;
  onCloseSheet: () => void;
  onShareVerifiable: () => void;
  onSaveImage: () => void;
  onExportCredential: () => void;
  /** Enables the verifiable-badge and save-as-image rows (a real baked image). */
  canShareImage: boolean;
  /** Enables the credential-export row. */
  hasCredential: boolean;
  /** Loading flag shared by the verifiable-badge AND save-as-image rows — the
   *  hook (`useBadgeExport`) sets one flag for both PNG paths. */
  isExportingImage: boolean;
  /** Loading flag for the credential (JSON) row. */
  isExportingJSON: boolean;

  // --- Copy (i18n-free per D6; English defaults, #380 passes t() output). ---
  ctaLabel?: string;
  /** Sheet title template; `{{goalTitle}}` is replaced with `goalTitle`. */
  sheetTitleTemplate?: string;
  sheetSubtitle?: string;
  recommendedLabel?: string;
  verifiableLabel?: string;
  verifiableDetail?: string;
  saveImageLabel?: string;
  saveImageDetail?: string;
  exportCredentialLabel?: string;
  exportCredentialDetail?: string;
}

export function BadgeShareSheet({
  goalTitle,
  isSheetOpen,
  onOpenSheet,
  onCloseSheet,
  onShareVerifiable,
  onSaveImage,
  onExportCredential,
  canShareImage,
  hasCredential,
  isExportingImage,
  isExportingJSON,
  ctaLabel = "Share badge",
  sheetTitleTemplate = "Share “{{goalTitle}}”",
  sheetSubtitle = "Keep it provable, or just share the picture.",
  recommendedLabel = "RECOMMENDED",
  verifiableLabel = "Share verifiable badge",
  verifiableDetail = "A PNG carrying the OB 3.0 credential — provable forever.",
  saveImageLabel = "Save as image",
  saveImageDetail = "Plain picture — may drop the credential.",
  exportCredentialLabel = "Export credential (JSON)",
  exportCredentialDetail = "For verifiers & wallets.",
}: BadgeShareSheetProps) {
  const { theme } = useUnistyles();

  const sheetTitle = sheetTitleTemplate.replace("{{goalTitle}}", goalTitle);

  // A row is inert while it is exporting so the handler can't double-fire.
  const verifiableDisabled = !canShareImage || isExportingImage;
  const saveImageDisabled = !canShareImage || isExportingImage;
  const credentialDisabled = !hasCredential || isExportingJSON;

  return (
    <>
      {/* Bespoke Pressables, not <Button>: the prototype's CTA is a blue
          info-surface bar with a leading vector icon, and the sheet rows are
          two-line (label + trade-off) list items with disabled/loading/
          highlighted states — neither shape the single-line <Button> models
          (D5, Step 1). */}
      {/* eslint-disable-next-line local/no-shared-component-reimplementation */}
      <Pressable
        onPress={onOpenSheet}
        accessible
        accessibilityRole="button"
        accessibilityLabel={ctaLabel}
        testID="badge-share-cta"
        style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
      >
        <ShareNetwork
          size={18}
          weight="bold"
          color={theme.colors.infoForeground}
        />
        <Text variant="body" style={styles.ctaLabel}>
          {ctaLabel}
        </Text>
      </Pressable>

      <Modal
        transparent
        visible={isSheetOpen}
        animationType="slide"
        onRequestClose={onCloseSheet}
        accessibilityViewIsModal
      >
        {/* Tap-outside-to-dismiss convenience; hidden from screen readers so it
            isn't announced as an unlabeled control. The sheet claims the
            responder (onStartShouldSetResponder) so taps inside don't dismiss. */}
        <Pressable
          onPress={onCloseSheet}
          accessible={false}
          testID="badge-share-backdrop"
          style={[
            styles.backdrop,
            { backgroundColor: `${theme.colors.shadow}6b` },
          ]}
        >
          <View style={styles.sheet} onStartShouldSetResponder={() => true}>
            <View style={styles.grabber} />

            <Text
              variant="headline"
              style={styles.sheetTitle}
              accessibilityRole="header"
            >
              {sheetTitle}
            </Text>
            <Text variant="caption" style={styles.sheetSubtitle}>
              {sheetSubtitle}
            </Text>

            {/* Row 1 — verifiable badge (recommended). */}
            {/* eslint-disable-next-line local/no-shared-component-reimplementation */}
            <Pressable
              onPress={onShareVerifiable}
              disabled={verifiableDisabled}
              accessible
              accessibilityRole="button"
              accessibilityLabel={`${verifiableLabel}. ${recommendedLabel}. ${verifiableDetail}`}
              accessibilityState={{
                disabled: verifiableDisabled,
                busy: isExportingImage,
              }}
              testID="share-row-verifiable"
              style={({ pressed }) => [
                styles.rowHighlighted,
                pressed && !verifiableDisabled && styles.rowPressed,
                !canShareImage && styles.rowDisabled,
              ]}
            >
              <View style={styles.rowHighlightedHeader}>
                {isExportingImage ? (
                  <ActivityIndicator
                    size="small"
                    color={theme.colors.infoForeground}
                    testID="share-row-verifiable-loading"
                  />
                ) : (
                  <Star
                    size={18}
                    weight="fill"
                    color={theme.colors.infoForeground}
                  />
                )}
                <Text
                  variant="body"
                  style={[styles.rowLabel, styles.rowLabelOnHighlight]}
                >
                  {verifiableLabel}
                </Text>
                <View style={styles.tag} testID="share-recommended-tag">
                  <Text variant="caption" style={styles.tagLabel}>
                    {recommendedLabel}
                  </Text>
                </View>
              </View>
              <Text
                variant="caption"
                style={[styles.rowDetail, styles.rowDetailOnHighlight]}
              >
                {verifiableDetail}
              </Text>
            </Pressable>

            {/* Rows 2 & 3 share a card container. */}
            <View style={styles.rowCard}>
              {/* eslint-disable-next-line local/no-shared-component-reimplementation */}
              <Pressable
                onPress={onSaveImage}
                disabled={saveImageDisabled}
                accessible
                accessibilityRole="button"
                accessibilityLabel={`${saveImageLabel}. ${saveImageDetail}`}
                accessibilityState={{
                  disabled: saveImageDisabled,
                  busy: isExportingImage,
                }}
                testID="share-row-image"
                style={({ pressed }) => [
                  styles.row,
                  styles.rowDivider,
                  pressed && !saveImageDisabled && styles.rowPressed,
                  !canShareImage && styles.rowDisabled,
                ]}
              >
                {isExportingImage ? (
                  <ActivityIndicator
                    size="small"
                    color={theme.surfaceBorder.surfaceCardFg}
                    testID="share-row-image-loading"
                  />
                ) : (
                  <ImageIcon
                    size={18}
                    weight="regular"
                    color={theme.surfaceBorder.surfaceCardFg}
                  />
                )}
                <View style={styles.rowText}>
                  <Text variant="body" style={styles.rowLabel}>
                    {saveImageLabel}
                  </Text>
                  <Text variant="caption" style={styles.rowDetailWarn}>
                    {saveImageDetail}
                  </Text>
                </View>
              </Pressable>

              {/* eslint-disable-next-line local/no-shared-component-reimplementation */}
              <Pressable
                onPress={onExportCredential}
                disabled={credentialDisabled}
                accessible
                accessibilityRole="button"
                accessibilityLabel={`${exportCredentialLabel}. ${exportCredentialDetail}`}
                accessibilityState={{
                  disabled: credentialDisabled,
                  busy: isExportingJSON,
                }}
                testID="share-row-credential"
                style={({ pressed }) => [
                  styles.row,
                  pressed && !credentialDisabled && styles.rowPressed,
                  !hasCredential && styles.rowDisabled,
                ]}
              >
                {isExportingJSON ? (
                  <ActivityIndicator
                    size="small"
                    color={theme.surfaceBorder.surfaceCardFg}
                    testID="share-row-credential-loading"
                  />
                ) : (
                  <CodeBlock
                    size={18}
                    weight="regular"
                    color={theme.surfaceBorder.surfaceCardFg}
                  />
                )}
                <View style={styles.rowText}>
                  <Text variant="body" style={styles.rowLabel}>
                    {exportCredentialLabel}
                  </Text>
                  <Text variant="caption" style={styles.rowDetail}>
                    {exportCredentialDetail}
                  </Text>
                </View>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}
