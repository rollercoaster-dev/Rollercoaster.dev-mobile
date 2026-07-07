import type { Meta, StoryObj } from "@storybook/react";
import React, { useState } from "react";
import { Text, useWindowDimensions, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import {
  NewGoalWizard,
  type BuildStep as BuildStepData,
  type NewGoalWizardStep,
} from "./NewGoalWizard";
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

// The prototype's own initNG() seed — two steps, distinct evidence types
// ("Sand the edges"/Note, "Paint it"/Photo) so both chips render differently.
const SAMPLE_BUILD_STEPS: BuildStepData[] = [
  { id: "step-1", title: "Sand the edges", evidenceType: EvidenceType.text },
  { id: "step-2", title: "Paint it", evidenceType: EvidenceType.photo },
];

// Appends the prototype's default new row ({ "New step", Note }). The id stays
// unique via list length — these stories only grow the list (no removal).
function appendBuildStep(steps: BuildStepData[]): BuildStepData[] {
  return [
    ...steps,
    {
      id: `step-${steps.length + 1}`,
      title: "New step",
      evidenceType: EvidenceType.text,
    },
  ];
}

function updateBuildStepEvidence(
  steps: BuildStepData[],
  id: string,
  type: EvidenceTypeValue,
): BuildStepData[] {
  return steps.map((step) =>
    step.id === id ? { ...step, evidenceType: type } : step,
  );
}

function renameBuildStep(
  steps: BuildStepData[],
  id: string,
  title: string,
): BuildStepData[] {
  return steps.map((step) => (step.id === id ? { ...step, title } : step));
}

function removeBuildStep(steps: BuildStepData[], id: string): BuildStepData[] {
  return steps.filter((step) => step.id !== id);
}

/**
 * Rename + confirmed-delete state for the build rows (#482), shared by the
 * step-3 wrapper and the end-to-end flow so both exercise it. Rename commits on
 * return/blur — trimmed, no-op on empty; delete routes through the caller-owned
 * pendingDelete flag so the row is removed only on Confirm, never on the raw ×.
 * `initialPendingDeleteId` lets the frozen BuildStepDeleteConfirm story open the
 * modal on mount (mirrors InteractiveStep2's `pickerOpen`).
 */
function useBuildStepEditing(
  buildSteps: BuildStepData[],
  setBuildSteps: React.Dispatch<React.SetStateAction<BuildStepData[]>>,
  initialPendingDeleteId: string | null = null,
) {
  const [editingBuildStepId, setEditingBuildStepId] = useState<string | null>(
    null,
  );
  const [buildStepEditText, setBuildStepEditText] = useState("");
  const [pendingDeleteBuildStepId, setPendingDeleteBuildStepId] = useState<
    string | null
  >(initialPendingDeleteId);

  return {
    buildSteps,
    editingBuildStepId,
    buildStepEditText,
    onStartEditingBuildStep: (id: string, currentTitle: string) => {
      setEditingBuildStepId(id);
      setBuildStepEditText(currentTitle);
    },
    onBuildStepEditTextChange: setBuildStepEditText,
    onCommitBuildStepEditing: () => {
      const trimmed = buildStepEditText.trim();
      if (editingBuildStepId && trimmed) {
        setBuildSteps((prev) =>
          renameBuildStep(prev, editingBuildStepId, trimmed),
        );
      }
      setEditingBuildStepId(null);
      setBuildStepEditText("");
    },
    pendingDeleteBuildStepId,
    onRequestDeleteBuildStep: setPendingDeleteBuildStepId,
    onCancelDeleteBuildStep: () => setPendingDeleteBuildStepId(null),
    onConfirmDeleteBuildStep: () => {
      if (pendingDeleteBuildStepId) {
        setBuildSteps((prev) =>
          removeBuildStep(prev, pendingDeleteBuildStepId),
        );
      }
      setPendingDeleteBuildStepId(null);
    },
  };
}

/**
 * Stateful wrapper for step 3 (mirrors InteractiveStep2): the story owns the
 * build-step list and which row's evidence picker is open. Seeded with the
 * prototype's own sample steps so the story matches the canonical mock exactly.
 * Adding a row appends "New step"/Note; each row's chip opens the shared
 * capture sheet targeted at that row and updates only that row's type. Rename +
 * delete state comes from useBuildStepEditing (#482).
 */
function InteractiveBuildStep({
  initialPendingDeleteId = null,
}: {
  initialPendingDeleteId?: string | null;
}) {
  const [buildSteps, setBuildSteps] =
    useState<BuildStepData[]>(SAMPLE_BUILD_STEPS);
  const [openBuildStepEvidenceId, setOpenBuildStepEvidenceId] = useState<
    string | null
  >(null);
  const editing = useBuildStepEditing(
    buildSteps,
    setBuildSteps,
    initialPendingDeleteId,
  );
  return (
    <PhoneStage>
      <NewGoalWizard
        currentStep="build"
        goalTitle="Build a birdhouse"
        onGoalTitleChange={noop}
        stepCount={buildSteps.length}
        onBack={noop}
        onClose={noop}
        onNext={noop}
        onQuickAdd={noop}
        onStartWorking={noop}
        onAddStep={() => setBuildSteps(appendBuildStep)}
        openBuildStepEvidenceId={openBuildStepEvidenceId}
        onOpenBuildStepEvidence={setOpenBuildStepEvidenceId}
        onCloseBuildStepEvidence={() => setOpenBuildStepEvidenceId(null)}
        onBuildStepEvidenceTypeChange={(id, type) =>
          setBuildSteps((prev) => updateBuildStepEvidence(prev, id, type))
        }
        {...editing}
      />
    </PhoneStage>
  );
}

export const BuildStep: Story = {
  render: () => <InteractiveBuildStep />,
};

// Frozen variant: the confirm modal is open on mount (row "step-1" targeted),
// so the delete-confirm state is reviewable with no interaction — the same
// rationale as Step2PickerOpen.
export const BuildStepDeleteConfirm: Story = {
  render: () => <InteractiveBuildStep initialPendingDeleteId="step-1" />,
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
  const [buildSteps, setBuildSteps] = useState<BuildStepData[]>([]);
  const [openBuildStepEvidenceId, setOpenBuildStepEvidenceId] = useState<
    string | null
  >(null);
  const editing = useBuildStepEditing(buildSteps, setBuildSteps);

  // Seed row 1 from the first-step data on first arrival at build (D2 bridge).
  const goToBuild = () => {
    setBuildSteps((prev) =>
      prev.length > 0
        ? prev
        : [
            {
              id: "step-1",
              title: firstStepTitle.trim() || "Your first step",
              evidenceType: plannedEvidenceType,
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
        stepCount={buildSteps.length}
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
        onAddStep={() => setBuildSteps(appendBuildStep)}
        openBuildStepEvidenceId={openBuildStepEvidenceId}
        onOpenBuildStepEvidence={setOpenBuildStepEvidenceId}
        onCloseBuildStepEvidence={() => setOpenBuildStepEvidenceId(null)}
        onBuildStepEvidenceTypeChange={(id, type) =>
          setBuildSteps((prev) => updateBuildStepEvidence(prev, id, type))
        }
        {...editing}
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
 * Why no 7-cell `<ScopedTheme>` matrix like the prop-driven siblings? The
 * wizard composes EvidenceTypePicker, whose `useAnimationPref` probe resolves
 * async and `setState`s after mount. On web, `<ScopedTheme>` applies the scoped
 * theme only during the initial render pass; that post-mount re-render
 * recomputes styles against the *active* theme, so every cell would silently
 * revert to the toolbar theme (a "null matrix"). The component honours the
 * active theme correctly, so the toolbar switcher is the reliable way to review
 * all 7 product themes here — the EditGoalView/TimelineStep/BadgesWall
 * treatment. The build step is the richest (header, rows, chips, CTA), so it's
 * the one rendered.
 */
export const AllThemesMatrix: Story = {
  render: () => (
    <View style={{ gap: 12 }}>
      <Text style={{ fontSize: 12, fontStyle: "italic", padding: 12 }}>
        Switch the theme toolbar (top bar) to review this screen across all 7
        product themes. A live per-cell matrix can’t work here: NewGoalWizard
        composes EvidenceTypePicker, whose animation-pref probe resolves async
        and re-renders after mount, and on web that reverts a ScopedTheme cell
        to the active theme.
      </Text>
      <InteractiveBuildStep />
    </View>
  ),
};
