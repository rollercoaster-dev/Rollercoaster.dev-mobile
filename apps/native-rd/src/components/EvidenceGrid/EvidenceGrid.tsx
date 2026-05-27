import React from "react";
import { View, Text, Alert } from "react-native";
import { useTranslation } from "react-i18next";
import * as Haptics from "expo-haptics";
import { Button } from "../Button";
import { EvidenceThumbnail, type Evidence } from "../EvidenceThumbnail";
import { styles } from "./EvidenceGrid.styles";

export interface EvidenceGridProps {
  evidences: Evidence[];
  onPress?: (evidence: Evidence) => void;
  onDelete?: (evidence: Evidence) => void;
  onAdd?: () => void;
}

export function EvidenceGrid({
  evidences,
  onPress,
  onDelete,
  onAdd,
}: EvidenceGridProps) {
  const { t } = useTranslation();

  function handleLongPress(evidence: Evidence) {
    if (!onDelete) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      t("evidenceGrid.deleteTitle"),
      t("evidenceGrid.deleteMessage"),
      [
        { text: t("actions.cancel"), style: "cancel" },
        {
          text: t("actions.delete"),
          style: "destructive",
          onPress: () => onDelete(evidence),
        },
      ],
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerLabel}>
          Evidence{evidences.length > 0 ? ` (${evidences.length})` : ""}
        </Text>
      </View>
      {evidences.length === 0 ? (
        <Text style={styles.emptyText}>No evidence yet</Text>
      ) : (
        <View style={styles.grid}>
          {evidences.map((evidence) => (
            <View key={evidence.id} style={styles.item}>
              <EvidenceThumbnail
                evidence={evidence}
                onPress={onPress ? () => onPress(evidence) : undefined}
                onLongPress={
                  onDelete ? () => handleLongPress(evidence) : undefined
                }
              />
            </View>
          ))}
        </View>
      )}
      {onAdd && (
        <Button label="Add Evidence" variant="secondary" onPress={onAdd} />
      )}
    </View>
  );
}
