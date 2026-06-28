import React from "react";
import { Pressable, View } from "react-native";
import { useTranslation } from "react-i18next";
import { ProgressRing } from "../../components/ProgressRing";
import { ProgressBar } from "../../components/ProgressBar";
import { Button } from "../../components/Button";
import { EmptyState } from "../../components/EmptyState";
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
}: GoalsCockpitProps) {
  const { t } = useTranslation(["goals", "common"]);

  if (!hero) {
    return (
      <EmptyState
        title={t("goals:emptyState.title")}
        body={t("goals:emptyState.body")}
        action={{ label: t("goals:emptyState.cta"), onPress: onNewGoal }}
      />
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
      ? t("goals:card.progressLabel", {
          completed: hero.stepsCompleted,
          total: hero.stepsTotal,
        })
      : undefined;

  return (
    <View style={styles.container}>
      <View style={styles.hero} testID="goals-cockpit-hero">
        <Text variant="mono" style={styles.overline} numberOfLines={1}>
          {t("goals:cockpit.doThisNext", { title: hero.title })}
        </Text>
        <ProgressRing
          progress={hero.progress}
          centerLabel={`${percent}%`}
          centerSublabel={ringSublabel}
        />
        {hero.nextStepTitle ? (
          <Text variant="headline" style={styles.nextStep} numberOfLines={2}>
            {hero.nextStepTitle}
          </Text>
        ) : null}
        {/* S3 coherence: single resume affordance — see #381. No FAB or header
            button duplicates this control anywhere on the Goals screen. */}
        <View style={styles.heroAction}>
          <Button
            label={resumeLabel}
            size="lg"
            onPress={() => onStartResume(hero.id)}
            testID="goals-cockpit-start-resume"
            accessibilityHint={t("goals:cockpit.resumeHint", {
              title: hero.title,
            })}
          />
        </View>
      </View>

      {keepWarm.length > 0 ? (
        <View style={styles.keepWarmSection}>
          <Text variant="mono" style={styles.sectionLabel}>
            {t("goals:cockpit.keepWarm")}
          </Text>
          {keepWarm.map((goal) => (
            <Pressable
              key={goal.id}
              onPress={() => onOpenGoal(goal.id)}
              accessible
              accessibilityRole="button"
              accessibilityLabel={goal.title}
              accessibilityHint={t("goals:card.a11y.hint")}
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
          ))}
        </View>
      ) : null}

      <Button
        label={t("goals:cockpit.newGoal")}
        variant="ghost"
        onPress={onNewGoal}
        testID="goals-cockpit-new-goal"
      />
    </View>
  );
}
