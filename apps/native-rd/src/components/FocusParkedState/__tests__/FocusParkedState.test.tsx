import React from "react";
import {
  renderWithProviders,
  screen,
  fireEvent,
} from "../../../__tests__/test-utils";
import { FocusParkedState, type FocusParkedRow } from "../FocusParkedState";

const makeRows = (n: number): FocusParkedRow[] =>
  Array.from({ length: n }, (_, i) => ({
    id: `s${i + 1}`,
    title: `Paused step ${i + 1}`,
    onResume: jest.fn(),
  }));

// Verbatim body copy, count interpolated from rows.length. The "all still here,
// none hidden, nothing counted" phrasing is a regression guard against future
// "missing"/"needed" drift — paused steps are never framed as absent.
const bodyFor = (count: number) =>
  `${count} set aside — all still here, none hidden, nothing counted. Pick one back up when you're ready.`;

const labelFor = (title: string) => `${title}, paused. Resume.`;

describe("FocusParkedState", () => {
  it.each([1, 4])(
    "shows the heading and verbatim body for %i row(s)",
    (count) => {
      renderWithProviders(<FocusParkedState rows={makeRows(count)} />);
      expect(screen.getByText("Nothing in progress.")).toBeTruthy();
      expect(screen.getByText(bodyFor(count))).toBeTruthy();
    },
  );

  it("renders one pill, title, and resume affordance per row", () => {
    const rows = makeRows(4);
    renderWithProviders(<FocusParkedState rows={rows} />);
    expect(screen.getAllByText("Paused")).toHaveLength(rows.length);
    expect(screen.getAllByText("resume ›")).toHaveLength(rows.length);
    rows.forEach((row) => {
      expect(screen.getByText(row.title)).toBeTruthy();
    });
  });

  it("pill text is the shared Title-Case 'Paused' label", () => {
    renderWithProviders(<FocusParkedState rows={makeRows(1)} />);
    expect(screen.getByText("Paused")).toBeTruthy();
  });

  it.each([0, 1, 2, 3])(
    "tapping row %i's resume fires only that row's handler",
    (index) => {
      const rows = makeRows(4);
      renderWithProviders(<FocusParkedState rows={rows} />);
      fireEvent.press(screen.getByLabelText(labelFor(rows[index].title)));
      expect(rows[index].onResume).toHaveBeenCalledTimes(1);
      rows.forEach((row, i) => {
        if (i !== index) {
          expect(row.onResume).not.toHaveBeenCalled();
        }
      });
    },
  );

  it("each row is a button whose label includes the step title", () => {
    const rows = makeRows(2);
    renderWithProviders(<FocusParkedState rows={rows} />);
    rows.forEach((row) => {
      const rowEl = screen.getByLabelText(labelFor(row.title));
      expect(rowEl.props.accessibilityRole).toBe("button");
      expect(rowEl.props.accessibilityLabel).toContain(row.title);
    });
  });
});
