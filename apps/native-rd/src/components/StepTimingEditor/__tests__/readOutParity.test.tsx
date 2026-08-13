import React from "react";
import { renderWithProviders, screen } from "../../../__tests__/test-utils";
import { formatDate } from "../../../utils/format";
import { TimelineStep } from "../../TimelineStep";
import { StepTimingEditor } from "../StepTimingEditor";

/**
 * #573's read-out parity check: a step authored in the editor, then opened in
 * Focus or Timeline, must produce the same line. If it does not, the input is
 * wrong — so this asserts the strings against each other rather than against a
 * hard-coded copy of either.
 *
 * Both sides are driven from the same `formatDate` output, so a change to the
 * formatter breaks this test rather than silently diverging the two surfaces.
 */
const NOW = new Date(2026, 5, 24);
const DUE_ISO = "2026-06-30";
const DUE_LABEL = formatDate(DUE_ISO, "en-US");
const AFTER_TITLE = "Inspection & labels";

function renderTimelineBand() {
  const { unmount } = renderWithProviders(
    <TimelineStep
      step={{
        id: "step-4",
        title: "Mount the panels",
        status: "pending",
        evidenceCount: 0,
        afterStep: AFTER_TITLE,
        dueDate: DUE_LABEL,
      }}
      stepIndex={3}
      evidence={[]}
      onNodePress={jest.fn()}
      onEvidencePress={jest.fn()}
    />,
  );

  const lines = {
    after: screen.getByText(`after ${AFTER_TITLE}`).props.children,
    due: screen.getByText(`due ${DUE_LABEL}`).props.children,
  };
  unmount();
  return lines;
}

function renderEditorLines() {
  const { unmount } = renderWithProviders(
    <StepTimingEditor
      value={{ dueDate: DUE_ISO, afterStepId: "s3" }}
      now={NOW}
      candidates={[
        { id: "s3", title: AFTER_TITLE, label: "3", dueDate: DUE_ISO },
      ]}
      afterStepTitle={AFTER_TITLE}
      dueDateLabel={DUE_LABEL}
      onCommit={jest.fn()}
      onClear={jest.fn()}
    />,
  );

  const lines = {
    after: screen.getByTestId("step-timing-editor-after-line").props.children,
    due: screen.getByTestId("step-timing-editor-due-line").props.children,
  };
  unmount();
  return lines;
}

/** Flatten a Text's children to the string a reader would hear. */
function textOf(children: unknown): string {
  if (children == null || typeof children === "boolean") return "";
  if (Array.isArray(children)) return children.map(textOf).join("");
  if (typeof children === "object" && "props" in (children as object)) {
    return textOf(
      (children as { props: { children?: unknown } }).props.children,
    );
  }
  return String(children);
}

describe("read-out parity with Timeline", () => {
  it("renders the same `after` line Timeline renders", () => {
    const timeline = renderTimelineBand();
    const editor = renderEditorLines();

    expect(textOf(editor.after)).toBe(textOf(timeline.after));
  });

  it("renders the same `due` line Timeline renders", () => {
    const timeline = renderTimelineBand();
    const editor = renderEditorLines();

    expect(textOf(editor.due)).toBe(textOf(timeline.due));
  });

  /**
   * The suffix is opt-in and off by default precisely so the two surfaces
   * agree. Neither Focus nor Timeline renders a completion suffix today —
   * `resolveStepDependencyBand` supplies no done-state to back one — so the
   * default render must carry none either.
   */
  it("carries no completion suffix at the default", () => {
    const editor = renderEditorLines();

    expect(textOf(editor.after)).toBe(`after ${AFTER_TITLE}`);
    expect(textOf(editor.after)).not.toContain("done");
    expect(textOf(editor.after)).not.toContain("✓");
  });
});
