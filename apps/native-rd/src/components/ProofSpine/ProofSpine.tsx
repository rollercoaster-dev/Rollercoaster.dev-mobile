import React from "react";
import { ScrollView, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import type { EvidenceTypeValue } from "../../types/evidence";
import { ProofCard } from "./ProofCard";
import { styles } from "./ProofSpine.styles";

// NOTE: the German `proofSpine.*` strings in `resources/de/badgeDetail.json`
// are a first-draft translation and still need a native-speaker review
// (tracked in #61 / #76), same as the rest of the de namespace.

export interface ProofSpineItem {
  id: string;
  name: string;
  type: EvidenceTypeValue | null;
}

export interface ProofSpineProps {
  evidence: ProofSpineItem[];
  onCardPress: (id: string) => void;
}

export function ProofSpine({ evidence, onCardPress }: ProofSpineProps) {
  const { t } = useTranslation(["badgeDetail"]);

  if (evidence.length === 0) {
    // Honest empty state: name what is absent without a call-to-action. This
    // block is deliberately non-interactive — no button role, no onCardPress.
    return (
      <View style={styles.container}>
        {/* Empty state shows the plain "THE PROOF" label only — no count or
            "SWIPE →" hint, since there is nothing to swipe (matches prototype). */}
        <Text style={styles.header}>{t("badgeDetail:proofSpine.title")}</Text>
        <View
          style={styles.emptyState}
          accessible
          accessibilityLabel={t("badgeDetail:proofSpine.a11y.emptyStateLabel")}
        >
          <Text style={styles.emptyStateText}>
            {t("badgeDetail:proofSpine.emptyState.message")}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>
        {t("badgeDetail:proofSpine.header", { count: evidence.length })}
      </Text>
      {/* role="list" + a count-aware label mirror BadgeDetailScreen's
          evidenceList treatment; no `accessible` on the wrapper so each card
          stays an individually focusable node. */}
      <View
        accessibilityRole="list"
        accessibilityLabel={t("badgeDetail:proofSpine.a11y.listLabel", {
          count: evidence.length,
        })}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {evidence.map((item) => (
            <ProofCard
              key={item.id}
              id={item.id}
              name={item.name}
              type={item.type}
              onCardPress={onCardPress}
            />
          ))}
        </ScrollView>
      </View>
    </View>
  );
}
