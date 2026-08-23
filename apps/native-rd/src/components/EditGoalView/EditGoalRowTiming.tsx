/**
 * EditGoalRowTiming — the one timing slot on an Edit Goal step or sub-step row,
 * in whichever of its two states applies (#576).
 *
 * Collapsed it is {@link EditGoalTimingLine}: the row's date/dependency
 * truth-lines, or a quiet `＋ when?`, or nothing at all on a finished row.
 * Expanded it is {@link StepTimingEditor}, mounted **in place of** that line
 * rather than below it — the editor renders its own pressable timing line
 * (`StepTimingEditor.tsx`), so keeping both would put two tap targets in one
 * slot. The two stay swappable rather than merged because only the read-only
 * line has a `waiting` case: the editor deliberately never authors "waiting on"
 * (#573), and a row that has one must still display it.
 *
 * Both row shapes share this, so the swap, its mount preconditions and the
 * collapse plumbing exist once.
 *
 * **The editor is controlled, always `expanded`** — it is only mounted for the
 * one row the host says is open. `onExpandedChange(false)` is reported outward
 * as `onCollapseTiming` rather than acted on here: `StepTimingEditor.handleDone`
 * calls `onCommit` and closes in the same synchronous breath, with no way for a
 * caller to veto from inside `onCommit`, so a host whose write just failed has
 * to be the one that decides the row stays open. Which makes `onCollapseTiming`
 * a mount precondition and not an optional nicety: without it the editor is the
 * only thing in the slot and nothing can close it again.
 *
 * **Accessibility focus follows the swap.** The element the user activated is
 * unmounted by the render that answers the tap, so neither side can be left to
 * the platform: opening hands focus to the editor's heading, closing hands it
 * back to the line that replaced it. Both are opt-in flags on the children
 * (`focusOnMount`), because the same components also mount in states no one
 * asked for — the whole list paints its lines on first render, and every row
 * grabbing focus at once would be worse than none.
 *
 * testIDs share the row's timing prefix in both states: collapsed, the prefix
 * *is* the pressable; expanded, it is the editor's root and the pressable
 * becomes `<prefix>-timing-line`, alongside `-editor`, `-done`, `-clear`,
 * `-depends-on-toggle` and `-grid-day-<YYYY-MM-DD>`.
 */
import React, { useState } from "react";
import { StepTimingEditor } from "../StepTimingEditor";
import type { StepTimingValue } from "../StepTimingEditor";
import { EditGoalTimingLine } from "./EditGoalTimingLine";
import type {
  EditGoalDateDepChip,
  EditGoalTiming,
  EditGoalTimingCopy,
  EditGoalTimingHost,
} from "./EditGoalView";

/**
 * One row's slice of a host's timing wiring, id-bound and ready to spread onto
 * `EditGoalStepRow` / `EditGoalSubStepRow`.
 *
 * Lives here rather than in each list layer because both lists did the same
 * three-ternary binding verbatim, differing only in which id they closed over.
 * No host → an empty object, so the row falls back to its read-only line.
 */
export function bindRowTiming(
  host: EditGoalTimingHost | undefined,
  id: string,
) {
  if (!host) return {};
  return {
    isTimingExpanded: host.expandedId === id,
    onCommitTiming: (next: StepTimingValue) => host.onCommit(id, next),
    onClearTiming: () => host.onClear(id),
    onCollapseTiming: () => host.onCollapse(id),
    timingNow: host.now,
    timingLocale: host.locale,
    timingCopy: host.copy,
  };
}

export interface EditGoalRowTimingProps {
  /** Step or sub-step title, named in the collapsed line's a11y labels. */
  title: string;
  /** The row's date/dependency chips. Absent/empty → the unset state. */
  chips?: EditGoalDateDepChip[];
  /** Suppresses the unset prompt only — set timing survives completion. */
  isCompleted?: boolean;
  /** Pre-resolved editor inputs. Absent → this row can only ever read out. */
  timing?: EditGoalTiming;
  /** Whether the host has this row's editor open. */
  isTimingExpanded?: boolean;
  /** Tapping the collapsed line. Omitted → the line renders inert (D7). */
  onEditTiming?: () => void;
  onCommitTiming?: (next: StepTimingValue) => void;
  onClearTiming?: () => void;
  /** How the editor's close request gets out. Required to mount it. */
  onCollapseTiming?: () => void;
  /** The instant the editor judges "today" against. Required to mount it. */
  now?: Date;
  locale?: string;
  copy?: EditGoalTimingCopy;
  /** Shared by both states — see the testID note in the file doc. */
  testID: string;

  // --- Copy shared with the collapsed line (English defaults downstream). ---
  whenPromptLabel?: string;
  editTimingUnsetA11yLabel?: (title: string) => string;
  editTimingSetA11yLabel?: (title: string, lines: string[]) => string;
}

export function EditGoalRowTiming({
  title,
  chips,
  isCompleted,
  timing,
  isTimingExpanded = false,
  onEditTiming,
  onCommitTiming,
  onClearTiming,
  onCollapseTiming,
  now,
  locale,
  copy,
  testID,
  whenPromptLabel,
  editTimingUnsetA11yLabel,
  editTimingSetA11yLabel,
}: EditGoalRowTimingProps) {
  // Has this row's editor ever been opened or closed while mounted? That is the
  // difference between a swap the user asked for — where focus must follow the
  // content — and the state this row simply first painted in. Adjusted during
  // render (React's sanctioned "store info from a previous render" pattern),
  // not in a ref, which a double-render would desynchronise.
  const [seenExpanded, setSeenExpanded] = useState(isTimingExpanded);
  const [hasSwapped, setHasSwapped] = useState(false);
  if (seenExpanded !== isTimingExpanded) {
    setSeenExpanded(isTimingExpanded);
    setHasSwapped(true);
  }

  // Every input the editor cannot work without, checked in one place: a row
  // missing any of them (Storybook, the New Goal wizard) keeps the read-only
  // line rather than mounting a half-wired editor.
  const canEdit =
    isTimingExpanded &&
    timing !== undefined &&
    now !== undefined &&
    onCommitTiming !== undefined &&
    onClearTiming !== undefined &&
    onCollapseTiming !== undefined;

  if (canEdit) {
    return (
      <StepTimingEditor
        value={timing.value}
        now={now}
        candidates={timing.candidates}
        isCompleted={isCompleted}
        afterStepTitle={timing.afterStepTitle}
        afterStepIsCompleted={timing.afterStepIsCompleted}
        dueDateLabel={timing.dueDateLabel}
        marks={timing.marks}
        locale={locale}
        onCommit={onCommitTiming}
        onClear={onClearTiming}
        expanded
        focusOnMount={hasSwapped}
        onExpandedChange={(next) => {
          if (!next) onCollapseTiming();
        }}
        // `onExpand` (park-the-row-at-the-top) is deliberately unwired: it needs
        // a ref threaded through four layers for a scroll nicety the issue does
        // not ask for. Tracked as a follow-up (#576/D12).
        whenPromptLabel={whenPromptLabel}
        {...copy}
        testID={testID}
      />
    );
  }

  return (
    <EditGoalTimingLine
      chips={chips}
      isCompleted={isCompleted}
      title={title}
      onEditTiming={onEditTiming}
      isTimingExpanded={isTimingExpanded}
      focusOnMount={hasSwapped}
      testID={testID}
      whenPromptLabel={whenPromptLabel}
      editTimingUnsetA11yLabel={editTimingUnsetA11yLabel}
      editTimingSetA11yLabel={editTimingSetA11yLabel}
    />
  );
}
