// Imported from `../db/schema` rather than the `../db` barrel on purpose:
// `src/db/queries.ts` imports `validateEvidenceType` at runtime, and the barrel
// re-exports `queries.ts`, so going through it would close a runtime cycle.
// `schema.ts` is a leaf module, so this edge is safe.
import { EvidenceType } from "../db/schema";

export type EvidenceTypeValue =
  (typeof EvidenceType)[keyof typeof EvidenceType];

/**
 * Evidence types reachable through quick-action buttons on a blocked
 * step card. Includes `text` — tapping its button navigates to the
 * `CaptureTextNote` screen for full-screen note capture.
 */
export type QuickEvidenceType = EvidenceTypeValue;

const VALID_EVIDENCE_TYPES = new Set<string>(Object.values(EvidenceType));

/** Validate a string as an EvidenceTypeValue, falling back to 'file' for unknown values. */
export function validateEvidenceType(type: string): EvidenceTypeValue {
  return VALID_EVIDENCE_TYPES.has(type)
    ? (type as EvidenceTypeValue)
    : EvidenceType.file;
}

/**
 * The strict evidence tier, on already-normalized keys: the plan is satisfied
 * only when it asks for something *and* every type it asks for has been
 * captured.
 *
 * This is the predicate the completion UI gates on, one level below the two
 * callers that own a data shape:
 * `db/evidenceGate`'s `isStepEvidenceComplete` (a step's JSON column) and
 * `FocusCurrentTaskCard` (props already normalized by `FocusModeScreen`).
 * Both sides arrive here through `validateEvidenceType`, so an unknown stored
 * key ("sketch") compares as `file` on the plan and the capture alike.
 *
 * The empty-plan guard is load-bearing: `[].every(...)` is `true`, so without
 * it a step with no planned types would read as complete with zero evidence —
 * violating "every step needs evidence" (#360/#408).
 *
 * Contrast `db/queries`'s `canCompleteStep`, the data-layer floor ("at least
 * one planned type captured"). A step can pass that floor and still fail this
 * tier.
 */
export function isEvidencePlanSatisfied(
  plannedTypes: readonly EvidenceTypeValue[],
  capturedTypes: readonly EvidenceTypeValue[],
): boolean {
  return (
    plannedTypes.length > 0 &&
    plannedTypes.every((type) => capturedTypes.includes(type))
  );
}

/**
 * One captured evidence artifact as the timeline surfaces render it.
 * Lived in `components/EvidenceDrawer` until that component was deleted;
 * the timeline family (TimelineStep, TimelineEvidenceCard, FinishLine)
 * are its consumers now.
 */
export interface EvidenceItemData {
  readonly id: string;
  readonly type: EvidenceTypeValue;
  readonly label: string;
}

export interface EvidenceOption {
  readonly type: EvidenceTypeValue;
  readonly icon: string;
}

export const EVIDENCE_OPTIONS: readonly EvidenceOption[] = [
  { type: EvidenceType.photo, icon: "\u{1F4F7}" },
  { type: EvidenceType.video, icon: "\u{1F3AC}" },
  { type: EvidenceType.voice_memo, icon: "\u{1F3A4}" },
  { type: EvidenceType.text, icon: "\u{1F4DD}" },
  { type: EvidenceType.link, icon: "\u{1F517}" },
  { type: EvidenceType.file, icon: "\u{1F4CE}" },
];

export type EvidenceCaptureOption = EvidenceOption;

export const EVIDENCE_CAPTURE_OPTIONS: readonly EvidenceCaptureOption[] =
  EVIDENCE_OPTIONS;
