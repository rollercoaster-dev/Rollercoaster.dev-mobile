import React from "react";
import { Pressable, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useUnistyles } from "react-native-unistyles";
import Svg, { Circle } from "react-native-svg";
import { Play, PushPin } from "phosphor-react-native";
import { ProgressRing } from "../../components/ProgressRing";
import { ProgressBar } from "../../components/ProgressBar";
import { Button } from "../../components/Button";
import { IconButton, type IconButtonTone } from "../../components/IconButton";
import { Text } from "../../components/Text";
import { styles } from "./GoalsCockpit.styles";

export interface CockpitHeroGoal {
  id: string;
  title: string;
  /** Next actionable step headline, or null when there is no pending work. */
  nextStepTitle: string | null;
  /** Completed / total ratio, 0..1. */
  progress: number;
  stepsCompleted: number;
  stepsTotal: number;
}

export interface CockpitKeepWarmGoal {
  id: string;
  title: string;
  nextStepTitle: string | null;
  progress: number;
}

export interface GoalsCockpitProps {
  /** The most-recently-worked active goal, or null to render the empty state. */
  hero: CockpitHeroGoal | null;
  /** Remaining active goals, rendered as compact cards below the hero. */
  keepWarm: CockpitKeepWarmGoal[];
  onStartResume: (goalId: string) => void;
  onOpenGoal: (goalId: string) => void;
  onNewGoal: () => void;
  /** Long-press a hero or keep-warm card to delete its goal (D14). */
  onDeleteGoal: (goalId: string) => void;
  /** True when the hero holds the slot because it is pinned, not by recency. */
  heroIsPinned: boolean;
  onPinGoal: (goalId: string) => void;
  onUnpinGoal: () => void;
}

/** Concentric-circle "target" reticle for the empty state (matches the Goals
 * nav glyph + the prototype's empty illustration). */
function TargetIcon({ color }: { color: string }) {
  return (
    <Svg width={34} height={34} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={9} stroke={color} strokeWidth={2.5} />
      <Circle cx={12} cy={12} r={4} stroke={color} strokeWidth={2.5} />
    </Svg>
  );
}

/**
 * The cockpit's pin affordance (#396 D4), shared by the hero and every
 * keep-warm tile so the control is identical wherever it appears — learned
 * once, recognised everywhere.
 *
 * One glyph in two weights rather than PushPin/PushPinSlash: the tile's
 * silhouette stays put when toggling, so the state change reads as a fill
 * change, not a shape swap — calmer under autismFriendly/lowInfo. The state
 * also rides `accessibilityState.selected` and the label, so it is never
 * carried by the visual alone.
 */
function PinToggle({
  isPinned,
  title,
  tone,
  onPress,
  testID,
}: {
  isPinned: boolean;
  title: string;
  tone: IconButtonTone;
  onPress: () => void;
  testID: string;
}) {
  const { t } = useTranslation(["goals"]);
  return (
    <IconButton
      // No color prop: IconButton owns icon color per tone, so weight is the
      // one visual channel a call site may vary.
      icon={<PushPin size={20} weight={isPinned ? "fill" : "regular"} />}
      onPress={onPress}
      tone={tone}
      size="sm"
      selected={isPinned}
      accessibilityLabel={t(
        isPinned ? "goals:cockpit.unpinGoal" : "goals:cockpit.pinGoal",
      )}
      accessibilityHint={t(
        isPinned ? "goals:cockpit.unpinHint" : "goals:cockpit.pinHint",
        { title },
      )}
      testID={testID}
    />
  );
}

/**
 * Pure, prop-driven Goals cockpit. The container (GoalsScreen) owns the Evolu
 * query + navigation and feeds this view data as props, which is what makes the
 * populated cockpit storyable across all 7 themes (the web Storybook's Evolu
 * mock returns [], so a story of the screen-as-written only ever shows empty).
 */
export function GoalsCockpit({
  hero,
  keepWarm,
  onStartResume,
  onOpenGoal,
  onNewGoal,
  onDeleteGoal,
  heroIsPinned,
  onPinGoal,
  onUnpinGoal,
}: GoalsCockpitProps) {
  const { t } = useTranslation(["goals", "common"]);
  const { theme } = useUnistyles();

  if (!hero) {
    return (
      <View style={styles.empty}>
        <View style={styles.emptyIconBox}>
          <TargetIcon color={theme.colors.text} />
        </View>
        <Text
          variant="display"
          style={styles.emptyTitle}
          accessibilityRole="header"
        >
          {t("goals:emptyState.title")}
        </Text>
        <Text variant="body" style={styles.emptyBody}>
          {t("goals:emptyState.body")}
        </Text>
        <View style={styles.emptyAction}>
          <Button
            label={t("goals:emptyState.cta")}
            icon="+"
            size="lg"
            onPress={onNewGoal}
            testID="goals-cockpit-new-goal"
          />
        </View>
      </View>
    );
  }

  const percent = Math.round(Math.max(0, Math.min(1, hero.progress)) * 100);
  // D6: completion count, not step status — StepStatus has no `in_progress`.
  const resumeLabel =
    hero.stepsCompleted === 0
      ? t("goals:cockpit.start")
      : t("goals:cockpit.resume");
  const ringSublabel =
    hero.stepsTotal > 0
      ? t("goals:cockpit.ringSteps", {
          completed: hero.stepsCompleted,
          total: hero.stepsTotal,
        })
      : undefined;

  return (
    <View style={styles.container}>
      {/* Hero has no onPress: tap = the explicit Start/Resume button below,
          long-press = delete (mirrors the old GoalCard shortcut, D14).
          accessible={false} keeps the inner Button independently focusable for
          screen readers instead of collapsing the card into one a11y node. */}
      <Pressable
        style={styles.hero}
        accessible={false}
        onLongPress={() => onDeleteGoal(hero.id)}
        testID="goals-cockpit-hero"
      >
        {/* Absolute so the pin sits in the hero's top-right corner without
            displacing the centred ring/headline stack. */}
        <View style={styles.heroPin}>
          <PinToggle
            isPinned={heroIsPinned}
            title={hero.title}
            tone="ghost"
            onPress={() => (heroIsPinned ? onUnpinGoal() : onPinGoal(hero.id))}
            testID="goals-cockpit-hero-pin"
          />
        </View>
        <ProgressRing
          progress={hero.progress}
          size={124}
          strokeWidth={10}
          centerLabel={`${percent}%`}
          centerSublabel={ringSublabel}
        />
        <Text variant="mono" style={styles.overline} numberOfLines={1}>
          {t("goals:cockpit.doThisNext", { title: hero.title })}
        </Text>
        {hero.nextStepTitle ? (
          <Text
            variant="headline"
            style={styles.nextStep}
            numberOfLines={2}
            testID="goals-cockpit-next-step"
          >
            {hero.nextStepTitle}
          </Text>
        ) : null}
        {/* S3 coherence: single resume affordance — see #381. No FAB or header
            button duplicates this control anywhere on the Goals screen. */}
        <View style={styles.heroAction}>
          <Button
            label={resumeLabel}
            // `fill` reads as a solid play mark at the hero's scale. Sized to
            // the lg label and colored `background` to match `labelPrimary` on
            // the primary variant's dark fill — the `▶` this replaces could do
            // neither, being an emoji-presentation codepoint (Rule 8).
            icon={
              <Play
                size={theme.size.lg}
                weight="fill"
                color={theme.colors.background}
              />
            }
            size="lg"
            onPress={() => onStartResume(hero.id)}
            testID="goals-cockpit-start-resume"
            accessibilityHint={t("goals:cockpit.resumeHint", {
              title: hero.title,
            })}
          />
        </View>
      </Pressable>

      {keepWarm.length > 0 ? (
        <View style={styles.keepWarmSection}>
          <Text variant="mono" style={styles.sectionLabel}>
            {t("goals:cockpit.keepWarm")}
          </Text>
          <View style={styles.keepWarmGrid}>
            {keepWarm.map((goal) => (
              <View key={goal.id} style={styles.keepWarmCell}>
                <Pressable
                  onPress={() => onOpenGoal(goal.id)}
                  onLongPress={() => onDeleteGoal(goal.id)}
                  accessible
                  accessibilityRole="button"
                  accessibilityLabel={goal.title}
                  // Tapping opens the goal in FocusMode (same as the hero's
                  // Start/Resume), so reuse resumeHint — not card.a11y.hint's
                  // "view details", which would misdescribe the destination.
                  accessibilityHint={t("goals:cockpit.resumeHint", {
                    title: goal.title,
                  })}
                  testID={`keep-warm-${goal.id}`}
                  style={({ pressed }) => [
                    styles.keepWarmCard,
                    pressed && styles.keepWarmPressed,
                  ]}
                >
                  <Text
                    variant="title"
                    style={styles.keepWarmTitle}
                    numberOfLines={1}
                  >
                    {goal.title}
                  </Text>
                  {goal.nextStepTitle ? (
                    <Text
                      variant="caption"
                      style={styles.keepWarmNextStep}
                      numberOfLines={1}
                    >
                      {goal.nextStepTitle}
                    </Text>
                  ) : null}
                  <ProgressBar progress={goal.progress} />
                </Pressable>
                {/* Outside the Pressable above, which is `accessible` and so
                    collapses its subtree into a single screen-reader node — a
                    nested pin would be announced-and-activated as part of the
                    card instead of as its own control. A keep-warm tile is
                    never the pinned goal (pinning promotes it to hero, D2), so
                    this is always the inactive state and always pins. */}
                <View style={styles.keepWarmPin}>
                  <PinToggle
                    isPinned={false}
                    title={goal.title}
                    tone="surface"
                    onPress={() => onPinGoal(goal.id)}
                    testID={`keep-warm-pin-${goal.id}`}
                  />
                </View>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {/* Dashed "+ New goal" affordance — a quiet ghost box, not a loud CTA
          (the hero owns the screen's emphasis). */}
      <Pressable
        onPress={onNewGoal}
        accessible
        accessibilityRole="button"
        accessibilityLabel={t("goals:cockpit.newGoal")}
        testID="goals-cockpit-new-goal"
        style={({ pressed }) => [
          styles.newGoal,
          pressed && styles.newGoalPressed,
        ]}
      >
        <Text variant="body" style={styles.newGoalLabel}>
          + {t("goals:cockpit.newGoal")}
        </Text>
      </Pressable>
    </View>
  );
}
