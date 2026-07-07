import type { Meta, StoryObj } from "@storybook/react";
import React, { useRef, useState } from "react";
import { View } from "react-native";
import { EvidenceType } from "../../db";
import type { EvidenceTypeValue } from "../../types/evidence";
import {
  EditGoalView,
  type EditGoalStep,
  type EditGoalSubStep,
} from "./EditGoalView";
import { EditGoalStepRow } from "./EditGoalStepRow";
import { EditGoalOverflowMenu } from "./EditGoalOverflowMenu";
import { Text } from "../Text";

const noop = () => {};

const meta: Meta<typeof EditGoalView> = {
  title: "Iteration B/Goals/EditGoalView",
  component: EditGoalView,
};

export default meta;

type Story = StoryObj<typeof EditGoalView>;

// Mixed anatomy: mostly one planned type (the prototype-faithful common case),
// one step with two types (multi-pill, D4), and two steps carrying date/dep
// chips (D5) so the conditional chip row is exercised.
const initialSteps: EditGoalStep[] = [
  {
    id: "s1",
    title: "Draft the outline",
    plannedEvidenceTypes: [EvidenceType.text],
    // A step broken into sub-steps (D12) — the indented mint-rail block.
    subSteps: [
      {
        id: "s1a",
        title: "List the sections",
        plannedEvidenceTypes: [EvidenceType.text],
      },
      {
        id: "s1b",
        title: "Order them",
        plannedEvidenceTypes: [EvidenceType.photo],
      },
      {
        id: "s1c",
        title: "Note gaps to research",
        plannedEvidenceTypes: [EvidenceType.text],
      },
    ],
  },
  {
    id: "s2",
    title: "Gather references",
    plannedEvidenceTypes: [EvidenceType.link, EvidenceType.photo],
  },
  {
    id: "s3",
    title: "Paint the first study",
    plannedEvidenceTypes: [EvidenceType.photo],
    dateDepChips: [{ tone: "after", text: "after Draft the outline" }],
  },
  {
    id: "s4",
    title: "Review with mentor",
    plannedEvidenceTypes: [EvidenceType.voice_memo],
    dateDepChips: [
      { tone: "waiting", text: "Alex" },
      { tone: "due", text: "Fri" },
    ],
  },
  {
    id: "s5",
    title: "Publish the piece",
    plannedEvidenceTypes: [EvidenceType.file],
  },
];

/**
 * Stateful wrapper: EditGoalView is prop-driven, so the story owns the goal
 * title + steps and mutates them through the callbacks — tapping the evidence
 * chip, dragging a row, adding a step, or renaming one all update local state so
 * the reviewer sees the real interaction (persistence is the [Integrate] job).
 */
function InteractiveEditGoal({ note }: { note?: string }) {
  const [goalTitle, setGoalTitle] = useState("Learn watercolor basics");
  const [steps, setSteps] = useState<EditGoalStep[]>(initialSteps);
  const nextId = useRef(initialSteps.length + 1);

  function reorder(orderedIds: string[]) {
    setSteps((prev) =>
      orderedIds
        .map((id) => prev.find((s) => s.id === id))
        .filter((s): s is EditGoalStep => s !== undefined),
    );
  }

  function reorderSubSteps(parentStepId: string, orderedIds: string[]) {
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
    );
  }

  function addStep(title: string) {
    const id = `s${nextId.current++}`;
    setSteps((prev) => [
      ...prev,
      { id, title, plannedEvidenceTypes: [EvidenceType.text] },
    ]);
  }

  function renameStep(stepId: string, title: string) {
    setSteps((prev) =>
      prev.map((s) => (s.id === stepId ? { ...s, title } : s)),
    );
  }

  function changeEvidence(stepId: string, types: EvidenceTypeValue[]) {
    setSteps((prev) =>
      prev.map((s) =>
        s.id === stepId ? { ...s, plannedEvidenceTypes: types } : s,
      ),
    );
  }

  function addSubStep(parentStepId: string, title: string) {
    const id = `ss${nextId.current++}`;
    setSteps((prev) =>
      prev.map((s) =>
        s.id === parentStepId
          ? {
              ...s,
              subSteps: [
                ...(s.subSteps ?? []),
                { id, title, plannedEvidenceTypes: [EvidenceType.text] },
              ],
            }
          : s,
      ),
    );
  }

  function renameSubStep(subStepId: string, title: string) {
    setSteps((prev) =>
      prev.map((s) => ({
        ...s,
        subSteps: s.subSteps?.map((ss) =>
          ss.id === subStepId ? { ...ss, title } : ss,
        ),
      })),
    );
  }

  function changeSubStepEvidence(
    subStepId: string,
    types: EvidenceTypeValue[],
  ) {
    setSteps((prev) =>
      prev.map((s) => ({
        ...s,
        subSteps: s.subSteps?.map((ss) =>
          ss.id === subStepId ? { ...ss, plannedEvidenceTypes: types } : ss,
        ),
      })),
    );
  }

  function deleteSubStep(subStepId: string) {
    setSteps((prev) =>
      prev.map((s) => ({
        ...s,
        subSteps: s.subSteps?.filter((ss) => ss.id !== subStepId),
      })),
    );
  }

  function deleteStep(stepId: string) {
    setSteps((prev) => prev.filter((s) => s.id !== stepId));
  }

  return (
    <View>
      {note ? (
        <Text style={{ fontSize: 12, fontStyle: "italic", padding: 12 }}>
          {note}
        </Text>
      ) : null}
      <EditGoalView
        goalTitle={goalTitle}
        onGoalTitleChange={setGoalTitle}
        steps={steps}
        onReorderSteps={reorder}
        onReorderSubSteps={reorderSubSteps}
        onAddStep={addStep}
        onStepTitleChange={renameStep}
        onStepEvidenceChange={changeEvidence}
        onAddSubStep={addSubStep}
        onSubStepTitleChange={renameSubStep}
        onSubStepEvidenceChange={changeSubStepEvidence}
        onDeleteSubStep={deleteSubStep}
        onDeleteStep={deleteStep}
        onOverflowPress={() => {}}
        onBack={() => {}}
        onDone={() => {}}
      />
    </View>
  );
}

export const Populated: Story = {
  render: () => <InteractiveEditGoal />,
};

export const ReorderInteraction: Story = {
  render: () => (
    <InteractiveEditGoal note="Long-press a step row and drag it to a new position. On release, the step order — and the step numbers — update in local state. (No screen reader / reduced motion → drag; otherwise ↑/↓ buttons appear as the accessible fallback.)" />
  ),
};

export const EvidencePickerInteraction: Story = {
  render: () => (
    <InteractiveEditGoal note='Tap a step’s evidence chip to open the planned-evidence picker, then toggle types on/off — the row’s pills update live. Try removing every type from a single-type step: the last one can’t be deselected ("every step requires evidence").' />
  ),
};

export const SubSteps: Story = {
  render: () => (
    <InteractiveEditGoal note='Step 1 is broken into three sub-steps (the indented mint-rail block): tap a sub-step to rename it, tap its chip to set evidence, × to remove it, or "add a sub-step" for another. Steps with none show "break into sub-steps" — tap it to seed the first one. Each sub-step requires its own evidence. Reorder within a parent: long-press a sub-step’s ≡ handle and drag it among its siblings (it never leaves its parent, and the parent card itself does not drag). With a screen reader on or reduced motion set, ↑/↓ buttons appear on each sub-step as the accessible fallback.' />
  ),
};

// Static defaults for rendering a row in isolation (no drag wiring needed —
// canDrag=false renders the row static, so the anatomy is the whole story).
function AnatomyRow({ step }: { step: EditGoalStep }) {
  return (
    <EditGoalStepRow
      step={step}
      index={0}
      stepNumber={1}
      isBeingDragged={false}
      isEditing={false}
      editText=""
      onEditTextChange={() => {}}
      onStartEditing={() => {}}
      onCommitEditing={() => {}}
      onEvidenceChipPress={() => {}}
      onDragStart={() => {}}
      onDragMove={() => {}}
      onDragEnd={() => {}}
      showAccessibleControls={false}
      animationPref="full"
      isFirst
      isLast
      canDrag={false}
      onDelete={() => {}}
    />
  );
}

const anatomySingle: EditGoalStep = {
  id: "a1",
  title: "Sketch every day",
  plannedEvidenceTypes: [EvidenceType.photo],
};
const anatomyMulti: EditGoalStep = {
  id: "a2",
  title: "Collect references",
  plannedEvidenceTypes: [EvidenceType.link, EvidenceType.photo],
};
const anatomyChips: EditGoalStep = {
  id: "a3",
  title: "Review with mentor",
  plannedEvidenceTypes: [EvidenceType.voice_memo],
  dateDepChips: [
    { tone: "after", text: "after Sketch every day" },
    { tone: "waiting", text: "Alex" },
    { tone: "due", text: "Fri" },
  ],
};

/**
 * Visual gate for D4/D5: the same row shape with a single evidence pill, with
 * two pills (multi-type), and with evidence + date/dependency chips. The chip
 * row is genuinely conditional — the single- and multi-pill rows show no
 * placeholder where chips are absent.
 */
export const RowAnatomy: Story = {
  render: () => (
    <View style={{ gap: 16, padding: 12 }}>
      <Text style={{ fontSize: 12, fontWeight: "700" }}>One evidence type</Text>
      <AnatomyRow step={anatomySingle} />
      <Text style={{ fontSize: 12, fontWeight: "700" }}>
        Two evidence types (multi-pill)
      </Text>
      <AnatomyRow step={anatomyMulti} />
      <Text style={{ fontSize: 12, fontWeight: "700" }}>
        Evidence + date/dependency chips
      </Text>
      <AnatomyRow step={anatomyChips} />
    </View>
  ),
};

// Static (non-interactive) EditGoalView for theme review — the whole view, so
// it covers the goal-title card, description, add-step row, dates, footer/Done,
// and the sub-step mint rail. Callbacks are no-ops: this is a visual gate, not
// an interaction (that's what the Interactive* stories are for).
function MatrixEditGoal() {
  return (
    <EditGoalView
      goalTitle="Learn watercolor basics"
      onGoalTitleChange={noop}
      steps={initialSteps}
      onReorderSteps={noop}
      onReorderSubSteps={noop}
      onAddStep={noop}
      onStepTitleChange={noop}
      onStepEvidenceChange={noop}
      onAddSubStep={noop}
      onSubStepTitleChange={noop}
      onSubStepEvidenceChange={noop}
      onDeleteSubStep={noop}
      onDeleteStep={noop}
      onOverflowPress={noop}
      onBack={noop}
      onDone={noop}
    />
  );
}

/**
 * EditGoalView in the active theme — reviewed across themes via the Storybook
 * theme toolbar (top bar), NOT a live per-cell matrix.
 *
 * Why no 7-cell `<ScopedTheme>` matrix like the sibling components? EditGoalView
 * re-renders after mount — its `useAnimationPref` + the AccessibilityInfo
 * screen-reader/reduce-motion probes resolve async and `setState`. On web,
 * `<ScopedTheme>` applies the scoped theme only during the initial render pass;
 * a later re-render recomputes styles against the *active* theme, so every cell
 * would silently revert to the toolbar theme (a "null matrix"). The prop-driven
 * siblings whose matrices never re-render (TimelineNode, the Focus family, …)
 * don't hit this — EditGoalView does, as do TimelineStep (once its expand/
 * collapse chevron is tapped) and BadgesWall (post-mount `onLayout`), which use
 * this same toolbar treatment. The component honours the active theme correctly,
 * so the toolbar switcher is the reliable way to review all 7 themes here.
 */
export const AllThemesMatrix: Story = {
  render: () => (
    <View style={{ gap: 12 }}>
      <Text style={{ fontSize: 12, fontStyle: "italic", padding: 12 }}>
        Switch the theme toolbar (top bar) to review this screen across all 7
        product themes. A live per-cell matrix can’t work here: EditGoalView
        re-renders after mount, and on web that reverts a ScopedTheme cell to
        the active theme.
      </Text>
      <MatrixEditGoal />
    </View>
  ),
};

/**
 * The ⋯ overflow menu content in isolation (D7) — a single demoted "Delete
 * goal" destructive row. Open/close + positioning + confirm-delete are the
 * [Integrate] issue's job.
 */
export const OverflowMenu: Story = {
  render: () => (
    <View style={{ padding: 16, alignItems: "flex-start" }}>
      <EditGoalOverflowMenu onDelete={() => {}} />
    </View>
  ),
};
