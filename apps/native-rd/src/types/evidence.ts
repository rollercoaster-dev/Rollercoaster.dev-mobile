import { EvidenceType } from "../db";

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
