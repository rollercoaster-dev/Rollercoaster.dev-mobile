import type { Meta, StoryObj } from "@storybook/react";
import React from "react";
import { ScrollView, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Text } from "../../components/Text";
import { ScreenHeader, ScreenSubHeader } from "../../components/ScreenHeader";
import { IconButton } from "../../components/IconButton";
import { KeyboardAvoidingFrame } from "../../components/KeyboardAvoidingFrame";
import { FocusProgressStrip } from "../../components/FocusProgressStrip";
import { FocusCurrentTaskCard } from "../../components/FocusCurrentTaskCard";
import { FinishCelebrateStage } from "../../components/FinishCelebrateStage";
import { useTabScreenContentInset } from "../../navigation/useTabScreenContentInset";
import {
  GoalsCockpit,
  type CockpitHeroGoal,
  type CockpitKeepWarmGoal,
} from "../../screens/GoalsScreen/GoalsCockpit";
import { styles as goalsStyles } from "../../screens/GoalsScreen/GoalsScreen.styles";
import { styles as focusStyles } from "../../screens/FocusModeScreen/FocusModeScreen.styles";
import { DeviceRow, PhoneShell } from "./PhoneShell";
import { Pencil } from "phosphor-react-native";

/**
 * Screens composed the way their containers compose them, inside the real app
 * shell (status strip, top inset, floating tab bar) at a compact and a
 * standard phone size. Use these to review how parts share a screen; the
 * per-component stories frame each part on its own. Data is fixture data —
 * the containers' Evolu queries are not wired in Storybook.
 */
const meta: Meta = {
  title: "Composed Screens",
  parameters: { layout: "fullscreen" },
};

export default meta;

type Story = StoryObj;

const noop = () => {};

const hero: CockpitHeroGoal = {
  id: "hero",
  title: "Learn React Native Navigation",
  nextStepTitle: "Set up the bottom tab navigator",
  progress: 0.5,
  stepsCompleted: 3,
  stepsTotal: 6,
};

const keepWarm: CockpitKeepWarmGoal[] = [
  {
    id: "kw-1",
    title: "Build a Storybook component library",
    nextStepTitle: "Document GoalCard variants",
    progress: 0.75,
  },
  {
    id: "kw-2",
    title: "Understand Evolu local-first sync",
    nextStepTitle: "Read the mutation API docs",
    progress: 0.2,
  },
  {
    id: "kw-3",
    title: "Ship the offline-first prototype",
    nextStepTitle: "Wire up the sync queue",
    progress: 0.4,
  },
];

// Mirrors GoalsScreen's populated render: header with live count, scrolling
// cockpit padded to clear the floating tab pill.
function GoalsTab() {
  const { t } = useTranslation(["goals"]);
  const contentInset = useTabScreenContentInset();
  return (
    <View style={goalsStyles.screen}>
      <ScreenHeader
        title={t("goals:todayTitle")}
        right={
          <Text variant="mono" style={goalsStyles.headerCount}>
            {t("goals:goalCount", { count: 1 + keepWarm.length })}
          </Text>
        }
      />
      <ScrollView
        contentContainerStyle={[goalsStyles.listContent, contentInset]}
      >
        <GoalsCockpit
          hero={hero}
          keepWarm={keepWarm}
          onStartResume={noop}
          onOpenGoal={noop}
          onNewGoal={noop}
          onDeleteGoal={noop}
          heroIsPinned={false}
          onPinGoal={noop}
          onUnpinGoal={noop}
        />
      </ScrollView>
    </View>
  );
}

export const Goals: Story = {
  render: () => (
    <DeviceRow
      render={(device) => (
        <PhoneShell device={device}>
          <GoalsTab />
        </PhoneShell>
      )}
    />
  ),
};

// Mirrors FocusModeScreen's in-progress render: sub-header, keyboard frame,
// goal title row, progress strip, and the current task card whose footer pins
// one action per outstanding planned evidence type above the tab pill.
function FocusTab({
  plannedEvidenceTypes,
}: {
  plannedEvidenceTypes: readonly string[];
}) {
  const { t } = useTranslation(["focusMode"]);
  return (
    <View style={focusStyles.screen}>
      <ScreenSubHeader label={t("focusMode:title")} onBack={noop} />
      <KeyboardAvoidingFrame style={focusStyles.keyboardAvoidingView}>
        <View style={focusStyles.content}>
          <View style={focusStyles.headerRow}>
            <Text
              variant="title"
              style={focusStyles.title}
              numberOfLines={2}
              accessible
              accessibilityRole="header"
            >
              Rewire the workshop
            </Text>
            <IconButton
              icon={<Pencil size={20} weight="bold" />}
              onPress={noop}
              tone="ghost"
              accessibilityLabel={t("focusMode:header.editGoal")}
              size="sm"
            />
          </View>
          <FocusProgressStrip doneCount={2} totalCount={5} onPress={noop} />
          <View style={focusStyles.cardSection}>
            <FocusCurrentTaskCard
              status="in-progress"
              title="Inspection & labels"
              plannedEvidenceTypes={plannedEvidenceTypes}
              onPause={noop}
              onMarkComplete={noop}
              onChangeEvidencePlan={noop}
              onAddEvidence={noop}
            />
          </View>
        </View>
      </KeyboardAvoidingFrame>
    </View>
  );
}

export const FocusOneAction: Story = {
  name: "Focus · one planned type",
  render: () => (
    <DeviceRow
      render={(device) => (
        <PhoneShell device={device}>
          <FocusTab plannedEvidenceTypes={["photo"]} />
        </PhoneShell>
      )}
    />
  ),
};

// The pinned footer grows with every outstanding planned type. Kept as a
// standing review case for the small-screen bound tracked in #694 (UI-11).
export const FocusFourActions: Story = {
  name: "Focus · four planned types",
  render: () => (
    <DeviceRow
      render={(device) => (
        <PhoneShell device={device}>
          <FocusTab
            plannedEvidenceTypes={["photo", "text", "voice_memo", "link"]}
          />
        </PhoneShell>
      )}
    />
  ),
};

// CompletionFlow is presented modally over the tab bar. The closing note
// opens a multiline input above the pinned "Design your badge" CTA inside
// the stage's KeyboardAvoidingFrame.
export const CelebrationClosingNote: Story = {
  name: "Celebration · closing note open",
  render: () => (
    <DeviceRow
      render={(device) => (
        <PhoneShell device={device} modal>
          <FinishCelebrateStage
            summary="All 5 steps done for Rewire the workshop — with 3 pieces of evidence along the way."
            closingNoteValue="Felt lighter the moment I closed the last step."
            onClosingNoteChange={noop}
            onDesignBadge={noop}
            initialNoteOpen
          />
        </PhoneShell>
      )}
    />
  ),
};
