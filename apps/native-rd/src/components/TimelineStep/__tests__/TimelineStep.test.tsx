import React from "react";
import {
  renderWithProviders,
  screen,
  fireEvent,
  within,
} from "../../../__tests__/test-utils";
import { i18n } from "../../../i18n";
import { TimelineStep } from "../TimelineStep";
import type { TimelineStepChild } from "../TimelineStep";
import type { EvidenceItemData } from "../../EvidenceDrawer";

const baseStep = {
  id: "step-1",
  title: "Read the docs",
  status: "in-progress" as const,
  evidenceCount: 2,
};

const evidence: EvidenceItemData[] = [
  { id: "ev-1", type: "photo", label: "Progress photo" },
  { id: "ev-2", type: "link", label: "Useful article" },
];

const baseProps = {
  step: baseStep,
  stepIndex: 0,
  evidence,
  onNodePress: jest.fn(),
  onEvidencePress: jest.fn(),
};

describe("TimelineStep", () => {
  beforeEach(() => jest.clearAllMocks());

  it("renders step title and state word", () => {
    renderWithProviders(<TimelineStep {...baseProps} />);
    expect(screen.getByText("Read the docs")).toBeOnTheScreen();
    expect(screen.getByText("Working")).toBeOnTheScreen();
  });

  it.each([
    { status: "completed" as const, label: "Done" },
    { status: "in-progress" as const, label: "Working" },
    { status: "pending" as const, label: "Up next" },
    { status: "paused" as const, label: "Set aside" },
  ])('shows "$label" for $status status', ({ status, label }) => {
    renderWithProviders(
      <TimelineStep {...baseProps} step={{ ...baseStep, status }} />,
    );
    expect(screen.getByText(label)).toBeOnTheScreen();
  });

  it("evidence section is collapsed by default", () => {
    renderWithProviders(<TimelineStep {...baseProps} />);
    expect(screen.queryByText("Progress photo")).not.toBeOnTheScreen();
  });

  it("expands evidence on header tap", () => {
    renderWithProviders(<TimelineStep {...baseProps} />);
    fireEvent.press(screen.getByLabelText("Read the docs, Working"));
    expect(screen.getByText("Progress photo")).toBeOnTheScreen();
    expect(screen.getByText("Useful article")).toBeOnTheScreen();
  });

  it("collapses evidence on second header tap", () => {
    renderWithProviders(<TimelineStep {...baseProps} />);
    const header = screen.getByLabelText("Read the docs, Working");
    fireEvent.press(header);
    expect(screen.getByText("Progress photo")).toBeOnTheScreen();
    fireEvent.press(header);
    expect(screen.queryByText("Progress photo")).not.toBeOnTheScreen();
  });

  it('shows "No evidence yet" when empty', () => {
    renderWithProviders(<TimelineStep {...baseProps} evidence={[]} />);
    fireEvent.press(screen.getByLabelText("Read the docs, Working"));
    expect(screen.getByText("No evidence yet")).toBeOnTheScreen();
  });

  it("calls onNodePress when node is tapped", () => {
    const onNodePress = jest.fn();
    renderWithProviders(
      <TimelineStep {...baseProps} stepIndex={2} onNodePress={onNodePress} />,
    );
    fireEvent.press(screen.getByLabelText("Go to step 3: Read the docs"));
    expect(onNodePress).toHaveBeenCalledWith(2);
  });

  it("calls onEvidencePress with evidence id when an evidence card is tapped", () => {
    const onEvidencePress = jest.fn();
    renderWithProviders(
      <TimelineStep {...baseProps} onEvidencePress={onEvidencePress} />,
    );
    fireEvent.press(screen.getByLabelText("Read the docs, Working"));
    fireEvent.press(screen.getByLabelText("photo evidence: Progress photo"));
    expect(onEvidencePress).toHaveBeenCalledWith("ev-1");
    expect(onEvidencePress).toHaveBeenCalledTimes(1);
  });

  describe("metadata band + state word", () => {
    // E — the header word reads from stepStateColorMap, and since #453 it reads
    // the map's `stateWordI18nKey` (timelineJourney:step.stateWord.*, the
    // prototype vocabulary) rather than its `badgeI18nKey`
    // (common:stepCard.status.*, which StepCard and the Focus surfaces still
    // speak). Asserting the shared field's word is *absent* is the point: it is
    // what makes a silent repoint of `badgeI18nKey` — the change that would drag
    // StepCard's words back onto the timeline — fail here.
    it.each([
      { status: "completed" as const, word: "Done", sharedWord: "Completed" },
      {
        status: "in-progress" as const,
        word: "Working",
        sharedWord: "In Progress",
      },
      { status: "pending" as const, word: "Up next", sharedWord: "Pending" },
      { status: "paused" as const, word: "Set aside", sharedWord: "Paused" },
    ])(
      "renders the #453 state word ($word), not the shared StepCard word ($sharedWord)",
      ({ status, word, sharedWord }) => {
        renderWithProviders(
          <TimelineStep {...baseProps} step={{ ...baseStep, status }} />,
        );
        expect(screen.getByText(word)).toBeOnTheScreen();
        expect(screen.queryByText(sharedWord)).toBeNull();
      },
    );

    // #406's original guard, still live: the word must not come from the legacy
    // StatusBadge group either (timelineJourney:step.status.* — "Done" / "Active"
    // / "Pending"). `completed` can no longer demonstrate this — #453's word for
    // it is also "Done" — so the two states whose vocabularies still differ
    // carry the assertion.
    it.each([
      { status: "in-progress" as const, legacyWord: "Active" },
      { status: "pending" as const, legacyWord: "Pending" },
    ])(
      "does not render the legacy StatusBadge word ($legacyWord) for $status",
      ({ status, legacyWord }) => {
        renderWithProviders(
          <TimelineStep {...baseProps} step={{ ...baseStep, status }} />,
        );
        expect(screen.queryByText(legacyWord)).toBeNull();
      },
    );

    it("renders the C 'after' line when afterStep is set, never 'blocked by'", () => {
      renderWithProviders(
        <TimelineStep
          {...baseProps}
          step={{ ...baseStep, afterStep: "Gather materials" }}
        />,
      );
      expect(screen.getByText("after Gather materials")).toBeOnTheScreen();
      expect(screen.queryByText(/blocked by/i)).toBeNull();
    });

    it("renders the C 'waiting on' line with the expected date, never 'blocked by'", () => {
      renderWithProviders(
        <TimelineStep
          {...baseProps}
          step={{
            ...baseStep,
            waitingOn: { who: "city inspector", expected: "Jun 24" },
          }}
        />,
      );
      expect(
        screen.getByText("waiting on city inspector · expected Jun 24"),
      ).toBeOnTheScreen();
      expect(screen.queryByText(/blocked by/i)).toBeNull();
    });

    it("omits the C line when no dependency prop is set", () => {
      renderWithProviders(
        <TimelineStep
          {...baseProps}
          step={{ ...baseStep, dueDate: "2026-07-15" }}
        />,
      );
      expect(screen.queryByText(/^waiting on/)).toBeNull();
      expect(screen.queryByText(/^after /)).toBeNull();
    });

    it("renders the B 'due' line when dueDate is set, never 'overdue'", () => {
      renderWithProviders(
        <TimelineStep
          {...baseProps}
          step={{ ...baseStep, dueDate: "2026-07-15" }}
        />,
      );
      expect(screen.getByText("due 2026-07-15")).toBeOnTheScreen();
      expect(screen.queryByText(/overdue/i)).toBeNull();
    });

    it("omits the B line when dueDate is absent", () => {
      renderWithProviders(
        <TimelineStep
          {...baseProps}
          step={{ ...baseStep, afterStep: "Gather materials" }}
        />,
      );
      expect(screen.queryByText(/^due /)).toBeNull();
    });

    it("renders the band always-visible, without expanding the step", () => {
      renderWithProviders(
        <TimelineStep
          {...baseProps}
          step={{
            ...baseStep,
            afterStep: "Gather materials",
            dueDate: "2026-07-15",
          }}
        />,
      );
      // The evidence drawer stays collapsed by default…
      expect(screen.queryByText("Progress photo")).toBeNull();
      // …yet both band lines are present without any tap.
      expect(screen.getByText("after Gather materials")).toBeOnTheScreen();
      expect(screen.getByText("due 2026-07-15")).toBeOnTheScreen();
    });

    it("renders child rows with no C/B band (OQ-2)", () => {
      const children: TimelineStepChild[] = [
        {
          id: "c1",
          title: "First child",
          status: "completed",
          evidence: [{ id: "ce1", type: "link", label: "Child link" }],
        },
        { id: "c2", title: "Second child", status: "pending", evidence: [] },
      ];
      renderWithProviders(<TimelineStep {...baseProps} subSteps={children} />);
      // TimelineStepChild carries no afterStep/waitingOn/dueDate, and ChildRow
      // never renders the MetadataBand — so no band text appears on a child row,
      // even on a child that has evidence. (Children keep their pre-existing
      // #293 evidence drawer; its collapse/expand behavior is covered by the
      // "sub-spine (children)" block below.)
      expect(screen.queryByText(/^after /)).toBeNull();
      expect(screen.queryByText(/^waiting on/)).toBeNull();
      expect(screen.queryByText(/^due /)).toBeNull();
    });

    // The band's connective copy ("after …", "waiting on … · expected …",
    // "due …") used to be literal English wrapped around localized dates, so a
    // German user would have read English fragments the moment the DB columns
    // were populated. Pseudo is the regression net: an un-localized fragment
    // shows as plain English next to bracketed copy.
    describe("pseudo locale", () => {
      afterEach(async () => {
        if (i18n.language !== "en") await i18n.changeLanguage("en");
      });

      it.each([
        {
          line: "after",
          step: { afterStep: "Gather materials" },
          key: "timelineJourney:step.metadata.after",
          values: { title: "Gather materials" },
        },
        {
          line: "waitingOn",
          step: { waitingOn: { who: "city inspector" } },
          key: "timelineJourney:step.metadata.waitingOn",
          values: { who: "city inspector" },
        },
        {
          line: "waitingOnExpected",
          step: { waitingOn: { who: "city inspector", expected: "Jun 24" } },
          key: "timelineJourney:step.metadata.waitingOnExpected",
          values: { who: "city inspector", date: "Jun 24" },
        },
        {
          line: "due",
          step: { dueDate: "2026-07-15" },
          key: "timelineJourney:step.metadata.due",
          values: { date: "2026-07-15" },
        },
      ] as const)(
        "renders the $line line as bracketed copy under pseudo locale",
        async ({ step, key, values }) => {
          await i18n.changeLanguage("pseudo");
          renderWithProviders(
            <TimelineStep {...baseProps} step={{ ...baseStep, ...step }} />,
          );
          const pseudo = i18n.t(key, values);
          expect(pseudo.startsWith("[")).toBe(true);
          expect(screen.getByText(pseudo)).toBeOnTheScreen();
        },
      );
    });
  });

  describe("sub-spine (children)", () => {
    const subSteps: TimelineStepChild[] = [
      {
        id: "c1",
        title: "First child",
        status: "completed",
        evidence: [{ id: "ce1", type: "link", label: "Child link" }],
      },
      {
        id: "c2",
        title: "Second child",
        status: "in-progress",
        evidence: [],
      },
      {
        id: "c3",
        title: "Third child",
        status: "pending",
        evidence: [{ id: "ce3", type: "photo", label: "Child photo" }],
      },
    ];

    const pendingSubSteps: TimelineStepChild[] = [
      { id: "p1", title: "Sub one", status: "pending", evidence: [] },
      { id: "p2", title: "Sub two", status: "pending", evidence: [] },
      { id: "p3", title: "Sub three", status: "pending", evidence: [] },
    ];

    it("renders no sub-spine when subSteps is absent", () => {
      renderWithProviders(<TimelineStep {...baseProps} />);
      expect(screen.queryByLabelText(/^Sub-step/)).toBeNull();
    });

    it("renders the parent and every sub-step title", () => {
      renderWithProviders(<TimelineStep {...baseProps} subSteps={subSteps} />);
      expect(screen.getByText("Read the docs")).toBeOnTheScreen();
      expect(screen.getByText("First child")).toBeOnTheScreen();
      expect(screen.getByText("Second child")).toBeOnTheScreen();
      expect(screen.getByText("Third child")).toBeOnTheScreen();
    });

    it("labels sub-step nodes with letter ordinals a, b, c", () => {
      renderWithProviders(
        <TimelineStep {...baseProps} subSteps={pendingSubSteps} />,
      );
      expect(screen.getByText("a")).toBeOnTheScreen();
      expect(screen.getByText("b")).toBeOnTheScreen();
      expect(screen.getByText("c")).toBeOnTheScreen();
    });

    // Child rows read the same #453 state words as their parent — the two pill
    // call sites are separate `t()` calls, so each needs its own coverage.
    it.each([
      { status: "completed" as const, glyph: "✓", badge: "Done" },
      { status: "in-progress" as const, glyph: "a", badge: "Working" },
      { status: "pending" as const, glyph: "a", badge: "Up next" },
      { status: "paused" as const, glyph: "⏸", badge: "Set aside" },
    ])(
      "renders a $status sub-step with the right node glyph and state word",
      ({ status, glyph, badge }) => {
        renderWithProviders(
          <TimelineStep
            {...baseProps}
            subSteps={[
              { id: "only", title: "Only child", status, evidence: [] },
            ]}
          />,
        );
        const node = screen.getByLabelText("Go to step a: Only child");
        expect(within(node).getByText(glyph)).toBeOnTheScreen();
        const card = screen.getByLabelText("Sub-step a: Only child");
        expect(within(card).getByText(badge)).toBeOnTheScreen();
      },
    );

    it("expands a sub-step's evidence independently of the parent", () => {
      renderWithProviders(<TimelineStep {...baseProps} subSteps={subSteps} />);
      fireEvent.press(screen.getByLabelText("Sub-step c: Third child"));
      expect(screen.getByText("Child photo")).toBeOnTheScreen();
      // Parent evidence stays collapsed — each drawer owns its own state.
      expect(screen.queryByText("Progress photo")).toBeNull();
    });

    it("expanding one sub-step leaves its siblings collapsed", () => {
      renderWithProviders(<TimelineStep {...baseProps} subSteps={subSteps} />);
      fireEvent.press(screen.getByLabelText("Sub-step c: Third child"));
      expect(screen.getByText("Child photo")).toBeOnTheScreen();
      // Sibling "First child" (c1) has its own evidence ("Child link") and must
      // stay collapsed — pins the per-child useState in ChildRow.
      expect(screen.queryByText("Child link")).toBeNull();
    });

    it("shows the empty-evidence message for a sub-step with no evidence", () => {
      renderWithProviders(<TimelineStep {...baseProps} subSteps={subSteps} />);
      fireEvent.press(screen.getByLabelText("Sub-step b: Second child"));
      expect(screen.getByText("No evidence yet")).toBeOnTheScreen();
    });

    it("calls onNodePress with the parent index when a sub-step node is tapped", () => {
      const onNodePress = jest.fn();
      renderWithProviders(
        <TimelineStep
          {...baseProps}
          stepIndex={2}
          subSteps={pendingSubSteps}
          onNodePress={onNodePress}
        />,
      );
      fireEvent.press(screen.getByLabelText("Go to step b: Sub two"));
      expect(onNodePress).toHaveBeenCalledWith(2);
    });
  });
});
