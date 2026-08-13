import React, { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, View } from "react-native";
import { Text } from "../Text";
import { StepDayGrid } from "../StepDayGrid";
import { focusAccessibilityRef } from "../../utils/accessibilityFocus";
import {
  DependencyPicker,
  EditorFooter,
  OrderingNote,
  TruthLines,
} from "./StepTimingEditor.parts";
import { styles } from "./StepTimingEditor.styles";
import type { StepTimingEditorProps, StepTimingValue } from "./types";

const DEFAULT_INTENT_SUB =
  "Your intent, not a deadline. A passed date never reads as “late.”";

const defaultOrderingNote = (title: string, date: string) =>
  `${title} needs to be done first, and it sits on ${date}. ` +
  `This one lands before it — that's allowed, it just won't read in order.`;

/**
 * The in-row editor for a step's **B** (date) and **C** (`depends on`) lines.
 *
 * Authoring happens **inside the row**, with the list still on screen: dating a
 * plan is one pass down the whole list, and every date is decided against the
 * steps around it ("panels the week after the inspection"). A bottom sheet
 * scrimmed the list at exactly the moment that context was needed, so there is
 * no sheet, no `Modal` and no scrim here — and one timing line per row rather
 * than two ghost chips, because sixteen dashed placeholders on a five-step goal
 * contradicts the epic's own rule that setting must not feel required.
 *
 * Presentational: copy is caller-supplied with English defaults, and dates move
 * in and out as plain `YYYY-MM-DD`. Draft edits reach the caller only via
 * `onCommit` / `onClear`; collapsing without `Done` discards them.
 *
 * **`afterStepId` stays unvalidated** — no cycle detection, no same-goal check,
 * no disabled candidates. `updateStep` (`src/db/queries.ts`) writes it through
 * as given, and the read side already degrades a self-reference or a deleted
 * target to unresolved (`resolveStepDependencyBand`). Guards inform; they never
 * refuse.
 *
 * **`waiting on` is deliberately absent.** An external wait is a fact about the
 * world, recorded mid-ride when it starts to bite, on the step the user is
 * actually standing on — not while laying out a plan. `waitingOnLabel` /
 * `waitingOnExpectedAt` authoring belongs in Focus and needs its own issue; do
 * not restore it here.
 *
 * **On the `· done ✓` suffix**: `afterStepIsCompleted` defaults to `false`, and
 * at that default the rendered line is byte-identical to what Focus and
 * Timeline produce for the same step — which is the read-out parity #573 asks
 * for. Neither shipped surface renders a completion suffix today, because
 * `resolveStepDependencyBand` supplies no done-state to back one. Making the
 * suffix canonical is a change to Focus, Timeline and the resolver together.
 *
 * No expand/collapse animation: the animation preference is read from Evolu,
 * which a presentational component must not require. The prototype gates its
 * unfold behind `prefers-reduced-motion` anyway, so un-animated is the
 * accessible default rather than a regression.
 */
export function StepTimingEditor({
  value,
  now,
  candidates,
  isCompleted = false,
  afterStepTitle,
  afterStepIsCompleted = false,
  dueDateLabel,
  marks,
  locale,
  onCommit,
  onClear,
  expanded,
  onExpandedChange,
  onExpand,
  whenPromptLabel = "＋ when?",
  questionLabel = "When do you want this done?",
  intentSubLabel = DEFAULT_INTENT_SUB,
  dependsOnLabel = "Depends on",
  nothingLabel = "nothing",
  noCandidatesLabel = "No other steps in this goal yet.",
  clearLabel = "Clear",
  doneLabel = "Done",
  afterLineLabel = (title) => `after ${title}`,
  dueLineLabel = (date) => `due ${date}`,
  doneSuffixLabel = " · done ✓",
  orderingNote = defaultOrderingNote,
  timingLineA11yLabel = "Timing for this step",
  previousMonthLabel,
  nextMonthLabel,
  legendLabel,
  marksA11ySuffix,
  testID = "step-timing-editor",
}: StepTimingEditorProps) {
  const rowRef = useRef<View | null>(null);
  const timingLineRef = useRef<View | null>(null);
  // The heading block rather than its `Text`: the shared `Text` component does
  // not forward refs, and the block is the right focus target anyway — it reads
  // the question and the intent sub-line as one announcement.
  const questionRef = useRef<View | null>(null);

  const [uncontrolledExpanded, setUncontrolledExpanded] = useState(false);
  const isControlled = expanded !== undefined;
  const isExpanded = isControlled ? expanded : uncontrolledExpanded;

  const [draft, setDraft] = useState<StepTimingValue>(value);
  const [pickerOpen, setPickerOpen] = useState(false);

  const setExpanded = useCallback(
    (next: boolean) => {
      if (!isControlled) setUncontrolledExpanded(next);
      onExpandedChange?.(next);
    },
    [isControlled, onExpandedChange],
  );

  // Reseed the draft from `value` on every open, so a discarded draft never
  // leaks into the next one. Keyed on the transition rather than on the timing
  // line's press handler, because a controlled host can open this row without a
  // tap ever reaching us.
  const [seededFor, setSeededFor] = useState(isExpanded);
  if (isExpanded !== seededFor) {
    setSeededFor(isExpanded);
    if (isExpanded) {
      setDraft(value);
      setPickerOpen(false);
    }
  }

  // Move accessibility focus into the editor on expand and back to the timing
  // line on collapse, so a screen-reader user is never left where the content
  // they just summoned is not.
  const wasExpanded = useRef(isExpanded);
  useEffect(() => {
    if (wasExpanded.current === isExpanded) return;
    wasExpanded.current = isExpanded;
    return focusAccessibilityRef(isExpanded ? questionRef : timingLineRef);
  }, [isExpanded]);

  const handleTimingLinePress = useCallback(() => {
    if (isExpanded) {
      // Collapse discards the draft — `onCommit` is not called.
      setPickerOpen(false);
      setExpanded(false);
      return;
    }
    setExpanded(true);
    // The host parks the row at the top of the list; an editor that unfolds
    // below the fold reads as having done nothing.
    onExpand?.(rowRef);
  }, [isExpanded, onExpand, setExpanded]);

  const handleDone = useCallback(() => {
    onCommit(draft);
    setPickerOpen(false);
    setExpanded(false);
  }, [draft, onCommit, setExpanded]);

  const handleClear = useCallback(() => {
    onClear();
    setPickerOpen(false);
    setExpanded(false);
  }, [onClear, setExpanded]);

  const hasTiming = Boolean(afterStepTitle) || Boolean(dueDateLabel);
  // Nothing is left to plan on a finished step, so it carries no placeholder —
  // only the timing it already has, if any.
  const showTimingLine = hasTiming || !isCompleted;

  const dependency = candidates.find((c) => c.id === draft.afterStepId) ?? null;
  const showOrderingNote = Boolean(
    draft.dueDate && dependency?.dueDate && draft.dueDate < dependency.dueDate,
  );

  return (
    <View ref={rowRef} style={styles.root} testID={testID}>
      {showTimingLine ? (
        <Pressable
          ref={timingLineRef}
          accessibilityRole="button"
          accessibilityLabel={timingLineA11yLabel}
          accessibilityState={{ expanded: isExpanded }}
          testID={`${testID}-timing-line`}
          onPress={handleTimingLinePress}
          style={({ pressed }) => [
            styles.timingLine,
            pressed && styles.timingLinePressed,
          ]}
        >
          {hasTiming ? (
            <TruthLines
              afterStepTitle={afterStepTitle}
              afterStepIsCompleted={afterStepIsCompleted}
              dueDateLabel={dueDateLabel}
              afterLineText={afterLineLabel(afterStepTitle ?? "")}
              dueLineText={dueLineLabel(dueDateLabel ?? "")}
              doneSuffix={doneSuffixLabel}
              testID={testID}
            />
          ) : (
            // One affordance, not two.
            <Text style={styles.whenPrompt}>{whenPromptLabel}</Text>
          )}
        </Pressable>
      ) : null}

      {isExpanded ? (
        <View style={styles.editor} testID={`${testID}-editor`}>
          <View
            ref={questionRef}
            accessible
            accessibilityRole="header"
            testID={`${testID}-question`}
          >
            <Text style={styles.question}>{questionLabel}</Text>
            <Text style={styles.intentSub}>{intentSubLabel}</Text>
          </View>

          <StepDayGrid
            value={draft.dueDate}
            now={now}
            marks={marks}
            locale={locale}
            onChange={(next) =>
              setDraft((current) => ({ ...current, dueDate: next }))
            }
            previousMonthLabel={previousMonthLabel}
            nextMonthLabel={nextMonthLabel}
            legendLabel={legendLabel}
            marksA11ySuffix={marksA11ySuffix}
            testID={`${testID}-grid`}
          />

          <DependencyPicker
            candidates={candidates}
            selectedId={draft.afterStepId}
            isOpen={pickerOpen}
            onToggle={() => setPickerOpen((open) => !open)}
            onPick={(id) => {
              setDraft((current) => ({ ...current, afterStepId: id }));
              setPickerOpen(false);
            }}
            nothingLabel={nothingLabel}
            noCandidatesLabel={noCandidatesLabel}
            dependsOnLabel={dependsOnLabel}
            testID={`${testID}-depends-on`}
          />

          {showOrderingNote && dependency ? (
            <OrderingNote
              text={orderingNote(
                dependency.title,
                dependency.dueDateLabel ?? dependency.dueDate ?? "",
              )}
              testID={`${testID}-ordering-note`}
            />
          ) : null}

          <EditorFooter
            clearLabel={clearLabel}
            doneLabel={doneLabel}
            onClear={handleClear}
            onDone={handleDone}
            testID={testID}
          />
        </View>
      ) : null}
    </View>
  );
}
