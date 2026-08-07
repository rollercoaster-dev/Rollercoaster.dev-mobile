/**
 * NewGoalScreen — the `NewGoal` route's container ([Integrate] #444, Epic #384).
 *
 * Mounts the storied NewGoalWizard (#443/#462/#464/#465/#482) as-is and supplies
 * the three things Storybook couldn't: real navigation, real Evolu writes, and
 * real i18n for its copy props. No wizard internals are touched (D6) — the step
 * list lives in `useNewGoalSteps`, the copy in `newGoalWizardCopy`.
 *
 * The whole flow — goal title, first step, and the full build list — is **local
 * React state**. Nothing is written to Evolu until "Start Working" on the ready
 * step, which persists the goal, its steps and their sub-steps in one batch
 * (D2). Closing with × writes nothing, so an abandoned wizard can never leave an
 * orphan goal behind.
 */
import React, { useState } from "react";
import { Alert, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import {
  NewGoalWizard,
  type NewGoalWizardStep,
} from "../../components/NewGoalWizard";
import {
  createGoal,
  createStep,
  createSubStep,
  type GoalId,
  type StepId,
} from "../../db";
import { reportError } from "../../services/sentry-report";
import type { GoalsStackParamList } from "../../navigation/types";
import { newGoalWizardCopy } from "./newGoalWizardCopy";
import { useNewGoalSteps } from "./useNewGoalSteps";
import { styles } from "./NewGoalScreen.styles";

/**
 * Linear forward transitions, mirroring NewGoalWizard's own STEP_ORDER (which
 * isn't exported). `ready` has no successor — its footer CTA is Start Working,
 * not Next — so the map bottoms out rather than wrapping.
 */
const NEXT_STEP: Record<NewGoalWizardStep, NewGoalWizardStep | undefined> = {
  name: "step",
  step: "build",
  build: "ready",
  ready: undefined,
};

export function NewGoalScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<GoalsStackParamList, "NewGoal">>();
  const { t } = useTranslation(["newGoal", "common"]);

  const [currentStep, setCurrentStep] = useState<NewGoalWizardStep>("name");
  /**
   * Visited-screens stack, not a flat index into NEXT_STEP: quick-add jumps
   * name → build, and the back arrow has to return to *name*, not to the
   * skipped first-step screen.
   */
  const [history, setHistory] = useState<NewGoalWizardStep[]>([]);
  const [goalTitle, setGoalTitle] = useState("");
  const [evidencePickerOpen, setEvidencePickerOpen] = useState(false);
  const { steps, stepProps } = useNewGoalSteps();

  function goTo(next: NewGoalWizardStep) {
    setHistory((prev) => [...prev, currentStep]);
    setCurrentStep(next);
  }

  function handleNext() {
    const next = NEXT_STEP[currentStep];
    if (next) goTo(next);
  }

  /** Quiet fast path: straight to the build list, `steps` untouched (D5). */
  function handleQuickAdd() {
    goTo("build");
  }

  function handleBack() {
    setCurrentStep(history[history.length - 1] ?? "name");
    setHistory((prev) => prev.slice(0, -1));
  }

  /** × close — nothing persisted, so nothing to confirm or roll back (D2). */
  function handleClose() {
    navigation.goBack();
  }

  function reportCreateFailure(error: unknown) {
    reportError(error, { area: "goal.mutate", kind: "create" });
    Alert.alert(
      t("newGoal:errors.createFailedTitle"),
      t("newGoal:errors.createFailedMessage"),
    );
  }

  /**
   * Sends the user back to step 1 for the one field the wizard can't do without.
   * Reachable because quick add is a *quiet* fast path — it skips the first-step
   * screen without gating on the title the way the Next button does — so the
   * ready step can be reached with the title still blank. Without this, Start
   * Working would hand "" to createGoal, whose validation guard throws, and the
   * user would get the generic create-failed alert (plus a Sentry report) for
   * what is really an empty field on a screen they can still get to.
   */
  function returnToNameStep() {
    setCurrentStep("name");
    setHistory([]);
    Alert.alert(
      t("newGoal:errors.missingTitleTitle"),
      t("newGoal:errors.missingTitleMessage"),
    );
  }

  /**
   * Persists the whole wizard in one pass: the goal, then each build-list step
   * with its ordinal + planned evidence, then each of that step's sub-steps with
   * `parentStepId` set. Every row is created complete — never title-only then
   * patched.
   *
   * Evolu reports a failed write two ways (a throw from db/queries.ts's
   * validation guards, and a `{ ok: false }` Result from the engine), so both
   * are handled; the batch stops at the first failure and stays on the ready
   * step. Rows already inserted are left in place — this codebase's mutation
   * layer has no transactional primitive to roll them back with (see the plan's
   * Not in Scope).
   */
  function handleStartWorking() {
    if (!goalTitle.trim()) return returnToNameStep();
    try {
      const goalResult = createGoal(goalTitle);
      if (!goalResult.ok) return reportCreateFailure(goalResult.error);
      const goalId = goalResult.value.id as GoalId;

      for (const [index, step] of steps.entries()) {
        const stepResult = createStep(
          goalId,
          step.title,
          index,
          step.plannedEvidenceTypes,
        );
        if (!stepResult.ok) return reportCreateFailure(stepResult.error);
        const parentStepId = stepResult.value.id as StepId;

        for (const [subIndex, sub] of (step.subSteps ?? []).entries()) {
          const subResult = createSubStep(
            goalId,
            parentStepId,
            sub.title,
            subIndex,
            sub.plannedEvidenceTypes,
          );
          if (!subResult.ok) return reportCreateFailure(subResult.error);
        }
      }

      // replace, not navigate: back from Focus Mode returns to the Goals list,
      // never into a stale wizard whose goal already exists (D7).
      navigation.replace("FocusMode", { goalId });
    } catch (error) {
      reportCreateFailure(error);
    }
  }

  return (
    <View style={styles.container}>
      <NewGoalWizard
        currentStep={currentStep}
        goalTitle={goalTitle}
        onGoalTitleChange={setGoalTitle}
        stepCount={steps.length}
        onBack={handleBack}
        onClose={handleClose}
        onNext={handleNext}
        onQuickAdd={handleQuickAdd}
        onStartWorking={handleStartWorking}
        evidencePickerOpen={evidencePickerOpen}
        onOpenEvidencePicker={() => setEvidencePickerOpen(true)}
        onCloseEvidencePicker={() => setEvidencePickerOpen(false)}
        {...stepProps}
        {...newGoalWizardCopy(t)}
      />
    </View>
  );
}
