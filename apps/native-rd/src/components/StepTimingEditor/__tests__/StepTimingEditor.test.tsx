import React from "react";
import {
  renderWithProviders,
  screen,
  fireEvent,
  within,
} from "../../../__tests__/test-utils";
import { StepTimingEditor } from "../StepTimingEditor";
import type { StepTimingCandidate } from "../types";

const NOW = new Date(2026, 5, 24);

const CANDIDATES: StepTimingCandidate[] = [
  {
    id: "s2",
    title: "Wire the circuits",
    label: "2",
    isCompleted: true,
    dueDate: null,
  },
  { id: "s3", title: "Inspection & labels", label: "3", dueDate: "2026-06-30" },
  {
    id: "s3b",
    title: "Walk the inspector through",
    label: "b",
    isSubStep: true,
    dueDate: "2026-06-26",
  },
];

const baseProps = {
  value: { dueDate: null, afterStepId: null },
  now: NOW,
  candidates: CANDIDATES,
  onCommit: jest.fn(),
  onClear: jest.fn(),
};

const timingLine = () => screen.getByTestId("step-timing-editor-timing-line");
const expand = () => fireEvent.press(timingLine());

describe("StepTimingEditor timing line", () => {
  beforeEach(() => jest.clearAllMocks());

  it("shows exactly one affordance when nothing is set", () => {
    renderWithProviders(<StepTimingEditor {...baseProps} />);

    expect(screen.getByText("＋ when?")).toBeOnTheScreen();
    // One line, not two ghost chips.
    expect(
      screen.queryAllByTestId("step-timing-editor-timing-line"),
    ).toHaveLength(1);
  });

  it("shows both truth lines when both are set", () => {
    renderWithProviders(
      <StepTimingEditor
        {...baseProps}
        value={{ dueDate: "2026-07-02", afterStepId: "s3" }}
        afterStepTitle="Inspection & labels"
        dueDateLabel="Jul 2, 2026"
      />,
    );

    expect(
      screen.getByTestId("step-timing-editor-after-line"),
    ).toHaveTextContent("after Inspection & labels");
    expect(screen.getByTestId("step-timing-editor-due-line")).toHaveTextContent(
      "due Jul 2, 2026",
    );
    expect(screen.queryByText("＋ when?")).toBeNull();
  });

  // Nothing is left to plan on a finished step.
  it("renders no affordance at all for a completed step with no timing", () => {
    renderWithProviders(<StepTimingEditor {...baseProps} isCompleted />);

    expect(screen.queryByTestId("step-timing-editor-timing-line")).toBeNull();
    expect(screen.queryByText("＋ when?")).toBeNull();
  });

  it("still shows the timing a completed step already has", () => {
    renderWithProviders(
      <StepTimingEditor
        {...baseProps}
        isCompleted
        value={{ dueDate: "2026-06-20", afterStepId: null }}
        dueDateLabel="Jun 20, 2026"
      />,
    );

    expect(screen.getByTestId("step-timing-editor-due-line")).toHaveTextContent(
      "due Jun 20, 2026",
    );
  });

  it("reports its expanded state and flips it on tap", () => {
    renderWithProviders(<StepTimingEditor {...baseProps} />);

    expect(timingLine().props.accessibilityState.expanded).toBe(false);
    expand();
    expect(timingLine().props.accessibilityState.expanded).toBe(true);
    fireEvent.press(timingLine());
    expect(timingLine().props.accessibilityState.expanded).toBe(false);
  });

  it("omits the completion suffix by default, matching Focus and Timeline", () => {
    renderWithProviders(
      <StepTimingEditor
        {...baseProps}
        value={{ dueDate: null, afterStepId: "s2" }}
        afterStepTitle="Wire the circuits"
      />,
    );

    expect(
      screen.getByTestId("step-timing-editor-after-line"),
    ).toHaveTextContent("after Wire the circuits");
  });
});

describe("StepTimingEditor draft commit and discard", () => {
  beforeEach(() => jest.clearAllMocks());

  it("does not call onCommit when the editor is collapsed without Done", () => {
    const onCommit = jest.fn();
    renderWithProviders(
      <StepTimingEditor {...baseProps} onCommit={onCommit} />,
    );

    expand();
    fireEvent.press(
      screen.getByTestId("step-timing-editor-grid-day-2026-06-30"),
    );
    fireEvent.press(timingLine());

    expect(onCommit).not.toHaveBeenCalled();
  });

  it("discards the abandoned draft on the next open", () => {
    renderWithProviders(<StepTimingEditor {...baseProps} />);

    expand();
    fireEvent.press(
      screen.getByTestId("step-timing-editor-grid-day-2026-06-30"),
    );
    fireEvent.press(timingLine());
    expand();

    // Back to the committed value (nothing), not the discarded Jun 30.
    expect(
      screen.getByTestId("step-timing-editor-grid-day-2026-06-30").props
        .accessibilityState.selected,
    ).toBe(false);
  });

  it("commits the draft once on Done", () => {
    const onCommit = jest.fn();
    renderWithProviders(
      <StepTimingEditor {...baseProps} onCommit={onCommit} />,
    );

    expand();
    fireEvent.press(
      screen.getByTestId("step-timing-editor-grid-day-2026-06-30"),
    );
    fireEvent.press(screen.getByTestId("step-timing-editor-depends-on-toggle"));
    fireEvent.press(
      screen.getByTestId("step-timing-editor-depends-on-option-s3"),
    );
    fireEvent.press(screen.getByTestId("step-timing-editor-done"));

    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenCalledWith({
      dueDate: "2026-06-30",
      afterStepId: "s3",
    });
  });

  it("calls onClear and collapses on Clear", () => {
    const onClear = jest.fn();
    renderWithProviders(<StepTimingEditor {...baseProps} onClear={onClear} />);

    expand();
    fireEvent.press(screen.getByTestId("step-timing-editor-clear"));

    expect(onClear).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId("step-timing-editor-editor")).toBeNull();
  });

  // Per-field clearing exists, so `Clear` is a convenience and not the only
  // route to dateless.
  it("clears just the date by tapping the selected day again", () => {
    const onCommit = jest.fn();
    renderWithProviders(
      <StepTimingEditor
        {...baseProps}
        value={{ dueDate: "2026-06-30", afterStepId: "s3" }}
        onCommit={onCommit}
      />,
    );

    expand();
    fireEvent.press(
      screen.getByTestId("step-timing-editor-grid-day-2026-06-30"),
    );
    fireEvent.press(screen.getByTestId("step-timing-editor-done"));

    expect(onCommit).toHaveBeenCalledWith({
      dueDate: null,
      afterStepId: "s3",
    });
  });

  it("clears just the dependency by choosing nothing", () => {
    const onCommit = jest.fn();
    renderWithProviders(
      <StepTimingEditor
        {...baseProps}
        value={{ dueDate: "2026-06-30", afterStepId: "s3" }}
        onCommit={onCommit}
      />,
    );

    expand();
    fireEvent.press(screen.getByTestId("step-timing-editor-depends-on-toggle"));
    fireEvent.press(
      screen.getByTestId("step-timing-editor-depends-on-option-nothing"),
    );
    fireEvent.press(screen.getByTestId("step-timing-editor-done"));

    expect(onCommit).toHaveBeenCalledWith({
      dueDate: "2026-06-30",
      afterStepId: null,
    });
  });
});

describe("StepTimingEditor candidate list", () => {
  beforeEach(() => jest.clearAllMocks());

  const openPicker = () => {
    expand();
    fireEvent.press(screen.getByTestId("step-timing-editor-depends-on-toggle"));
  };

  it("offers every candidate plus nothing, including sub-steps", () => {
    renderWithProviders(<StepTimingEditor {...baseProps} />);
    openPicker();

    expect(
      screen.getByTestId("step-timing-editor-depends-on-option-nothing"),
    ).toBeOnTheScreen();
    for (const candidate of CANDIDATES) {
      expect(
        screen.getByTestId(
          `step-timing-editor-depends-on-option-${candidate.id}`,
        ),
      ).toBeOnTheScreen();
    }
  });

  it("marks the current selection and only it", () => {
    renderWithProviders(
      <StepTimingEditor
        {...baseProps}
        value={{ dueDate: null, afterStepId: "s3" }}
      />,
    );
    openPicker();

    expect(
      screen.getByTestId("step-timing-editor-depends-on-option-s3").props
        .accessibilityState.selected,
    ).toBe(true);
    expect(
      screen.getByTestId("step-timing-editor-depends-on-option-s3b").props
        .accessibilityState.selected,
    ).toBe(false);
    expect(
      screen.getByTestId("step-timing-editor-depends-on-option-nothing").props
        .accessibilityState.selected,
    ).toBe(false);
  });

  it("marks nothing as selected when there is no dependency", () => {
    renderWithProviders(<StepTimingEditor {...baseProps} />);
    openPicker();

    expect(
      screen.getByTestId("step-timing-editor-depends-on-option-nothing").props
        .accessibilityState.selected,
    ).toBe(true);
  });

  it("renders a completed candidate as completed rather than refusing it", () => {
    renderWithProviders(<StepTimingEditor {...baseProps} />);
    openPicker();

    const completed = screen.getByTestId(
      "step-timing-editor-depends-on-option-s2",
    );
    const pending = screen.getByTestId(
      "step-timing-editor-depends-on-option-s3",
    );

    // A completed candidate drops its ordinal for a check mark; a pending one
    // keeps its ordinal. Either way the candidate stays pickable — completed
    // is a fact about it, not a refusal.
    expect(within(completed).queryByText("2")).toBeNull();
    expect(within(pending).getByText("3")).toBeOnTheScreen();
    expect(completed.props.accessibilityState?.disabled).toBeFalsy();
  });

  it("shows the empty-state copy instead of an empty box", () => {
    renderWithProviders(<StepTimingEditor {...baseProps} candidates={[]} />);
    openPicker();

    expect(
      screen.getByTestId("step-timing-editor-depends-on-empty"),
    ).toHaveTextContent("No other steps in this goal yet.");
    expect(
      screen.queryByTestId("step-timing-editor-depends-on-list"),
    ).toBeNull();
  });
});

describe("StepTimingEditor ordering note", () => {
  beforeEach(() => jest.clearAllMocks());

  const note = () => screen.queryByTestId("step-timing-editor-ordering-note");

  const openWith = (dueDate: string | null, afterStepId: string | null) => {
    renderWithProviders(
      <StepTimingEditor {...baseProps} value={{ dueDate, afterStepId }} />,
    );
    expand();
  };

  test.each<[string | null, string | null, boolean, string]>([
    ["2026-06-26", "s3", true, "draft day falls before the dependency's"],
    ["2026-06-30", "s3", false, "same day as the dependency"],
    ["2026-07-02", "s3", false, "after the dependency"],
    ["2026-06-26", "s2", false, "dependency has no day of its own"],
    ["2026-06-26", null, false, "no dependency at all"],
    [null, "s3", false, "no day on this step"],
  ])("due %s + after %s → note shown: %s (%s)", (due, after, shown) => {
    openWith(due, after);
    if (shown) {
      expect(note()).toBeOnTheScreen();
    } else {
      expect(note()).toBeNull();
    }
  });

  it("states the fact in plain copy, naming the dependency and its day", () => {
    openWith("2026-06-26", "s3");

    expect(note()).toHaveTextContent(
      "Inspection & labels needs to be done first, and it sits on 2026-06-30. " +
        "This one lands before it — that's allowed, it just won't read in order.",
    );
  });

  // Informs, never enforces: no alert role, nothing disabled, and the choice
  // that triggered it stands.
  it("is neutral — no alert role, and nothing is disabled or refused", () => {
    openWith("2026-06-26", "s3");

    expect(note()?.props.accessibilityRole).toBeUndefined();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(
      screen.getByTestId("step-timing-editor-grid-day-2026-06-26").props
        .accessibilityState.selected,
    ).toBe(true);
    expect(
      screen.getByTestId("step-timing-editor-done").props.accessibilityState
        ?.disabled,
    ).toBeFalsy();
  });
});

describe("StepTimingEditor a11y", () => {
  beforeEach(() => jest.clearAllMocks());

  // The label overrides the children's text, so a constant would announce the
  // same thing set or unset — it has to carry the state instead.
  it("labels the unset timing line as a prompt", () => {
    renderWithProviders(<StepTimingEditor {...baseProps} />);

    expect(timingLine().props.accessibilityRole).toBe("button");
    expect(timingLine().props.accessibilityLabel).toBe(
      "Set timing for this step",
    );
  });

  it("reads the truth lines back once timing is set", () => {
    renderWithProviders(
      <StepTimingEditor
        {...baseProps}
        value={{ dueDate: "2026-07-02", afterStepId: "s2" }}
        afterStepTitle="Wire the circuits"
        afterStepIsCompleted
        dueDateLabel="Jul 2, 2026"
      />,
    );

    // "done" as a word: a screen reader given `· done ✓` reads punctuation.
    expect(timingLine().props.accessibilityLabel).toBe(
      "after Wire the circuits, done, due Jul 2, 2026",
    );
  });

  test.each([
    ["step-timing-editor-depends-on-toggle"],
    ["step-timing-editor-clear"],
    ["step-timing-editor-done"],
  ])("%s is a labelled button", (testID) => {
    renderWithProviders(<StepTimingEditor {...baseProps} />);
    expand();

    const element = screen.getByTestId(testID);
    expect(element.props.accessibilityRole).toBe("button");
    expect(element.props.accessibilityLabel).toBeTruthy();
  });

  it("labels every candidate row", () => {
    renderWithProviders(<StepTimingEditor {...baseProps} />);
    expand();
    fireEvent.press(screen.getByTestId("step-timing-editor-depends-on-toggle"));

    for (const candidate of CANDIDATES) {
      const row = screen.getByTestId(
        `step-timing-editor-depends-on-option-${candidate.id}`,
      );
      expect(row.props.accessibilityRole).toBe("button");
      expect(row.props.accessibilityLabel).toBe(candidate.title);
    }
  });
});
