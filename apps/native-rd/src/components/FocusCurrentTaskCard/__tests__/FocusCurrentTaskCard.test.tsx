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
    plannedEvidenceType: "Photo",
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
      expect(screen.queryByLabelText("In Progress")).toBeNull();
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
      fireEvent.press(screen.getByLabelText("change"));
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
    it("renders the internal 'after [step]' dependency line", () => {
      renderCard({ status: "in-progress", afterStep: "Stock the pantry" });
      expect(screen.getByText("after Stock the pantry")).toBeTruthy();
    });

    it("renders the external 'waiting on [who]' dependency line", () => {
      renderCard({
        status: "in-progress",
        waitingOn: { who: "the clinic", expected: "Tue" },
      });
      expect(
        screen.getByText("waiting on the clinic · expected Tue"),
      ).toBeTruthy();
    });

    it("renders the due date in mono with no overdue framing", () => {
      renderCard({ status: "in-progress", dueDate: "Fri 11 Jul" });
      const dateNode = screen.getByText("due Fri 11 Jul");
      const flat = StyleSheet.flatten(dateNode.props.style) as {
        fontFamily?: string;
      };
      expect(flat.fontFamily).toBe("DM Mono");
      expect(screen.queryByText(/overdue/i)).toBeNull();
    });
  });

  // 44pt touch targets + a non-empty label on every interactive element, for
  // each state (the WCAG 2.1 AA contract this app treats as day-one).
  it.each(ALL_STATES)(
    "every button in %s has a label and a 44pt target",
    (status) => {
      renderCard({ status, capturedEvidence: captured });
      const buttons = screen.getAllByRole("button");
      expect(buttons.length).toBeGreaterThan(0);
      buttons.forEach((button) => {
        expect(button.props.accessibilityLabel).toBeTruthy();
        const flat = StyleSheet.flatten(button.props.style) as {
          minHeight?: number;
        };
        expect(flat.minHeight).toBe(44);
      });
    },
  );
});
