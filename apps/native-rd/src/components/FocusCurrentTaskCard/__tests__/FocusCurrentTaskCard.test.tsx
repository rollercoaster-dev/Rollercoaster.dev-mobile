import React from "react";
import { StyleSheet } from "react-native";
import {
  renderWithProviders,
  screen,
  fireEvent,
} from "../../../__tests__/test-utils";
import { FocusCurrentTaskCard } from "../FocusCurrentTaskCard";
import type {
  FocusCardStatus,
  FocusCapturedEvidenceItem,
  FocusCurrentTaskCardProps,
} from "../FocusCurrentTaskCard";

const captured: FocusCapturedEvidenceItem[] = [
  { id: "ev-1", type: "photo", caption: "Kitchen reset" },
  { id: "ev-2", type: "link", caption: null },
];

const ALL_STATES: FocusCardStatus[] = [
  "in-progress",
  "paused",
  "completed",
  "all-complete",
];

// Every pill-bearing state and the English word its pill must carry. in-progress
// and all-complete are intentionally absent — they render no pill (D3 + the
// all-steps-complete view), asserted separately below.
const PILL_STATES: [FocusCardStatus, string][] = [
  ["paused", "Paused"],
  ["completed", "Completed"],
];

function renderCard(overrides: Partial<FocusCurrentTaskCardProps> = {}) {
  const props: FocusCurrentTaskCardProps = {
    status: "in-progress",
    title: "Reset the kitchen",
    plannedEvidenceType: "photo",
    onPause: jest.fn(),
    onPickUp: jest.fn(),
    onMarkComplete: jest.fn(),
    onReopen: jest.fn(),
    onDesignBadge: jest.fn(),
    onChangeEvidenceType: jest.fn(),
    onAddEvidence: jest.fn(),
    ...overrides,
  };
  renderWithProviders(<FocusCurrentTaskCard {...props} />);
  return props;
}

describe("FocusCurrentTaskCard", () => {
  it.each(ALL_STATES)("renders %s without crashing", (status) => {
    renderCard({ status, capturedEvidence: captured });
    if (status === "all-complete") {
      expect(screen.getByText("Every step done.")).toBeTruthy();
    } else {
      expect(screen.getByText("Reset the kitchen")).toBeTruthy();
    }
  });

  describe("state pill (color + word, never color alone)", () => {
    it.each(PILL_STATES)(
      "%s renders a pill whose accessibilityLabel carries '%s'",
      (status, word) => {
        renderCard({ status, capturedEvidence: captured });
        expect(screen.getByLabelText(word)).toBeTruthy();
      },
    );

    it("in-progress renders no state pill", () => {
      renderCard({ status: "in-progress" });
      // "In Progress" can never label a pill (StateWordPill only takes
      // StepStateMapKey, which excludes in-progress), so assert positively on
      // what distinguishes the silent state: neither pill word renders, while
      // the in-progress-only "Evidence · required" attribute does.
      expect(screen.queryByLabelText("Paused")).toBeNull();
      expect(screen.queryByLabelText("Completed")).toBeNull();
      expect(screen.getByText("Evidence · required")).toBeTruthy();
    });

    it("all-complete renders no state pill", () => {
      renderCard({ status: "all-complete" });
      ["Pending", "In Progress", "Paused", "Completed"].forEach((word) =>
        expect(screen.queryByLabelText(word)).toBeNull(),
      );
    });
  });

  describe("in-progress evidence gate", () => {
    it("hides Mark complete when no evidence is captured", () => {
      renderCard({ status: "in-progress", capturedEvidence: [] });
      expect(screen.queryByText("✓ Mark complete")).toBeNull();
      expect(screen.queryByLabelText("Mark this step complete")).toBeNull();
    });

    it("reveals Mark complete once evidence is captured", () => {
      renderCard({ status: "in-progress", capturedEvidence: captured });
      expect(screen.getByText("✓ Mark complete")).toBeTruthy();
    });

    it("keeps Add alongside Mark complete (demoted) and still captures more", () => {
      // Evidence-present branch: Mark complete leads as the primary, but Add
      // stays so a second piece can be captured. Pressing it must still fire
      // onAddEvidence — the demoted outline button is not a dead control.
      const props = renderCard({
        status: "in-progress",
        capturedEvidence: captured,
      });
      expect(screen.getByText("✓ Mark complete")).toBeTruthy();
      fireEvent.press(screen.getByLabelText("Add Photo"));
      expect(props.onAddEvidence).toHaveBeenCalledTimes(1);
    });
  });

  describe("CTA callbacks", () => {
    it("in-progress fires onMarkComplete", () => {
      const props = renderCard({
        status: "in-progress",
        capturedEvidence: captured,
      });
      fireEvent.press(screen.getByLabelText("Mark this step complete"));
      expect(props.onMarkComplete).toHaveBeenCalledTimes(1);
    });

    it("in-progress fires onPause", () => {
      const props = renderCard({ status: "in-progress" });
      fireEvent.press(screen.getByLabelText("Set this step aside — pause it"));
      expect(props.onPause).toHaveBeenCalledTimes(1);
    });

    it("in-progress fires onChangeEvidenceType", () => {
      const props = renderCard({ status: "in-progress" });
      // The planned box announces the action + current type (not the bare
      // visible "change"), so screen-reader users get the same context as
      // sighted ones. renderCard plans "photo" → "Photo".
      fireEvent.press(
        screen.getByLabelText("Change evidence type, currently Photo"),
      );
      expect(props.onChangeEvidenceType).toHaveBeenCalledTimes(1);
    });

    it("in-progress fires onAddEvidence", () => {
      const props = renderCard({ status: "in-progress" });
      fireEvent.press(screen.getByLabelText("Add Photo"));
      expect(props.onAddEvidence).toHaveBeenCalledTimes(1);
    });

    it("paused fires onPickUp", () => {
      const props = renderCard({ status: "paused" });
      fireEvent.press(
        screen.getByLabelText("Pick this step back up and continue"),
      );
      expect(props.onPickUp).toHaveBeenCalledTimes(1);
    });

    it("completed fires onReopen", () => {
      const props = renderCard({
        status: "completed",
        capturedEvidence: captured,
      });
      fireEvent.press(
        screen.getByLabelText(
          "Reopen this step to add more evidence or continue work",
        ),
      );
      expect(props.onReopen).toHaveBeenCalledTimes(1);
    });

    it("all-complete fires onDesignBadge", () => {
      const props = renderCard({ status: "all-complete" });
      fireEvent.press(
        screen.getByLabelText(
          "Design your badge to celebrate completing this goal",
        ),
      );
      expect(props.onDesignBadge).toHaveBeenCalledTimes(1);
    });
  });

  // The no-"missing"/"needed"/"blocked" invariant — show what is present, never
  // what is absent. Whole-word match so reassuring copy like "nothing here blocks
  // you" (the helper line) is allowed while "blocked" framing is not.
  it.each(ALL_STATES)("never frames evidence as absent in %s", (status) => {
    renderCard({
      status,
      capturedEvidence: captured,
      afterStep: "Stock the pantry",
      dueDate: "Fri 11 Jul",
    });
    expect(JSON.stringify(screen.toJSON())).not.toMatch(
      /\b(missing|needed|blocked)\b/i,
    );
  });

  describe("C·B metadata band", () => {
    it("renders the internal 'after [step]' dependency line without claiming it is done", () => {
      renderCard({ status: "in-progress", afterStep: "Stock the pantry" });
      expect(screen.getByText("after Stock the pantry")).toBeTruthy();
      // The prop carries only the prerequisite's title, not its completion
      // state, so the line must not assert "✓ done" (#378 owns real data).
      expect(screen.queryByText("✓ done")).toBeNull();
    });

    it("renders the external 'waiting on [who]' line with a mono expected suffix", () => {
      renderCard({
        status: "in-progress",
        waitingOn: { who: "the clinic", expected: "Tue" },
      });
      // Lead text is plain; the trailing date detail is the mono meta suffix
      // (prototype F1–F3 — the date split, not a whole mono line).
      expect(screen.getByText("waiting on the clinic")).toBeTruthy();
      const meta = screen.getByText("· expected Tue");
      const metaFlat = StyleSheet.flatten(meta.props.style) as {
        fontFamily?: string;
      };
      expect(metaFlat.fontFamily).toBe("DM Mono");
    });

    it("renders both dependency lines at once (waiting on AND after — not exclusive)", () => {
      renderCard({
        status: "in-progress",
        waitingOn: { who: "the clinic" },
        afterStep: "Stock the pantry",
      });
      expect(screen.getByText("waiting on the clinic")).toBeTruthy();
      expect(screen.getByText("after Stock the pantry")).toBeTruthy();
    });

    it("renders the due date as plain text (mono only on suffixes) with no overdue framing", () => {
      renderCard({ status: "in-progress", dueDate: "Fri 11 Jul" });
      const dateNode = screen.getByText("due Fri 11 Jul");
      const flat = StyleSheet.flatten(dateNode.props.style) as {
        fontFamily?: string;
      };
      expect(flat.fontFamily).not.toBe("DM Mono");
      expect(screen.queryByText(/overdue/i)).toBeNull();
    });
  });

  // The read-only "Captured" rail (parts.tsx): one chip per captured piece —
  // visible caption-or-type-label beside an a11y-hidden icon, with the type kept
  // in the chip's accessibilityLabel. Mirrors the StepCard rail contract (#360).
  // Exercised through the completed view, which renders the same rail with no
  // planned-type row to collide with the chip labels.
  describe("CapturedEvidenceRail (captured chips)", () => {
    it("shows the caption as visible text and keeps the type in the a11y label", () => {
      renderCard({
        status: "completed",
        capturedEvidence: [
          { id: "ev-1", type: "photo", caption: "Kitchen reset" },
        ],
      });
      const chip = screen.getByTestId("focus-current-task-evidence-chip-ev-1");
      expect(chip.props.accessibilityLabel).toBe(
        "Kitchen reset, Photo captured",
      );
      expect(screen.getByText("Kitchen reset")).toBeTruthy();
      expect(screen.queryByText("Photo")).toBeNull();
    });

    it("falls back to the type short-label when an item has no caption", () => {
      renderCard({
        status: "completed",
        capturedEvidence: [{ id: "ev-2", type: "link", caption: null }],
      });
      const chip = screen.getByTestId("focus-current-task-evidence-chip-ev-2");
      expect(chip.props.accessibilityLabel).toBe("Link captured");
      expect(screen.getByText("Link")).toBeTruthy();
    });

    it("treats a blank caption as no caption", () => {
      renderCard({
        status: "completed",
        capturedEvidence: [{ id: "ev-3", type: "text", caption: "   " }],
      });
      expect(screen.getByText("Note")).toBeTruthy();
    });

    it("normalizes an unknown evidence type to the file label (no raw key leaks)", () => {
      renderCard({
        status: "completed",
        capturedEvidence: [{ id: "ev-4", type: "sketch", caption: null }],
      });
      const chip = screen.getByTestId("focus-current-task-evidence-chip-ev-4");
      expect(chip.props.accessibilityLabel).toBe("File captured");
      expect(screen.getByText("File")).toBeTruthy();
      expect(screen.queryByText("sketch")).toBeNull();
    });

    it("renders one chip per item with a unique token when id-less items share a type", () => {
      renderCard({
        status: "completed",
        capturedEvidence: [{ type: "photo" }, { type: "photo" }],
      });
      expect(
        screen.getByTestId("focus-current-task-evidence-chip-photo-0"),
      ).toBeTruthy();
      expect(
        screen.getByTestId("focus-current-task-evidence-chip-photo-1"),
      ).toBeTruthy();
    });

    it("renders nothing when no evidence is captured", () => {
      renderCard({ status: "completed", capturedEvidence: [] });
      expect(screen.queryByText("Captured")).toBeNull();
    });
  });

  // 44pt touch targets + a non-empty label on every interactive element, for
  // each state (the WCAG 2.1 AA contract this app treats as day-one). 44 is the
  // floor, not a fixed size: the prototype CTAs stand 54pt tall (R4), while the
  // quiet set-aside and the planned box hold the 44pt minimum — assert ≥ 44.
  it.each(ALL_STATES)(
    "every button in %s has a label and at least a 44pt target",
    (status) => {
      renderCard({ status, capturedEvidence: captured });
      const buttons = screen.getAllByRole("button");
      expect(buttons.length).toBeGreaterThan(0);
      buttons.forEach((button) => {
        expect(button.props.accessibilityLabel).toBeTruthy();
        const flat = StyleSheet.flatten(button.props.style) as {
          minHeight?: number;
        };
        expect(flat.minHeight).toBeGreaterThanOrEqual(44);
      });
    },
  );
});
