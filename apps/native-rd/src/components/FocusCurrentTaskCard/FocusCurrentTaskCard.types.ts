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

/** Fields every variant carries, regardless of status. */
interface FocusCardBase {
  title: string;
}

/**
 * In-progress: the working state. Plans **N** evidence types and only reveals
 * "Mark complete" once *every* planned type has at least one captured piece —
 * the app-wide multi-evidence completion contract (`StepCard`, #360). Every
 * handler a rendered control fires is **required**: a discriminated union (below)
 * means the compiler rejects an in-progress card that omits, say, `onAddEvidence`,
 * so a `Pressable`'s `onPress` can never resolve to `undefined` (#497).
 */
export interface FocusInProgressCardProps extends FocusCardBase {
  status: "in-progress";
  /**
   * Planned evidence **type keys** (e.g. `["photo", "text"]`). Each drives an
   * icon + short label in the planned-evidence box. Unknown values fall back to
   * `file` for icon/label lookup (matches the captured rail). A plain array, not
   * a non-empty tuple (D3): the "every step needs evidence" invariant is enforced
   * by the completion gate and callers, not by the type.
   */
  plannedEvidenceTypes: readonly string[];
  /**
   * Captured-evidence chips for the read-only rail. Shows what is present, never
   * what is absent (#360).
   */
  capturedEvidence?: readonly FocusCapturedEvidenceItem[];
  /** Open the evidence-plan chooser (#409) — the whole planned box is the target. */
  onChangeEvidencePlan: () => void;
  /**
   * Capture evidence. Pass a `type` to capture that specific planned type (the
   * per-type "Add {type}" invites); call with no argument to open the capture
   * chooser with no type pre-implied (the post-completion "Add more evidence").
   */
  onAddEvidence: (type?: string) => void;
  /** Set this step aside (in-progress → paused). */
  onPause: () => void;
  /** Mark complete — revealed only once every planned type is captured. */
  onMarkComplete: () => void;
  /** C (dependency), internal: this step comes "after [step]". Never "blocked by". */
  afterStep?: string;
  /** C (dependency), external wait: "waiting on [who] · expected [date]". */
  waitingOn?: { who: string; expected?: string };
  /** B (date): factual "due [date]" — no urgency / "overdue" framing. */
  dueDate?: string;
}

/** Paused: pill + "set aside" body + a single "pick back up" CTA. */
export interface FocusPausedCardProps extends FocusCardBase {
  status: "paused";
  /** Resume a paused step (paused → in-progress). */
  onPickUp: () => void;
}

/** Completed: pill + the read-only captured rail + a single "reopen" CTA. */
export interface FocusCompletedCardProps extends FocusCardBase {
  status: "completed";
  /** Captured-evidence chips for the read-only rail. */
  capturedEvidence?: readonly FocusCapturedEvidenceItem[];
  /** Reopen a completed step. */
  onReopen: () => void;
}

/** All steps done (goal-level): trophy callout + a single "design badge" CTA. */
export interface FocusAllCompleteCardProps extends FocusCardBase {
  status: "all-complete";
  /** Design the badge from the all-steps-complete state. */
  onDesignBadge: () => void;
}

/**
 * Props for {@link FocusCurrentTaskCard}: a **discriminated union on `status`**
 * (D2), mirroring `EvidenceTypePickerProps` one folder over. Each variant lists
 * only the props/handlers its own view renders, all required — so a control the
 * matched status renders can never have an `undefined` `onPress`, and a prop set
 * on the wrong status is a compile error rather than being silently ignored (the
 * failure mode of the previous flat all-optional interface).
 */
export type FocusCurrentTaskCardProps =
  | FocusInProgressCardProps
  | FocusPausedCardProps
  | FocusCompletedCardProps
  | FocusAllCompleteCardProps;
