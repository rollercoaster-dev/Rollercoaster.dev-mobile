import React from "react";
import { View, Text } from "react-native";
import { useTranslation } from "react-i18next";
import { styles } from "./TimelineStep.styles";

/**
 * Quiet C·B truth-lines beneath the step title (E lives in the header word, not
 * here). C = a dependency stated as "after [step]" (internal) or "waiting on
 * [who] · expected [date]" (external wait) — never "blocked by". B = a factual
 * "due [date]" with no urgency/overdue framing (ADR-0010/0012). Lines render in
 * `textSecondary` only; the prototype's amber/green glyph hues are dropped.
 * Renders nothing when no C/B prop is set; never rendered on child rows (OQ-2 —
 * children carry no C/B band).
 *
 * Connective copy is one whole sentence per line under
 * `timelineJourney:step.metadata.*` — never `"after " + title` concatenated in
 * JSX (docs/i18n.md). The waiting-on split into two full keys (`waitingOn` /
 * `waitingOnExpected`) is what lets a translator reorder who-vs-date instead of
 * inheriting the English "… · expected …" tail. The interpolated values arrive
 * final: titles are user content, and dates come pre-formatted for the active
 * locale from the caller (TimelineJourneyScreen's `formatDate(…, i18n.language)`).
 */
export function MetadataBand({
  afterStep,
  waitingOn,
  dueDate,
}: {
  afterStep?: string;
  waitingOn?: { who: string; expected?: string };
  dueDate?: string;
}) {
  const { t } = useTranslation(["timelineJourney"]);

  const cLine = waitingOn
    ? waitingOn.expected
      ? t("timelineJourney:step.metadata.waitingOnExpected", {
          who: waitingOn.who,
          date: waitingOn.expected,
        })
      : t("timelineJourney:step.metadata.waitingOn", { who: waitingOn.who })
    : afterStep
      ? t("timelineJourney:step.metadata.after", { title: afterStep })
      : null;
  const bLine = dueDate
    ? t("timelineJourney:step.metadata.due", { date: dueDate })
    : null;

  if (!cLine && !bLine) {
    return null;
  }

  return (
    <View style={styles.metadataBand}>
      {cLine ? <Text style={styles.metadataText}>{cLine}</Text> : null}
      {bLine ? <Text style={styles.metadataText}>{bLine}</Text> : null}
    </View>
  );
}
