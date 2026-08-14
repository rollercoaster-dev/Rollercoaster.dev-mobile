import React from "react";
import {
  renderWithProviders,
  screen,
  fireEvent,
} from "../../../__tests__/test-utils";
import { StepDayGrid, type StepDayMark } from "../StepDayGrid";

// The prototype's pinned instant — Wed 24 June 2026. Never `new Date()`: the
// grid's today-ring and past-day quieting are both derived from `now`.
const NOW = new Date(2026, 5, 24);

const baseProps = {
  value: null,
  now: NOW,
  onChange: jest.fn(),
};

const day = (iso: string) => screen.getByTestId(`step-day-grid-day-${iso}`);

describe("StepDayGrid selection", () => {
  beforeEach(() => jest.clearAllMocks());

  it("fires onChange with the tapped day", () => {
    const onChange = jest.fn();
    renderWithProviders(<StepDayGrid {...baseProps} onChange={onChange} />);

    fireEvent.press(day("2026-06-30"));
    expect(onChange).toHaveBeenCalledWith("2026-06-30");
  });

  it("clears when the selected day is tapped again", () => {
    const onChange = jest.fn();
    renderWithProviders(
      <StepDayGrid {...baseProps} value="2026-06-30" onChange={onChange} />,
    );

    fireEvent.press(day("2026-06-30"));
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it("marks the selected day as selected, and only that day", () => {
    renderWithProviders(<StepDayGrid {...baseProps} value="2026-06-30" />);

    expect(day("2026-06-30").props.accessibilityState.selected).toBe(true);
    expect(day("2026-06-29").props.accessibilityState.selected).toBe(false);
  });

  // The "never refused" contract: past days are the whole reason `was expected`
  // (#571) and "I meant last Tuesday" work at all.
  it("still fires onChange for a past day", () => {
    const onChange = jest.fn();
    renderWithProviders(<StepDayGrid {...baseProps} onChange={onChange} />);

    fireEvent.press(day("2026-06-01"));
    expect(onChange).toHaveBeenCalledWith("2026-06-01");
  });

  it("never disables a day cell", () => {
    renderWithProviders(<StepDayGrid {...baseProps} />);

    for (let d = 1; d <= 30; d += 1) {
      const iso = `2026-06-${String(d).padStart(2, "0")}`;
      const cell = day(iso);
      expect(cell.props.accessibilityState?.disabled).toBeFalsy();
      expect(cell.props.disabled).toBeFalsy();
    }
  });
});

describe("StepDayGrid month navigation", () => {
  beforeEach(() => jest.clearAllMocks());

  it("opens on the selected day's month, not on now's", () => {
    renderWithProviders(<StepDayGrid {...baseProps} value="2026-11-15" />);
    expect(screen.getByTestId("step-day-grid-month-label")).toHaveTextContent(
      "November 2026",
    );
  });

  it("reaches the same month a year on after twelve forward taps", () => {
    renderWithProviders(<StepDayGrid {...baseProps} />);
    const next = screen.getByTestId("step-day-grid-next");

    for (let i = 0; i < 12; i += 1) fireEvent.press(next);

    expect(screen.getByTestId("step-day-grid-month-label")).toHaveTextContent(
      "June 2027",
    );
  });

  it("navigates backwards across the year boundary", () => {
    renderWithProviders(<StepDayGrid {...baseProps} value="2026-01-10" />);
    fireEvent.press(screen.getByTestId("step-day-grid-prev"));

    expect(screen.getByTestId("step-day-grid-month-label")).toHaveTextContent(
      "December 2025",
    );
  });

  it("keeps a day reachable in a month far from now", () => {
    const onChange = jest.fn();
    renderWithProviders(<StepDayGrid {...baseProps} onChange={onChange} />);

    for (let i = 0; i < 12; i += 1)
      fireEvent.press(screen.getByTestId("step-day-grid-next"));
    fireEvent.press(day("2027-06-15"));

    expect(onChange).toHaveBeenCalledWith("2027-06-15");
  });
});

describe("StepDayGrid leading blanks (Monday-first)", () => {
  test.each([
    ["2026-11-15", "November 2026 starts on a Sunday", 6],
    ["2026-06-15", "June 2026 starts on a Monday", 0],
    ["2026-08-15", "August 2026 starts on a Saturday", 5],
  ])("%s (%s) renders %i blanks", (value, _why, expected) => {
    renderWithProviders(<StepDayGrid {...baseProps} value={value} />);
    // Blanks are hidden from the a11y tree, so they need the hidden-element
    // query — that they are hidden is itself part of the contract.
    expect(
      screen.queryAllByTestId(/^step-day-grid-blank-/, {
        includeHiddenElements: true,
      }),
    ).toHaveLength(expected);
  });
});

describe("StepDayGrid marks", () => {
  const marks: StepDayMark[] = [
    { date: "2026-06-30", label: "3" },
    { date: "2026-06-30", label: "a" },
    { date: "2026-06-30", label: "b" },
    { date: "2026-06-26", label: "2" },
  ];

  it("renders two ordinal badges plus one overflow badge for three marks", () => {
    renderWithProviders(<StepDayGrid {...baseProps} marks={marks} />);
    const badge = (suffix: string) =>
      screen.getByTestId(`step-day-grid-day-2026-06-30-${suffix}`);

    // First two ordinals shown in order; the third collapses into the overflow
    // badge rather than adding a third — the cell is 44pt wide, not a list.
    expect(badge("mark-0")).toHaveTextContent("3");
    expect(badge("mark-1")).toHaveTextContent("a");
    expect(
      screen.queryByTestId("step-day-grid-day-2026-06-30-mark-2"),
    ).toBeNull();
    expect(badge("overflow")).toHaveTextContent("+");
  });

  it("omits the overflow badge when a day carries one mark", () => {
    renderWithProviders(<StepDayGrid {...baseProps} marks={marks} />);
    expect(
      screen.queryByTestId("step-day-grid-day-2026-06-26-overflow"),
    ).toBeNull();
  });

  test.each([
    ["2026-06-26", "1 other step here"],
    ["2026-06-30", "3 other steps here"],
  ])("names the other steps on %s in its a11y label", (iso, suffix) => {
    renderWithProviders(<StepDayGrid {...baseProps} marks={marks} />);
    expect(day(iso).props.accessibilityLabel).toContain(suffix);
  });

  it("leaves an unmarked day's a11y label free of the suffix", () => {
    renderWithProviders(<StepDayGrid {...baseProps} marks={marks} />);
    expect(day("2026-06-27").props.accessibilityLabel).not.toContain(
      "other step",
    );
  });
});

describe("StepDayGrid a11y and localisation", () => {
  it("gives every day a button role and a full-date label", () => {
    renderWithProviders(<StepDayGrid {...baseProps} />);
    const cell = day("2026-06-24");

    expect(cell.props.accessibilityRole).toBe("button");
    expect(cell.props.accessibilityLabel).toContain("June");
    expect(cell.props.accessibilityLabel).toContain("2026");
    expect(cell.props.accessibilityLabel).toContain("24");
  });

  it("labels both month nav controls", () => {
    renderWithProviders(<StepDayGrid {...baseProps} />);

    expect(screen.getByLabelText("Previous month")).toBeOnTheScreen();
    expect(screen.getByLabelText("Next month")).toBeOnTheScreen();
  });

  // Guards the Intl path against a regression to a hand-written month array.
  it("renders month names in the passed locale", () => {
    renderWithProviders(<StepDayGrid {...baseProps} locale="de" />);
    expect(screen.getByTestId("step-day-grid-month-label")).toHaveTextContent(
      "Juni 2026",
    );
  });
});
