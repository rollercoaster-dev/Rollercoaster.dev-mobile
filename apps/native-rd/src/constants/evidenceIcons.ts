import type { EvidenceTypeValue } from "../types/evidence";

/** Map evidence types to display emoji icons. Shared across all evidence UIs. */
export const EVIDENCE_TYPE_ICONS: Record<EvidenceTypeValue, string> = {
  photo: "\u{1F4F7}",
  screenshot: "\u{1F4F8}",
  video: "\u{1F3AC}",
  text: "\u{1F4DD}",
  voice_memo: "\u{1F3A4}",
  link: "\u{1F517}",
  file: "\u{1F4CE}",
};
