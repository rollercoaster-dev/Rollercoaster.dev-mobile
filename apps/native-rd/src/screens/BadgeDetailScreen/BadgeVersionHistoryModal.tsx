import React, { useState } from "react";
import {
  View,
  Modal,
  ScrollView,
  Pressable,
  Image,
  type ImageSourcePropType,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useUnistyles } from "react-native-unistyles";
import { Text } from "../../components/Text";
import { Card } from "../../components/Card";
import { Button } from "../../components/Button";
import { IconButton } from "../../components/IconButton";
import { PLACEHOLDER_IMAGE_URI } from "../../hooks/useCreateBadge";
import { formatDate } from "../../utils/format";
import { styles } from "./BadgeVersionHistoryModal.styles";

/**
 * Minimal shape of a badge row needed for the version-history surface.
 * Deliberately structural so callers can pass query results without
 * re-shaping or branding.
 */
export interface BadgeVersionRow {
  id: string;
  credential: string | null;
  imageUri: string | null;
  createdAt: string | null;
  isDeleted: 0 | 1 | null;
}

interface BadgeVersionHistoryModalProps {
  visible: boolean;
  onClose: () => void;
  /** Newest first. Includes both active and soft-deleted rows. */
  versions: readonly BadgeVersionRow[];
  goalTitle: string;
}

/** Pull the credential's issuedOn timestamp; falls back to createdAt for display. */
function extractIssuedOn(credentialJson: string | null): string | null {
  if (!credentialJson) return null;
  try {
    const parsed: unknown = JSON.parse(credentialJson);
    const validFrom = (parsed as { validFrom?: unknown })?.validFrom;
    const issuedOn = (parsed as { issuedOn?: unknown })?.issuedOn;
    if (typeof validFrom === "string") return validFrom;
    if (typeof issuedOn === "string") return issuedOn;
    return null;
  } catch {
    return null;
  }
}

/**
 * Pretty-print a credential's JSON. If parsing fails, fall back to the raw
 * string so the user always sees *something* — a malformed credential is
 * still useful as a diagnostic.
 */
function prettyJson(s: string | null): string {
  if (!s) return "";
  try {
    return JSON.stringify(JSON.parse(s), null, 2);
  } catch {
    return s;
  }
}

/**
 * Read-only history surface for a goal's badge versions.
 *
 * v1 deliberately does NOT offer a "restore" action — the audit trail is the
 * point. Restoring a prior version is tracked as a follow-up.
 */
export function BadgeVersionHistoryModal({
  visible,
  onClose,
  versions,
  goalTitle,
}: BadgeVersionHistoryModalProps) {
  const { theme } = useUnistyles();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Reset the selected viewer whenever the modal closes — opening it next
  // time should land on the list, not a stale credential viewer.
  React.useEffect(() => {
    if (!visible) setSelectedId(null);
  }, [visible]);

  const total = versions.length;
  const selectedRow = versions.find((v) => v.id === selectedId) ?? null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      accessibilityViewIsModal
    >
      <View
        style={[
          styles.overlay,
          { backgroundColor: `${theme.colors.shadow}80` },
        ]}
      >
        <SafeAreaView edges={["bottom"]} style={styles.container}>
          <Card size="normal">
            {selectedRow ? (
              <CredentialViewer
                row={selectedRow}
                onBack={() => setSelectedId(null)}
                goalTitle={goalTitle}
              />
            ) : (
              <View
                accessible
                accessibilityLabel={`Badge version history for ${goalTitle}`}
              >
                <View style={styles.header}>
                  <Text
                    variant="headline"
                    style={styles.title}
                    accessibilityRole="header"
                  >
                    Version history
                  </Text>
                </View>
                <ScrollView
                  contentContainerStyle={styles.scrollContent}
                  showsVerticalScrollIndicator={false}
                >
                  {versions.map((row, index) => {
                    const versionNumber = total - index;
                    const isCurrent = !row.isDeleted;
                    const issuedOn =
                      extractIssuedOn(row.credential) ?? row.createdAt;
                    return (
                      // Intentional Pressable, not Button: rows carry a
                      // thumbnail, version label, date, and "Current" pill —
                      // richer than Button supports.
                      // eslint-disable-next-line local/no-shared-component-reimplementation
                      <Pressable
                        key={row.id}
                        onPress={() => setSelectedId(row.id)}
                        accessibilityRole="button"
                        accessibilityLabel={`View credential for v${versionNumber}${
                          isCurrent ? ", current" : ""
                        }`}
                        style={styles.versionRow}
                        testID={`badge-version-row-${row.id}`}
                      >
                        <VersionThumbnail
                          imageUri={row.imageUri}
                          alt={`Badge thumbnail for v${versionNumber}`}
                        />
                        <View style={styles.versionMeta}>
                          <Text style={styles.versionLabel}>
                            v{versionNumber}
                          </Text>
                          <Text style={styles.versionDate}>
                            {formatDate(issuedOn)}
                          </Text>
                        </View>
                        {isCurrent ? (
                          <View style={styles.currentBadge}>
                            <Text style={styles.currentBadgeText}>Current</Text>
                          </View>
                        ) : null}
                      </Pressable>
                    );
                  })}
                </ScrollView>
                <View style={styles.closeRow}>
                  <Button label="Close" onPress={onClose} variant="secondary" />
                </View>
              </View>
            )}
          </Card>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

function VersionThumbnail({
  imageUri,
  alt,
}: {
  imageUri: string | null;
  alt: string;
}) {
  const isReal = imageUri && imageUri !== PLACEHOLDER_IMAGE_URI;
  if (!isReal) {
    return (
      <View
        style={[styles.thumbnail, styles.thumbnailPlaceholder]}
        accessible
        accessibilityRole="image"
        accessibilityLabel={alt}
      >
        <Text style={styles.thumbnailInitial}>?</Text>
      </View>
    );
  }
  const source: ImageSourcePropType = { uri: imageUri };
  return (
    <Image
      source={source}
      style={styles.thumbnail}
      resizeMode="contain"
      accessibilityLabel={alt}
    />
  );
}

function CredentialViewer({
  row,
  onBack,
  goalTitle,
}: {
  row: BadgeVersionRow;
  onBack: () => void;
  goalTitle: string;
}) {
  return (
    <View
      accessible
      accessibilityLabel={`Credential JSON for ${goalTitle} badge version`}
    >
      <View style={styles.viewerHeader}>
        <IconButton
          icon={<Text>{"←"}</Text>}
          onPress={onBack}
          tone="chrome"
          accessibilityLabel="Back to version list"
        />
        <Text variant="headline" style={styles.title}>
          Credential
        </Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView
        style={styles.credentialBox}
        contentContainerStyle={{ paddingRight: 8 }}
      >
        <Text style={styles.credentialText} selectable>
          {prettyJson(row.credential)}
        </Text>
      </ScrollView>
    </View>
  );
}
