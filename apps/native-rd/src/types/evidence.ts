import { EvidenceType } from "../db";

export type EvidenceTypeValue =
  (typeof EvidenceType)[keyof typeof EvidenceType];

const VALID_EVIDENCE_TYPES = new Set<string>(Object.values(EvidenceType));

/** Validate a string as an EvidenceTypeValue, falling back to 'file' for unknown values. */
export function validateEvidenceType(type: string): EvidenceTypeValue {
  return VALID_EVIDENCE_TYPES.has(type)
    ? (type as EvidenceTypeValue)
    : EvidenceType.file;
}

export const EVIDENCE_OPTIONS: {
  type: EvidenceTypeValue;
  label: string;
  icon: string;
}[] = [
  { type: EvidenceType.photo, label: "Take Photo", icon: "\u{1F4F7}" },
  { type: EvidenceType.video, label: "Record Video", icon: "\u{1F3AC}" },
  {
    type: EvidenceType.voice_memo,
    label: "Record Voice Memo",
    icon: "\u{1F3A4}",
  },
  { type: EvidenceType.text, label: "Write a Note", icon: "\u{1F4DD}" },
  { type: EvidenceType.link, label: "Add Link", icon: "\u{1F517}" },
  { type: EvidenceType.file, label: "Attach File", icon: "\u{1F4CE}" },
];
