import type { FocusCapturedEvidenceItem } from "./FocusCurrentTaskCard.parts";

/**
 * Card-level view state. `all-complete` is a goal-level state (every step done),
 * so it lives here, not in `StepStatus`/`StepStateMapKey` (D2). Only `paused` and
 * `completed` show a state-word pill (via `stepStateColorMap`, the #406 color
 * language); `in-progress` is the "silent" state (position carries it) and
 * `all-complete` has none either.
 */
export type FocusCardStatus =
  | "in-progress"
  | "paused"
  | "completed"
  | "all-complete";

export interface FocusCurrentTaskCardProps {
  // Props are grouped by the view state that reads them; each sub-view
  // destructures only its own group, so a prop set on the "wrong" status is
  // silently ignored rather than mis-rendered.

  // --- universal ---
  status: FocusCardStatus;
  title: string;
  /**
   * Captured-evidence chips for the read-only rail. Rendered in the in-progress
   * and completed views; ignored by paused / all-complete.
   */
  capturedEvidence?: readonly FocusCapturedEvidenceItem[];

  // --- in-progress ---
  /**
   * Planned evidence **type key** (e.g. `"photo"`, `"text"`) — drives both the
   * icon and the label in the planned-evidence box. An unknown value falls back
   * to `file`; null/omitted shows a generic "Evidence" label with no icon.
   */
  plannedEvidenceType?: string | null;
  /** Open the evidence-type chooser (#409) — the whole planned box is the target. */
  onChangeEvidenceType?: () => void;
  /** Capture a new piece of the planned evidence type. */
  onAddEvidence?: () => void;
  /** Set this step aside (in-progress → paused). */
  onPause?: () => void;
  /** Mark complete — revealed only when evidence is captured. */
  onMarkComplete?: () => void;
  /** C (dependency), internal: this step comes "after [step]". Never "blocked by". */
  afterStep?: string;
  /** C (dependency), external wait: "waiting on [who] · expected [date]". */
  waitingOn?: { who: string; expected?: string };
  /** B (date): factual "due [date]" — no urgency / "overdue" framing. */
  dueDate?: string;

  // --- paused ---
  /** Resume a paused step (paused → in-progress). */
  onPickUp?: () => void;

  // --- completed ---
  /** Reopen a completed step. */
  onReopen?: () => void;

  // --- all-complete ---
  /** Design the badge from the all-steps-complete state. */
  onDesignBadge?: () => void;
}
