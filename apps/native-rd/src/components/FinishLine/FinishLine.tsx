import React from "react";
import { Pressable, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { BadgeRenderer } from "../../badges/BadgeRenderer";
import type { BadgeDesign } from "../../badges/types";
import { TimelineNode } from "../TimelineNode";
import { TimelineEvidenceCard } from "../TimelineEvidenceCard";
import type { EvidenceItemData } from "../EvidenceDrawer";
import { styles, BADGE_PREVIEW_SIZE } from "./FinishLine.styles";

export interface FinishLineProps {
  goalTitle: string;
  /** Parsed badge design, or null when the goal has no design yet. */
  badgeDesign: BadgeDesign | null;
  /** Paints the goal star celebration-yellow once every step is complete. */
  allStepsComplete: boolean;
  /** Fired by the "Finish & design badge" CTA row. Navigation is #378's wiring. */
  onBadgePress: () => void;
  goalEvidence: EvidenceItemData[];
  onEvidencePress: (evidenceId: string) => void;
}

/**
 * FinishLine — the timeline's keepsake terminal (#452). A tappable
 * "Finish & design badge" row with a monogram-or-real badge preview, a star
 * that celebrates only once every step is done, and goal evidence rendered
 * only when present (never an absence message).
 */
export function FinishLine({
  goalTitle,
  badgeDesign,
  allStepsComplete,
  onBadgePress,
  goalEvidence,
  onEvidencePress,
}: FinishLineProps) {
  const { t } = useTranslation(["timelineJourney"]);
  // Mirrors BadgeWallCell's undesigned-badge monogram exactly.
  const letter = (goalTitle.trim().charAt(0) || "?").toUpperCase();

  return (
    <View style={styles.container}>
      <View style={styles.nodeColumn}>
        <TimelineNode
          status="completed"
          isGoalNode
          celebrate={allStepsComplete}
          accessibilityLabel={t("timelineJourney:finishLine.a11yNode")}
        />
      </View>
      <View style={styles.contentCard}>
        <Pressable
          accessible
          accessibilityRole="button"
          accessibilityLabel={t("timelineJourney:finishLine.ctaA11yLabel")}
          onPress={onBadgePress}
          style={styles.ctaRow}
        >
          {badgeDesign ? (
            <BadgeRenderer
              design={badgeDesign}
              size={BADGE_PREVIEW_SIZE}
              testID="finish-line-badge-preview"
            />
          ) : (
            <View style={styles.badgeFallback}>
              <Text style={styles.badgeFallbackText}>{letter}</Text>
            </View>
          )}
          <View style={styles.ctaTextColumn}>
            <Text style={styles.ctaTitle}>
              {t("timelineJourney:finishLine.ctaTitle")}
            </Text>
            <Text style={styles.ctaSubtitle}>
              {badgeDesign
                ? t("timelineJourney:finishLine.ctaSubtitleDesigned")
                : t("timelineJourney:finishLine.ctaSubtitleUndesigned", {
                    letter,
                  })}
            </Text>
          </View>
        </Pressable>
        {goalEvidence.length > 0 ? (
          <View style={styles.evidenceList}>
            {goalEvidence.map((ev) => (
              <TimelineEvidenceCard
                key={ev.id}
                evidence={ev}
                isGoal
                onPress={onEvidencePress}
              />
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );
}
