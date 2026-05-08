import type { EvidenceTypeValue } from "../types/evidence";

/** Map evidence types to display emoji icons. Shared across all evidence UIs. */
export const EVIDENCE_TYPE_ICONS: Record<EvidenceTypeValue, string> = {
  photo: "\u{1F4F7}",
  video: "\u{1F3AC}",
  text: "\u{1F4DD}",
  voice_memo: "\u{1F3A4}",
  link: "\u{1F517}",
  file: "\u{1F4CE}",
};

/**
 * Human-readable labels for screen readers. Raw type ids like `voice_memo`
 * are announced literally by TTS — give them a friendly name instead.
 */
export const EVIDENCE_TYPE_LABELS: Record<EvidenceTypeValue, string> = {
  photo: "photo",
  video: "video",
  text: "text",
  voice_memo: "voice memo",
  link: "link",
  file: "file",
};
