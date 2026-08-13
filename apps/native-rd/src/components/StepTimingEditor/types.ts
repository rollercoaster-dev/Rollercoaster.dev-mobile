import type { View } from "react-native";
import type { RefObject } from "react";
import type { StepDayGridProps, StepDayMark } from "../StepDayGrid";

/** A step (or sub-step) this one may depend on. */
export interface StepTimingCandidate {
  id: string;
  title: string;
  /** Ordinal badge text — "1", "2", "a". Assigned by the list, not derived here. */
  label: string;
  /** True for a sub-step: indents the row, matching the prototype's `.is-child`. */
  isSubStep?: boolean;
  /** Renders the ordinal slot as a check and the title in the completed treatment. */
  isCompleted?: boolean;
  /** This candidate's own day, `YYYY-MM-DD` or null — feeds the ordering note. */
  dueDate: string | null;
  /** This candidate's day, pre-formatted for the active locale (`formatDate`). */
  dueDateLabel?: string;
}

/** The draft values handed back on commit. */
export interface StepTimingValue {
  /** `YYYY-MM-DD` or null. Conversion to a branded `DateIso` is #576's job. */
  dueDate: string | null;
  /** Candidate id, or null for `nothing`. Unvalidated by design. */
  afterStepId: string | null;
}

export interface StepTimingEditorProps {
  /** Current committed timing for this step. */
  value: StepTimingValue;
  /** Required, injected — never read the clock inside (same rule as StepDayGrid). */
  now: Date;
  /**
   * Every step and sub-step in the goal **except this one** — the caller
   * filters. An empty array is a supported state (a goal's first step) and
   * renders the empty copy rather than an empty box.
   */
  candidates: readonly StepTimingCandidate[];
  /**
   * Whether this step is completed. A completed step with no timing renders
   * **no** `＋ when?` — nothing is left to plan on it — but still shows the
   * timing it already has.
   */
  isCompleted?: boolean;
  /**
   * The current dependency's title, pre-resolved by the caller the way
   * `resolveStepDependencyBand` resolves it (unresolvable → null → no line).
   */
  afterStepTitle?: string | null;
  /**
   * Whether that dependency is completed. Defaults to `false`, which keeps the
   * rendered line byte-identical to Focus and Timeline; see the component doc.
   */
  afterStepIsCompleted?: boolean;
  /** `value.dueDate` pre-formatted for the active locale via `formatDate`. */
  dueDateLabel?: string | null;
  /** Days other steps sit on, forwarded to the grid. */
  marks?: readonly StepDayMark[];
  /** BCP-47 tag, forwarded to the grid and used for nothing else. */
  locale?: string;

  /** Fires on `Done` with the draft. Never fires on collapse-without-Done. */
  onCommit: (next: StepTimingValue) => void;
  /** Fires on `Clear` — removes both the date and the dependency. */
  onClear: () => void;

  /**
   * Controlled expansion. Omit for uncontrolled; supply both to enforce
   * "only one editor open at a time" across sibling rows, which a
   * self-contained component cannot do alone.
   */
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  /**
   * Fired when the row expands, with this row's root `View` ref, so the host
   * can `measureLayout` against its ScrollView and park the row at the top of
   * the list. Without it the editor can unfold below the fold and the tap reads
   * as having done nothing — a verified failure in the prototype.
   */
  onExpand?: (rowRef: RefObject<View | null>) => void;

  // --- Copy: caller-supplied with English defaults (the D7 convention). ---
  /** The single unset affordance. */
  whenPromptLabel?: string;
  /** The editor's question. */
  questionLabel?: string;
  /** The ADR-0012 promise for B. */
  intentSubLabel?: string;
  /** Field label above the dependency control. */
  dependsOnLabel?: string;
  /** Placeholder and clear option for the dependency. */
  nothingLabel?: string;
  /** Copy shown when `candidates` is empty. */
  noCandidatesLabel?: string;
  clearLabel?: string;
  doneLabel?: string;
  /** The `after` truth line. Must match Focus/Timeline's wording. */
  afterLineLabel?: (title: string) => string;
  /** The `due` truth line. Must match Focus/Timeline's wording. */
  dueLineLabel?: (date: string) => string;
  /** Opt-in suffix when the dependency is completed. */
  doneSuffixLabel?: string;
  /** The neutral ordering note. */
  orderingNote?: (dependencyTitle: string, dependencyDate: string) => string;
  /** a11y label on the timing line. */
  timingLineA11yLabel?: string;
  /**
   * Copy forwarded verbatim to the embedded `StepDayGrid`. Grouped rather than
   * flattened so the grid's copy surface stays the grid's — adding one there
   * does not mean editing this file too.
   */
  gridCopy?: Pick<
    StepDayGridProps,
    "previousMonthLabel" | "nextMonthLabel" | "legendLabel" | "marksA11ySuffix"
  >;
  testID?: string;
}
