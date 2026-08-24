import React from "react";
import type { RenderResult } from "@testing-library/react-native";
import { renderWithProviders } from "./test-utils";
import { formatDate } from "../utils/format";
import { i18n } from "../i18n";
import type { GoalId, GroupedStep, StepDependencyBand, StepId } from "../db";
import { resolveStepDependencyBand } from "../db";
import { buildEditGoalSteps } from "../screens/EditModeScreen/editGoalSteps";
import { TimelineStep } from "../components/TimelineStep";
import { FocusCurrentTaskCard } from "../components/FocusCurrentTaskCard";
import { EditGoalTimingLine } from "../components/EditGoalView/EditGoalTimingLine";
import type { EditGoalDateDepChip } from "../components/EditGoalView";

const NOW = new Date(2026, 5, 24);
const DUE_ISO = "2026-06-30";
const DUE_LABEL = formatDate(DUE_ISO, "en-US");
const AFTER_TITLE = "Inspection & labels";

/**
 * #577's close-out of the C·B read-out parity #573 started: widened from "the
 * in-row editor agrees with Timeline on two shapes" to "**all three read
 * surfaces** agree on **all six** B/C timing shapes".
 *
 * The three surfaces are Timeline's step node, Focus's current-task card, and
 * the Edit Goal row's timing line — the three callers of
 * `resolveStepDependencyBand`. Every shape below is **one pair of step rows**,
 * resolved and read out three ways, so nothing here can agree with a
 * hand-copied string instead of with the other surfaces. The epic's framing:
 * a mismatch is an input bug, not a read bug.
 *
 * Timeline and Focus share a single resolver call; the Edit Goal side goes
 * through the real `buildEditGoalSteps`, which resolves the same rows again on
 * its own. That second call is the point, not an oversight — that function owns
 * the chip's precedence rule (waiting outranks after, due is independent), and
 * running it for real is what compares that rule against `MetadataBand`'s
 * C-line precedence instead of restating it. Reaching a screen module is also
 * why this lives here rather than beside its sibling in
 * `components/StepTimingEditor/__tests__/readOutParity.test.tsx`: a test under
 * `src/components/` may not import from `src/screens/`, and a comparison whose
 * whole point is spanning three surfaces belongs above any one of them.
 *
 * Focus splits a wait across two `Text` nodes (lead + `· expected …` suffix)
 * where Timeline and the chip use one sentence, which is why each surface is
 * normalized to its lines joined by a space rather than compared node-for-node.
 */

const WAITING_WHO = "city inspector";
const FUTURE_ISO = "2026-07-10";
const PAST_ISO = "2026-06-20";
const LOCALE = "en-US";
const SUBJECT_TITLE = "Mount the panels";

/** The band fields each surface formats for itself. */
interface BandProps {
  afterStep?: string;
  waitingOn?: { who: string; expected?: string; isPast?: boolean };
  dueDate?: string;
}

/**
 * Band → surface props, exactly as `TimelineJourneyScreen` and
 * `FocusModeScreen` each do it (their two mappings are identical line for
 * line). Both surfaces take the same props, so one mapping feeds both.
 */
function toBandProps(band: StepDependencyBand): BandProps {
  return {
    afterStep: band.afterStepTitle ?? undefined,
    waitingOn: band.waitingOnLabel
      ? {
          who: band.waitingOnLabel,
          expected: band.waitingOnExpectedAt
            ? formatDate(band.waitingOnExpectedAt, LOCALE)
            : undefined,
          isPast: band.waitingOnExpectedIsPast,
        }
      : undefined,
    dueDate: band.dueAt ? formatDate(band.dueAt, LOCALE) : undefined,
  };
}

/** Every string a rendered tree holds, in render order. */
function collectStrings(node: unknown): string[] {
  if (typeof node === "string") return [node];
  if (Array.isArray(node)) return node.flatMap(collectStrings);
  if (node && typeof node === "object" && "children" in node) {
    return collectStrings((node as { children: unknown }).children);
  }
  return [];
}

/**
 * What a surface says about timing: everything it renders with the band set,
 * minus everything the same surface renders with nothing set.
 *
 * A difference rather than a testID lookup because only one of the three
 * surfaces marks its band lines up at all, and because it makes the
 * none/cleared shape self-checking — "renders no timing" is the empty
 * difference, not an absence assertion aimed at copy that has to be named.
 */
function bandTextOf<T>(
  render: (input: T) => RenderResult,
  input: T,
  baselineInput: T,
) {
  const baseline = render(baselineInput);
  const unchanged = collectStrings(baseline.toJSON());
  baseline.unmount();

  const withBand = render(input);
  const all = collectStrings(withBand.toJSON());
  withBand.unmount();

  const remaining = [...unchanged];
  return all
    .filter((line) => {
      const at = remaining.indexOf(line);
      if (at === -1) return true;
      remaining.splice(at, 1);
      return false;
    })
    .join(" ")
    .trim();
}

function renderTimeline(band: BandProps) {
  return renderWithProviders(
    <TimelineStep
      step={{
        id: "s2",
        title: SUBJECT_TITLE,
        status: "pending",
        evidenceCount: 0,
        ...band,
      }}
      stepIndex={1}
      evidence={[]}
      onNodePress={jest.fn()}
      onEvidencePress={jest.fn()}
    />,
  );
}

function renderFocus(band: BandProps) {
  return renderWithProviders(
    <FocusCurrentTaskCard
      status="in-progress"
      title={SUBJECT_TITLE}
      plannedEvidenceTypes={["text"]}
      onChangeEvidencePlan={jest.fn()}
      onAddEvidence={jest.fn()}
      onPause={jest.fn()}
      onMarkComplete={jest.fn()}
      {...band}
    />,
  );
}

function renderChip(chips: EditGoalDateDepChip[] | undefined) {
  return renderWithProviders(
    <EditGoalTimingLine
      chips={chips}
      title={SUBJECT_TITLE}
      testID="edit-goal-step-timing-s2"
      onEditTiming={jest.fn()}
    />,
  );
}

/** The flat step-row shape `groupStepsByParent` (and so the resolver) reads. */
function stepRow(
  id: string,
  title: string,
  overrides: Partial<Omit<GroupedStep, "children">> = {},
): Omit<GroupedStep, "children"> {
  return {
    id: id as StepId,
    goalId: "goal-1" as GoalId,
    parentStepId: null,
    title,
    ordinal: 0,
    status: "pending",
    completedAt: null,
    plannedEvidenceTypes: null,
    afterStepId: null,
    waitingOnLabel: null,
    waitingOnExpectedAt: null,
    dueAt: null,
    ...overrides,
  };
}

const PREREQUISITE = stepRow("s1", AFTER_TITLE);

/**
 * The six shapes the epic names. `parts` are the *fixture's own* values — a
 * title, a person, a formatted date — never the connective copy around them,
 * so a reword changes no expectation here while a value that stops reaching a
 * surface still fails.
 */
const SHAPES: readonly {
  name: string;
  subject: Omit<GroupedStep, "children">;
  parts: string[];
}[] = [
  {
    name: "after",
    subject: stepRow("s2", SUBJECT_TITLE, { afterStepId: "s1" as StepId }),
    parts: [AFTER_TITLE],
  },
  {
    name: "waiting on, expected date still ahead",
    subject: stepRow("s2", SUBJECT_TITLE, {
      waitingOnLabel: WAITING_WHO,
      waitingOnExpectedAt: FUTURE_ISO,
    }),
    parts: [WAITING_WHO, formatDate(FUTURE_ISO, LOCALE)],
  },
  {
    name: "waiting on, expected date gone by",
    subject: stepRow("s2", SUBJECT_TITLE, {
      waitingOnLabel: WAITING_WHO,
      waitingOnExpectedAt: PAST_ISO,
    }),
    parts: [WAITING_WHO, formatDate(PAST_ISO, LOCALE)],
  },
  {
    name: "due",
    subject: stepRow("s2", SUBJECT_TITLE, { dueAt: DUE_ISO }),
    parts: [DUE_LABEL],
  },
  {
    name: "waiting on and due together",
    subject: stepRow("s2", SUBJECT_TITLE, {
      waitingOnLabel: WAITING_WHO,
      waitingOnExpectedAt: FUTURE_ISO,
      dueAt: DUE_ISO,
    }),
    parts: [WAITING_WHO, formatDate(FUTURE_ISO, LOCALE), DUE_LABEL],
  },
  {
    name: "nothing set",
    subject: stepRow("s2", SUBJECT_TITLE),
    parts: [],
  },
];

/** All three surfaces' read-out of one shape, from one resolver call. */
function readOut(subject: Omit<GroupedStep, "children">) {
  const rows = [PREREQUISITE, subject];
  const band = toBandProps(resolveStepDependencyBand(subject, rows, NOW));
  const chips = buildEditGoalSteps(
    rows,
    i18n.getFixedT(null, ["editGoal", "common"]),
    LOCALE,
    NOW,
  ).find((step) => step.id === subject.id)?.dateDepChips;

  return {
    timeline: bandTextOf(renderTimeline, band, {}),
    focus: bandTextOf(renderFocus, band, {}),
    chip: bandTextOf(renderChip, chips, undefined),
  };
}

describe("read-out parity across Timeline, Focus and the Edit Goal row", () => {
  test.each(SHAPES)("$name reads identically on all three", ({ subject }) => {
    const { timeline, focus, chip } = readOut(subject);

    expect(focus).toBe(timeline);
    expect(chip).toBe(timeline);
  });

  test.each(SHAPES)("$name carries its own values", ({ subject, parts }) => {
    const { timeline } = readOut(subject);

    if (parts.length === 0) {
      expect(timeline).toBe("");
      return;
    }
    for (const part of parts) {
      expect(timeline).toContain(part);
    }
  });

  /**
   * The one difference between the two `waiting` shapes is the tense (#571),
   * and it arrives as a *fact* on the band rather than as anything the fixtures
   * spell out — so if `waitingOnExpectedIsPast` stopped reaching a surface, the
   * two shapes would read the same sentence with a different date.
   */
  it("reads a passed expected date differently from one still ahead", () => {
    const future = readOut(SHAPES[1].subject);
    const past = readOut(SHAPES[2].subject);

    const strip = (text: string, date: string) => text.replace(date, "");
    expect(strip(past.timeline, formatDate(PAST_ISO, LOCALE))).not.toBe(
      strip(future.timeline, formatDate(FUTURE_ISO, LOCALE)),
    );
    expect(strip(past.focus, formatDate(PAST_ISO, LOCALE))).not.toBe(
      strip(future.focus, formatDate(FUTURE_ISO, LOCALE)),
    );
    expect(strip(past.chip, formatDate(PAST_ISO, LOCALE))).not.toBe(
      strip(future.chip, formatDate(FUTURE_ISO, LOCALE)),
    );
  });
});
