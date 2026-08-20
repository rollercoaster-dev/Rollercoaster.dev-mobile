import React from "react";
import { AccessibilityInfo } from "react-native";
import {
  renderWithProviders,
  screen,
  fireEvent,
  act,
} from "../../../__tests__/test-utils";
import { EditGoalRowTiming, bindRowTiming } from "../EditGoalRowTiming";
import type { EditGoalTiming, EditGoalTimingHost } from "../EditGoalView";

// findNodeHandle is a lazy getter on react-native's index, so jest.spyOn can't
// replace it in place. Every view resolves to one tag: these tests assert
// *whether* focus was requested, which is the contract — the swap must never
// leave assistive tech on an element it just unmounted.
jest.mock("react-native", () => {
  const RN = jest.requireActual("react-native");
  Object.defineProperty(RN, "findNodeHandle", {
    configurable: true,
    value: jest.fn(() => 111),
  });
  return RN;
});

const NOW = new Date(2026, 5, 24);
const TEST_ID = "row-timing";

const TIMING: EditGoalTiming = {
  value: { dueDate: null, afterStepId: null },
  candidates: [
    { id: "s2", title: "Wire the circuits", label: "2", dueDate: null },
  ],
  afterStepTitle: null,
  afterStepIsCompleted: false,
  dueDateLabel: null,
  marks: [],
};

function baseProps(
  overrides: Partial<React.ComponentProps<typeof EditGoalRowTiming>> = {},
) {
  return {
    title: "Mount the panels",
    chips: [{ tone: "waiting" as const, text: "waiting on Alex" }],
    timing: TIMING,
    onEditTiming: jest.fn(),
    onCommitTiming: jest.fn(),
    onClearTiming: jest.fn(),
    onCollapseTiming: jest.fn(),
    now: NOW,
    testID: TEST_ID,
    ...overrides,
  };
}

const editorTestId = `${TEST_ID}-editor`;

describe("EditGoalRowTiming", () => {
  it("reads out the row's chips while collapsed, editor unmounted", () => {
    renderWithProviders(<EditGoalRowTiming {...baseProps()} />);

    expect(screen.getByText("waiting on Alex")).toBeOnTheScreen();
    expect(screen.queryByTestId(editorTestId)).toBeNull();
  });

  it("swaps the line for the editor when expanded", () => {
    renderWithProviders(
      <EditGoalRowTiming {...baseProps()} isTimingExpanded />,
    );

    expect(screen.getByTestId(editorTestId)).toBeOnTheScreen();
    // The editor has no `waiting` case by design (#573), so the chip goes with
    // the line it replaced rather than being rendered twice or half.
    expect(screen.queryByText("waiting on Alex")).toBeNull();
  });

  // A row missing any of the editor's hard requirements keeps reading out
  // rather than mounting something half-wired — the New Goal wizard and every
  // Storybook story land here.
  it.each([
    { missing: "timing", override: { timing: undefined } },
    { missing: "now", override: { now: undefined } },
    { missing: "onCommitTiming", override: { onCommitTiming: undefined } },
    { missing: "onClearTiming", override: { onClearTiming: undefined } },
  ])("stays read-only when $missing is absent", ({ override }) => {
    renderWithProviders(
      <EditGoalRowTiming {...baseProps(override)} isTimingExpanded />,
    );

    expect(screen.queryByTestId(editorTestId)).toBeNull();
    expect(screen.getByText("waiting on Alex")).toBeOnTheScreen();
  });

  it("reports the editor's close request outward instead of acting on it", () => {
    const onCollapseTiming = jest.fn();
    renderWithProviders(
      <EditGoalRowTiming
        {...baseProps({ onCollapseTiming })}
        isTimingExpanded
      />,
    );

    fireEvent.press(screen.getByTestId(`${TEST_ID}-timing-line`));

    expect(onCollapseTiming).toHaveBeenCalledTimes(1);
    // Still open: only the host decides, so a failed write can keep the draft.
    expect(screen.getByTestId(editorTestId)).toBeOnTheScreen();
  });

  describe("accessibility focus across the swap", () => {
    let setFocus: jest.SpyInstance;

    beforeEach(() => {
      jest.useFakeTimers();
      setFocus = jest
        .spyOn(AccessibilityInfo, "setAccessibilityFocus")
        .mockImplementation(() => undefined);
    });

    afterEach(() => {
      act(() => {
        jest.runOnlyPendingTimers();
      });
      jest.useRealTimers();
      setFocus.mockRestore();
    });

    const flush = () =>
      act(() => {
        jest.runAllTimers();
      });

    // The list paints every row's line at once; all of them demanding focus
    // would be worse than none of them doing it.
    it.each([
      { state: "collapsed", expanded: false },
      { state: "expanded", expanded: true },
    ])(
      "takes no focus on a first paint that is already $state",
      ({ expanded }) => {
        renderWithProviders(
          <EditGoalRowTiming {...baseProps()} isTimingExpanded={expanded} />,
        );
        flush();

        expect(setFocus).not.toHaveBeenCalled();
      },
    );

    it("moves focus into the editor when the row opens", () => {
      const { rerender } = renderWithProviders(
        <EditGoalRowTiming {...baseProps()} />,
      );
      flush();
      expect(setFocus).not.toHaveBeenCalled();

      rerender(<EditGoalRowTiming {...baseProps()} isTimingExpanded />);
      flush();

      expect(setFocus).toHaveBeenCalled();
    });

    it("moves focus back to the line when the row closes", () => {
      const { rerender } = renderWithProviders(
        <EditGoalRowTiming {...baseProps()} />,
      );
      rerender(<EditGoalRowTiming {...baseProps()} isTimingExpanded />);
      flush();
      setFocus.mockClear();

      rerender(<EditGoalRowTiming {...baseProps()} />);
      flush();

      expect(setFocus).toHaveBeenCalled();
    });
  });
});

describe("bindRowTiming", () => {
  const host: EditGoalTimingHost = {
    expandedId: "s1",
    onCommit: jest.fn(),
    onClear: jest.fn(),
    onCollapse: jest.fn(),
    now: NOW,
    locale: "de",
    copy: { nothingLabel: "nichts" },
  };

  beforeEach(() => jest.clearAllMocks());

  it("binds every callback to the row's own id", () => {
    const bound = bindRowTiming(host, "s2");
    const draft = { dueDate: "2026-06-30", afterStepId: null };

    bound.onCommitTiming?.(draft);
    bound.onClearTiming?.();
    bound.onCollapseTiming?.();

    expect(host.onCommit).toHaveBeenCalledWith("s2", draft);
    expect(host.onClear).toHaveBeenCalledWith("s2");
    expect(host.onCollapse).toHaveBeenCalledWith("s2");
  });

  it("marks only the host's own expanded id as expanded", () => {
    expect(bindRowTiming(host, "s1").isTimingExpanded).toBe(true);
    expect(bindRowTiming(host, "s2").isTimingExpanded).toBe(false);
  });

  it("passes the host's clock, locale and copy through untouched", () => {
    const bound = bindRowTiming(host, "s1");

    expect(bound.timingNow).toBe(NOW);
    expect(bound.timingLocale).toBe("de");
    expect(bound.timingCopy).toBe(host.copy);
  });

  // No host → the row cannot expand at all, which is how Storybook and the New
  // Goal wizard get a read-only line without opting out of anything.
  it("yields nothing at all without a host", () => {
    expect(bindRowTiming(undefined, "s1")).toEqual({});
  });
});
