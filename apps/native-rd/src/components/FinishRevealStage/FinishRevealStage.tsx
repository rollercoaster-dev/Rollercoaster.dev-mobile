import React, { useEffect } from "react";
import { Pressable, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { BadgeRenderer } from "../../badges/BadgeRenderer";
import { type BadgeDesign } from "../../badges/types";
import type { AnimationPref } from "../../hooks/useAnimationPref";
import { getSpringConfig } from "../../utils/animation";
import { Text } from "../Text";
import { Button } from "../Button";
import { styles } from "./FinishRevealStage.styles";

const DEFAULT_BADGE_SIZE = 200;
const POP_INITIAL_SCALE = 0.85;

export interface FinishRevealStageProps {
  /** Earned badge design, rendered at large size. */
  badgeDesign: BadgeDesign;
  /** Goal title shown under the badge. */
  goalTitle: string;
  /** Pre-formatted earned-date label (caller owns formatting). */
  earnedDateLabel: string;
  /** Mono uppercase eyebrow above the badge ("Earned"). */
  eyebrow?: string;
  /** Primary CTA press handler. */
  onViewBadge: () => void;
  /** Quiet exit-link press handler. */
  onBackToGoals: () => void;
  /** Primary CTA label ("View badge"). */
  viewBadgeLabel?: string;
  /** Underlined text-link label ("Back to goals"). */
  backToGoalsLabel?: string;
  /** Animation preference controlling the badge pop-in (D6). */
  animationPref: AnimationPref;
  /** Preview size in logical pixels. */
  badgeSize?: number;
}

/**
 * Reveal stage of the finishing flow — the earned-badge moment. A full-bleed
 * celebration band (D5 tokens) frames an "Earned" eyebrow, the large badge with
 * a one-shot pop-in scale animation (gated by `animationPref`, D6), the goal
 * title, an earned-date label, a primary "View badge" CTA, and a quiet
 * underlined "Back to goals" link (D7, not a boxed Button variant).
 * Presentational only — navigation is a screen concern (#449). See dev plan for
 * issue #470.
 */
export function FinishRevealStage({
  badgeDesign,
  goalTitle,
  earnedDateLabel,
  eyebrow = "Earned",
  onViewBadge,
  onBackToGoals,
  viewBadgeLabel = "View badge",
  backToGoalsLabel = "Back to goals",
  animationPref,
  badgeSize = DEFAULT_BADGE_SIZE,
}: FinishRevealStageProps) {
  const shouldAnimate = animationPref !== "none";
  // Start at resting scale when motion is off so there is no undersized frame;
  // otherwise start small and spring to full size once mounted.
  const scale = useSharedValue(shouldAnimate ? POP_INITIAL_SCALE : 1);

  useEffect(() => {
    if (shouldAnimate) {
      scale.value = withSpring(1, getSpringConfig(animationPref));
    } else {
      scale.value = 1;
    }
  }, [shouldAnimate, animationPref, scale]);

  const badgeAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <View style={styles.band} testID="finish-reveal-stage">
      <View style={styles.center}>
        <Text variant="mono" style={styles.eyebrow}>
          {eyebrow}
        </Text>
        <Animated.View
          style={[styles.badge, badgeAnimatedStyle]}
          testID="finish-reveal-badge"
        >
          <BadgeRenderer
            design={badgeDesign}
            size={badgeSize}
            testID="finish-reveal-badge-render"
          />
        </Animated.View>
        <Text
          variant="title"
          style={styles.goalTitle}
          accessibilityRole="header"
        >
          {goalTitle}
        </Text>
        <Text variant="mono" style={styles.earnedDate}>
          {earnedDateLabel}
        </Text>
      </View>

      <View style={styles.footer}>
        <Button
          label={viewBadgeLabel}
          onPress={onViewBadge}
          variant="primary"
          size="lg"
          testID="finish-reveal-view-badge"
        />
        <Pressable
          onPress={onBackToGoals}
          accessibilityRole="button"
          accessibilityLabel={backToGoalsLabel}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={styles.backLink}
          testID="finish-reveal-back-to-goals"
        >
          <Text variant="body" style={styles.backLinkText}>
            {backToGoalsLabel}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
