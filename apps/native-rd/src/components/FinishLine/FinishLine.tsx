import React from "react";
import { Pressable, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { BadgeRenderer } from "../../badges/BadgeRenderer";
import type { BadgeDesign } from "../../badges/types";
import { TimelineNode } from "../TimelineNode";
import { TimelineEvidenceCard } from "../TimelineEvidenceCard";
import type { EvidenceItemData } from "../../types/evidence";
import { styles, BADGE_PREVIEW_SIZE } from "./FinishLine.styles";

export interface FinishLineProps {
  goalTitle: string;
  /** Parsed badge design, or null when the goal has no design yet. */
  badgeDesign: BadgeDesign | null;
  /** Paints the goal star celebration-yellow once every step is complete. */
  allStepsComplete: boolean;
  /** Fired by the CTA row. Navigation is #378's wiring. */
  onBadgePress: () => void;
  /**
   * True once the goal is completed and its badge is on record. The CTA then
   * reads "View badge": the flow it opens lands on the read-only reveal
   * (#563), so "Finish & design" would promise an edit that cannot happen.
   */
  sealed: boolean;
  goalEvidence: EvidenceItemData[];
  onEvidencePress: (evidenceId: string) => void;
}

/**
 * FinishLine — the timeline's keepsake terminal (#452). A tappable
 * "Finish & design badge" row ("View badge" once the goal is sealed, #653)
 * with a monogram-or-real badge preview, a star that celebrates only once
 * every step is done, and goal evidence rendered only when present (never an
 * absence message).
 */
export function FinishLine({
  goalTitle,
  badgeDesign,
  allStepsComplete,
  onBadgePress,
  sealed,
  goalEvidence,
  onEvidencePress,
}: FinishLineProps) {
  const { t } = useTranslation(["timelineJourney"]);
  // Shares BadgeWallCell's undesigned-badge initial while FinishLine owns
  // the preview sizing.
  const letter = (goalTitle.trim().charAt(0) || "?").toUpperCase();
  const ctaTitle = sealed
    ? t("timelineJourney:finishLine.sealedCtaTitle")
    : t("timelineJourney:finishLine.ctaTitle");
  const ctaA11yLabel = sealed
    ? t("timelineJourney:finishLine.sealedCtaA11yLabel")
    : t("timelineJourney:finishLine.ctaA11yLabel");
  let ctaSubtitle: string;
  if (sealed) {
    ctaSubtitle = t("timelineJourney:finishLine.sealedCtaSubtitle");
  } else if (badgeDesign) {
    ctaSubtitle = t("timelineJourney:finishLine.ctaSubtitleDesigned");
  } else {
    ctaSubtitle = t("timelineJourney:finishLine.ctaSubtitleUndesigned", {
      letter,
    });
  }

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
          accessibilityLabel={ctaA11yLabel}
          onPress={onBadgePress}
          style={styles.ctaRow}
          testID="finish-line-cta"
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
            <Text style={styles.ctaTitle}>{ctaTitle}</Text>
            <Text style={styles.ctaSubtitle}>{ctaSubtitle}</Text>
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
