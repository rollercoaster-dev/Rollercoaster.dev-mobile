/**
 * Direct tests for the shared timing-line renderer (#575).
 *
 * EditGoalView.test.tsx already covers the line through the whole view, which
 * is the right seam for "does a press reach the screen". It cannot reach three
 * things: `isTimingExpanded` (no list or view threads it — the rows are its only
 * caller until #576), the copy-override props (the view-level tests all rely on
 * the English defaults, so a dropped passthrough anywhere in the chain still
 * reads correctly), and the `waiting` tone (display-only per D2 — the editor
 * never authors it, so no view-level fixture produces one).
 */
import React from "react";
import {
  renderWithProviders,
  screen,
  fireEvent,
} from "../../../__tests__/test-utils";
import { EditGoalTimingLine } from "../EditGoalTimingLine";
import { styles } from "../EditGoalView.styles";
import type { EditGoalDateDepChip } from "../EditGoalView";

const TEST_ID = "timing-line";

const CHIPS: EditGoalDateDepChip[] = [
  { tone: "after", text: "after Draft" },
  { tone: "due", text: "Fri" },
];

function renderLine(
  props: Partial<React.ComponentProps<typeof EditGoalTimingLine>> = {},
) {
  return renderWithProviders(
    <EditGoalTimingLine
      title="Review with mentor"
      testID={TEST_ID}
      {...props}
    />,
  );
}

describe("EditGoalTimingLine", () => {
  describe("isTimingExpanded (#576, D10)", () => {
    // The rows accept this prop but nothing above them passes it yet, so the
    // `true` branch is unreachable from any view-level test.
    it.each([
      ["collapsed", false],
      ["expanded", true],
    ])("reports %s state to a screen reader", (_name, expanded) => {
      renderLine({ onEditTiming: jest.fn(), isTimingExpanded: expanded });
      expect(screen.getByTestId(TEST_ID).props.accessibilityState).toEqual({
        expanded,
      });
    });
  });

  describe("copy overrides (D9 — [Integrate] passes t())", () => {
    it("uses the caller's prompt instead of the English default", () => {
      renderLine({ onEditTiming: jest.fn(), whenPromptLabel: "＋ wann?" });
      expect(screen.getByText("＋ wann?")).toBeOnTheScreen();
      expect(screen.queryByText("＋ when?")).toBeNull();
    });

    it("uses the caller's unset a11y label, naming the row", () => {
      renderLine({
        onEditTiming: jest.fn(),
        editTimingUnsetA11yLabel: (title) => `Termin für "${title}" setzen`,
      });
      expect(screen.getByTestId(TEST_ID).props.accessibilityLabel).toBe(
        'Termin für "Review with mentor" setzen',
      );
    });

    it("uses the caller's set a11y label, passing every line's text", () => {
      renderLine({
        chips: CHIPS,
        onEditTiming: jest.fn(),
        editTimingSetA11yLabel: (title, lines) =>
          `${title} — ${lines.join(" / ")}`,
      });
      expect(screen.getByTestId(TEST_ID).props.accessibilityLabel).toBe(
        "Review with mentor — after Draft / Fri",
      );
    });
  });

  describe("tones", () => {
    // `waiting` exists only on the read-only path: D2 keeps StepTimingEditor
    // from ever authoring it, which is the stated reason this renderer does not
    // reuse the editor's own TruthLines.
    it.each([
      ["after", "after Draft"],
      ["waiting", "waiting on Alex"],
      ["due", "Fri"],
    ] as const)("renders the %s mark beside its text", (tone, text) => {
      renderLine({ chips: [{ tone, text }] });
      // The mark is a11y-hidden by design, so it needs the hidden-inclusive
      // query; its text label is the part a screen reader gets. It is a Phosphor
      // icon, not a glyph run, so it is asserted by testID — `↩` and `⏳` both
      // resolve to the platform emoji font, which no theme can reach.
      expect(
        screen.getByTestId(`${TEST_ID}-mark-${tone}`, {
          includeHiddenElements: true,
        }),
      ).toBeOnTheScreen();
      expect(screen.getByText(text)).toBeOnTheScreen();
    });

    it("hides every mark from screen readers, leaving only the text", () => {
      renderLine({ chips: CHIPS });
      const mark = screen.getByTestId(`${TEST_ID}-mark-after`, {
        includeHiddenElements: true,
      });
      expect(mark.props.accessibilityElementsHidden).toBe(true);
      expect(mark.props.importantForAccessibility).toBe("no");
    });

    it("ships no emoji glyph on any tone", () => {
      renderLine({ chips: CHIPS });
      for (const glyph of ["↩", "⏳", "▦"]) {
        expect(
          screen.queryByText(glyph, { includeHiddenElements: true }),
        ).toBeNull();
      }
    });
  });

  describe("the set/unset boundary", () => {
    // The prop doc promises "absent/empty → the unset state"; an empty array is
    // reachable from EditGoalView today.
    it("treats an empty chip array as unset, not as set-with-no-lines", () => {
      renderLine({ chips: [], onEditTiming: jest.fn() });
      expect(screen.getByText("＋ when?")).toBeOnTheScreen();
      expect(screen.getByTestId(TEST_ID).props.accessibilityLabel).toBe(
        'Set when "Review with mentor" is due',
      );
    });

    it("never shows the prompt and the lines together", () => {
      renderLine({ chips: CHIPS, onEditTiming: jest.fn() });
      expect(screen.getByText("after Draft")).toBeOnTheScreen();
      expect(screen.getByText("Fri")).toBeOnTheScreen();
      // The whole point of the feature: one affordance, never two ghost chips.
      expect(screen.queryByText("＋ when?")).toBeNull();
    });

    it("keeps set timing on a completed row, but drops the prompt", () => {
      const { unmount } = renderLine({
        chips: CHIPS,
        isCompleted: true,
        onEditTiming: jest.fn(),
      });
      expect(screen.getByText("after Draft")).toBeOnTheScreen();
      unmount();

      renderLine({ isCompleted: true, onEditTiming: jest.fn() });
      expect(screen.queryByTestId(TEST_ID)).toBeNull();
    });
  });

  describe("touch target (D11)", () => {
    it("is a 44pt-tall full-width target, so no hitSlop is needed", () => {
      renderLine({ onEditTiming: jest.fn() });
      const line = screen.getByTestId(TEST_ID);
      expect(line.props.hitSlop).toBeUndefined();
      const flat = Object.assign(
        {},
        ...[line.props.style].flat(Infinity).filter(Boolean),
      );
      expect(flat.minHeight).toBe(44);
      expect(flat.alignSelf).toBe("stretch");
    });

    // Pressability needs native touch plumbing that Jest does not provide, so
    // the pressed branch is asserted on the stylesheet rather than by pressing.
    it("has a pressed style that adds a background the resting line lacks", () => {
      renderLine({ onEditTiming: jest.fn() });
      const resting = Object.assign(
        {},
        ...[screen.getByTestId(TEST_ID).props.style]
          .flat(Infinity)
          .filter(Boolean),
      );
      expect(resting.backgroundColor).toBeUndefined();
      expect(styles.timingLinePressed.backgroundColor).toBeDefined();
    });
  });

  describe("the inert read-only path (D7)", () => {
    it("renders chips with no button role and fires nothing on press", () => {
      renderLine({ chips: CHIPS });
      const line = screen.getByTestId(TEST_ID);
      expect(line.props.accessibilityRole).toBeUndefined();
      expect(line.props.accessibilityState).toBeUndefined();
      expect(line.props.accessibilityLabel).toBeUndefined();
    });

    it("renders nothing at all when there is no timing to show", () => {
      renderLine({});
      expect(screen.queryByTestId(TEST_ID)).toBeNull();
      expect(screen.queryByText("＋ when?")).toBeNull();
    });
  });

  it("signals once per press, and does not swallow repeat presses", () => {
    const onEditTiming = jest.fn();
    renderLine({ chips: CHIPS, onEditTiming });
    const line = screen.getByTestId(TEST_ID);
    fireEvent.press(line);
    expect(onEditTiming).toHaveBeenCalledTimes(1);
    fireEvent.press(line);
    expect(onEditTiming).toHaveBeenCalledTimes(2);
  });
});
