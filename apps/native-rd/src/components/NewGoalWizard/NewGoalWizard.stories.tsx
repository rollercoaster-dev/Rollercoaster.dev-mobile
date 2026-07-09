import type { Meta, StoryObj } from "@storybook/react";
import React, { useRef, useState } from "react";
import { Text, useWindowDimensions, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import { NewGoalWizard, type NewGoalWizardStep } from "./NewGoalWizard";
import type { EditGoalStep, EditGoalSubStep } from "../EditGoalView";
import { EvidenceType } from "../../db";
import type { EvidenceTypeValue } from "../../types/evidence";

const meta: Meta<typeof NewGoalWizard> = {
  title: "Iteration B/Goals/NewGoalWizard",
  component: NewGoalWizard,
};

export default meta;

type Story = StoryObj<typeof NewGoalWizard>;

const noop = () => undefined;

/**
 * Phone-sized stage. The wizard is a full-screen modal: its root is a
 * full-height flex column that centers the step body and pins the footer to
 * the bottom (matching the App Shell prototype's `newgoal` frame). That only
 * resolves against a *bounded* height — in-app the containing modal supplies
 * it, but Storybook's global decorator renders every story inside a
 * content-hugging ScrollView, so without a bounded stage `container:{flex:1}`
 * collapses to content height and the whole screen jams against the top.
 *
 * We size the stage to the *visible* canvas rather than a fixed device height:
 * the decorator pads its ScrollView by space[4] (top) + space[16] (bottom), so
 * we subtract exactly that (reading the same tokens, so it can't drift). The
 * frame then fills the canvas with no scroll — a modal screen never scrolls its
 * own frame — and no collapse.
 */
function PhoneStage({ children }: { children: React.ReactNode }) {
  const { height } = useWindowDimensions();
  const { theme } = useUnistyles();
  const stageHeight = Math.max(0, height - theme.space[4] - theme.space[16]);
  return (
    <View style={[storyStyles.stage, { height: stageHeight }]}>{children}</View>
  );
}

const storyStyles = StyleSheet.create(() => ({
  stage: {
    width: "100%",
    maxWidth: 390,
    alignSelf: "center" as const,
  },
}));

/**
 * Stateful wrapper: the wizard is prop-driven, so the story owns the goal
 * title. Seeded empty so the disabled "Next →" state is visible by default —
 * typing into the input enables it. The quick-add link below is the distinct
 * onQuickAdd fast path (never conflated with onNext).
 */
function InteractiveNameStep() {
  const [goalTitle, setGoalTitle] = useState("");
  return (
    <PhoneStage>
      <NewGoalWizard
        currentStep="name"
        goalTitle={goalTitle}
        onGoalTitleChange={setGoalTitle}
        stepCount={0}
        onBack={noop}
        onClose={noop}
        onNext={noop}
        onQuickAdd={noop}
        onStartWorking={noop}
      />
    </PhoneStage>
  );
}

export const NameStep: Story = {
  render: () => <InteractiveNameStep />,
};

/**
 * Stateful wrapper for step 2 (mirrors InteractiveNameStep): the story owns the
 * first-step title, the planned evidence type, and the capture-sheet visibility.
 * Seeded with the prototype's sample goal ("Build a birdhouse") and an empty
 * first-step title, so the disabled "Next →" state shows by default. The chip is
 * born as "Note" (D4) and updates in place when a type is picked in the sheet.
 * `pickerOpen` lets Step2PickerOpen seed the sheet open on mount.
 */
function InteractiveStep2({ pickerOpen = false }: { pickerOpen?: boolean }) {
  const [firstStepTitle, setFirstStepTitle] = useState("");
  const [plannedEvidenceType, setPlannedEvidenceType] =
    useState<EvidenceTypeValue>(EvidenceType.text);
  const [evidencePickerOpen, setEvidencePickerOpen] = useState(pickerOpen);
  return (
    <PhoneStage>
      <NewGoalWizard
        currentStep="step"
        goalTitle="Build a birdhouse"
        onGoalTitleChange={noop}
        stepCount={0}
        onBack={noop}
        onClose={noop}
        onNext={noop}
        onQuickAdd={noop}
        onStartWorking={noop}
        firstStepTitle={firstStepTitle}
        onFirstStepTitleChange={setFirstStepTitle}
        plannedEvidenceType={plannedEvidenceType}
        onPlannedEvidenceTypeChange={setPlannedEvidenceType}
        evidencePickerOpen={evidencePickerOpen}
        onOpenEvidencePicker={() => setEvidencePickerOpen(true)}
        onCloseEvidencePicker={() => setEvidencePickerOpen(false)}
      />
    </PhoneStage>
  );
}

export const Step2: Story = {
  render: () => <InteractiveStep2 />,
};

// Same wrapper with the capture sheet seeded open on mount — a static visual
// state of the composed EvidenceTypePicker inside the wizard frame (the issue's
// explicit "incl. picker-open state" ask; no interaction needed to see it).
export const Step2PickerOpen: Story = {
  render: () => <InteractiveStep2 pickerOpen />,
};

// Sample data matches the prototype's own seed ("Build a birdhouse", 2 steps).
export const ReadyStep: Story = {
  render: () => (
    <PhoneStage>
      <NewGoalWizard
        currentStep="ready"
        goalTitle="Build a birdhouse"
        onGoalTitleChange={noop}
        stepCount={2}
        onBack={noop}
        onClose={noop}
        onNext={noop}
        onQuickAdd={noop}
        onStartWorking={noop}
      />
    </PhoneStage>
  ),
};

// The prototype's own initNG() seed, on EditGoalStepList's rich shape — two
// steps, distinct evidence types ("Sand the edges"/Note, "Paint it"/Photo) so
// both chips render differently. Same titles/types as before, now multi-select
// (`plannedEvidenceTypes`, min 1) so create and edit share one data model.
const SAMPLE_STEPS: EditGoalStep[] = [
  {
    id: "step-1",
    title: "Sand the edges",
    plannedEvidenceTypes: [EvidenceType.text],
  },
  {
    id: "step-2",
    title: "Paint it",
    plannedEvidenceTypes: [EvidenceType.photo],
  },
];

// One row already broken into two sub-steps (distinct evidence types), so the
// mint-rail block, its per-sub rename/evidence/delete, and the sibling row's
// "break into sub-steps" prompt are all visible without interaction.
const SAMPLE_STEPS_WITH_SUBSTEPS: EditGoalStep[] = [
  {
    id: "step-1",
    title: "Sand the edges",
    plannedEvidenceTypes: [EvidenceType.text],
    subSteps: [
      {
        id: "sub-1",
        title: "Rough pass with 80-grit",
        plannedEvidenceTypes: [EvidenceType.photo],
      },
      {
        id: "sub-2",
        title: "Finish with 220-grit",
        plannedEvidenceTypes: [EvidenceType.text],
      },
    ],
  },
  {
    id: "step-2",
    title: "Paint it",
    plannedEvidenceTypes: [EvidenceType.photo],
  },
];

/**
 * The ten EditGoalStepList callbacks over a local `steps` state, mirroring
 * EditGoalView.stories.tsx's InteractiveEditGoal reducer functions verbatim
 * (reorder / add / rename / evidence / sub-step variants). Shared by the step-3
 * wrapper and the end-to-end flow so both exercise the reused list. A ref-based
 * id counter keeps freshly-added rows unique without Math.random.
 */
function useInteractiveSteps(initialSteps: EditGoalStep[]) {
  const [steps, setSteps] = useState<EditGoalStep[]>(initialSteps);
  const nextId = useRef(initialSteps.length + 1);

  return {
    steps,
    setSteps,
    callbacks: {
      onReorderSteps: (orderedIds: string[]) =>
        setSteps((prev) =>
          orderedIds
            .map((id) => prev.find((s) => s.id === id))
            .filter((s): s is EditGoalStep => s !== undefined),
        ),
      onReorderSubSteps: (parentStepId: string, orderedIds: string[]) =>
        setSteps((prev) =>
          prev.map((s) =>
            s.id === parentStepId
              ? {
                  ...s,
                  subSteps: orderedIds
                    .map((id) => s.subSteps?.find((ss) => ss.id === id))
                    .filter((ss): ss is EditGoalSubStep => ss !== undefined),
                }
              : s,
          ),
        ),
      onAddStep: (title: string) =>
        setSteps((prev) => [
          ...prev,
          {
            id: `step-${nextId.current++}`,
            title,
            plannedEvidenceTypes: [EvidenceType.text],
          },
        ]),
      onStepTitleChange: (stepId: string, title: string) =>
        setSteps((prev) =>
          prev.map((s) => (s.id === stepId ? { ...s, title } : s)),
        ),
      onStepEvidenceChange: (stepId: string, types: EvidenceTypeValue[]) =>
        setSteps((prev) =>
          prev.map((s) =>
            s.id === stepId ? { ...s, plannedEvidenceTypes: types } : s,
          ),
        ),
      onAddSubStep: (parentStepId: string, title: string) =>
        setSteps((prev) =>
          prev.map((s) =>
            s.id === parentStepId
              ? {
                  ...s,
                  subSteps: [
                    ...(s.subSteps ?? []),
                    {
                      id: `sub-${nextId.current++}`,
                      title,
                      plannedEvidenceTypes: [EvidenceType.text],
                    },
                  ],
                }
              : s,
          ),
        ),
      onSubStepTitleChange: (subStepId: string, title: string) =>
        setSteps((prev) =>
          prev.map((s) => ({
            ...s,
            subSteps: s.subSteps?.map((ss) =>
              ss.id === subStepId ? { ...ss, title } : ss,
            ),
          })),
        ),
      onSubStepEvidenceChange: (
        subStepId: string,
        types: EvidenceTypeValue[],
      ) =>
        setSteps((prev) =>
          prev.map((s) => ({
            ...s,
            subSteps: s.subSteps?.map((ss) =>
              ss.id === subStepId ? { ...ss, plannedEvidenceTypes: types } : ss,
            ),
          })),
        ),
      onDeleteSubStep: (subStepId: string) =>
        setSteps((prev) =>
          prev.map((s) => ({
            ...s,
            subSteps: s.subSteps?.filter((ss) => ss.id !== subStepId),
          })),
        ),
      onDeleteStep: (stepId: string) =>
        setSteps((prev) => prev.filter((s) => s.id !== stepId)),
    },
  };
}

/**
 * Stateful wrapper for step 3 (mirrors InteractiveStep2): the story owns the
 * step list and wires the ten EditGoalStepList callbacks. Seeded with the
 * prototype's own sample steps so the story matches the canonical mock exactly.
 * All rename/evidence/delete/reorder/sub-step editing state lives inside
 * EditGoalStepList (#489) — the story only owns the data.
 */
function InteractiveBuildStep({
  initialSteps = SAMPLE_STEPS,
}: {
  initialSteps?: EditGoalStep[];
}) {
  const { steps, callbacks } = useInteractiveSteps(initialSteps);
  return (
    <PhoneStage>
      <NewGoalWizard
        currentStep="build"
        goalTitle="Build a birdhouse"
        onGoalTitleChange={noop}
        stepCount={steps.length}
        onBack={noop}
        onClose={noop}
        onNext={noop}
        onQuickAdd={noop}
        onStartWorking={noop}
        steps={steps}
        {...callbacks}
      />
    </PhoneStage>
  );
}

export const BuildStep: Story = {
  render: () => <InteractiveBuildStep />,
};

// One row pre-broken into sub-steps, so the mint-rail sub-step block and the
// sibling's "break into sub-steps" prompt are both reviewable with no
// interaction — the interaction set the wizard's build step never had before.
export const BuildStepWithSubSteps: Story = {
  render: () => (
    <InteractiveBuildStep initialSteps={SAMPLE_STEPS_WITH_SUBSTEPS} />
  ),
};

const FLOW_ORDER: NewGoalWizardStep[] = ["name", "step", "build", "ready"];

/**
 * End-to-end flow: the wizard owns every step's state and advances through
 * name → first step → build → ready with real data carried forward. The goal
 * title (step 1) and first-step title/evidence (step 2) reappear on the build
 * list (row 1) and the ready summary card — the story-level bridge D2 defers to
 * [Integrate] (#444) for real Evolu data. Quick-add jumps straight to build
 * (matching the prototype), seeding row 1 the same way.
 */
function InteractiveFlowWizard() {
  const [currentStep, setCurrentStep] = useState<NewGoalWizardStep>("name");
  const [goalTitle, setGoalTitle] = useState("");
  const [firstStepTitle, setFirstStepTitle] = useState("");
  const [plannedEvidenceType, setPlannedEvidenceType] =
    useState<EvidenceTypeValue>(EvidenceType.text);
  const [evidencePickerOpen, setEvidencePickerOpen] = useState(false);
  const { steps, setSteps, callbacks } = useInteractiveSteps([]);

  // Seed row 1 from the first-step data on first arrival at build (D2 bridge):
  // the step-2 single planned type becomes the row's one-element
  // plannedEvidenceTypes array. A distinct id namespace avoids colliding with
  // the "step-N" ids onAddStep mints later.
  const goToBuild = () => {
    setSteps((prev) =>
      prev.length > 0
        ? prev
        : [
            {
              id: "flow-step-1",
              title: firstStepTitle.trim() || "Your first step",
              plannedEvidenceTypes: [plannedEvidenceType],
            },
          ],
    );
    setCurrentStep("build");
  };

  const handleNext = () => {
    const next = FLOW_ORDER[FLOW_ORDER.indexOf(currentStep) + 1];
    if (next === "build") goToBuild();
    else if (next) setCurrentStep(next);
  };

  const handleBack = () => {
    const prev = FLOW_ORDER[FLOW_ORDER.indexOf(currentStep) - 1];
    if (prev) setCurrentStep(prev);
  };

  return (
    <PhoneStage>
      <NewGoalWizard
        currentStep={currentStep}
        goalTitle={goalTitle}
        onGoalTitleChange={setGoalTitle}
        stepCount={steps.length}
        onBack={handleBack}
        onClose={noop}
        onNext={handleNext}
        onQuickAdd={goToBuild}
        onStartWorking={noop}
        firstStepTitle={firstStepTitle}
        onFirstStepTitleChange={setFirstStepTitle}
        plannedEvidenceType={plannedEvidenceType}
        onPlannedEvidenceTypeChange={setPlannedEvidenceType}
        evidencePickerOpen={evidencePickerOpen}
        onOpenEvidencePicker={() => setEvidencePickerOpen(true)}
        onCloseEvidencePicker={() => setEvidencePickerOpen(false)}
        steps={steps}
        {...callbacks}
      />
    </PhoneStage>
  );
}

export const InteractiveFlow: Story = {
  render: () => <InteractiveFlowWizard />,
};

/**
 * NewGoalWizard in the active theme — reviewed across themes via the Storybook
 * theme toolbar (top bar), NOT a live per-cell matrix.
 *
 * Why no 7-cell `<ScopedTheme>` matrix like the prop-driven siblings? The build
 * step reuses EditGoalStepList (#489), whose `useAnimationPref` probe resolves
 * async and `setState`s after mount (as does the composed EvidenceTypePicker).
 * On web, `<ScopedTheme>` applies the scoped theme only during the initial
 * render pass; that post-mount re-render recomputes styles against the *active*
 * theme, so every cell would silently revert to the toolbar theme (a "null
 * matrix"). The component honours the active theme correctly, so the toolbar
 * switcher is the reliable way to review all 7 product themes here — the
 * EditGoalView/TimelineStep/BadgesWall treatment. The sub-stepped build state is
 * the richest (header, rows, chips, mint-rail sub-steps, CTA), so it's rendered.
 */
export const AllThemesMatrix: Story = {
  render: () => (
    <View style={{ gap: 12 }}>
      <Text style={{ fontSize: 12, fontStyle: "italic", padding: 12 }}>
        Switch the theme toolbar (top bar) to review this screen across all 7
        product themes. A live per-cell matrix can’t work here: the reused
        EditGoalStepList (and the composed EvidenceTypePicker) run an
        animation-pref probe that resolves async and re-renders after mount, and
        on web that reverts a ScopedTheme cell to the active theme.
      </Text>
      <InteractiveBuildStep initialSteps={SAMPLE_STEPS_WITH_SUBSTEPS} />
    </View>
  ),
};
