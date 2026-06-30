import React, { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { useTranslation } from "react-i18next";
import { TimelineNode } from "../TimelineNode";
import { stepStateColorMap } from "../TimelineNode/stepStateColorMap";
import { TimelineEvidenceCard } from "../TimelineEvidenceCard";
import type { StepStatus } from "../../types/steps";
import type { EvidenceItemData } from "../EvidenceDrawer";
import { toLetterOrdinal } from "../../utils/format";
import { styles } from "./TimelineStep.styles";

export interface TimelineStepData {
  id: string;
  title: string;
  status: StepStatus;
  evidenceCount: number;
  /**
   * C (dependency), internal: this step comes "after [title]". Never rendered as
   * "blocked by" (ADR-0010/0012). Story-only display prop — no DB field yet; the
   * [Integrate] issue (#378) owns sourcing it from real data.
   */
  afterStep?: string;
  /**
   * C (dependency), external wait: "waiting on [who] · expected [date]".
   * Story-only display prop (#378).
   */
  waitingOn?: { who: string; expected?: string };
  /**
   * B (date): factual "due [date]" — no urgency, no "overdue" framing regardless
   * of whether the date is past (ADR-0012). Story-only display prop (#378).
   */
  dueDate?: string;
}

/**
 * A sub-step rendered on the parent's indented sub-spine (#293). Carries its own
 * status (so the current leaf shows `in-progress`) and its own evidence list.
 */
export interface TimelineStepChild {
  id: string;
  title: string;
  status: StepStatus;
  evidence: EvidenceItemData[];
}

export interface TimelineStepProps {
  step: TimelineStepData;
  stepIndex: number;
  evidence: EvidenceItemData[];
  onNodePress: (stepIndex: number) => void;
  onEvidencePress: (evidenceId: string) => void;
  defaultExpanded?: boolean;
  /** Sub-steps shown as an indented sub-spine under this step. Empty = flat step. */
  subSteps?: TimelineStepChild[];
}

export function TimelineStep({
  step,
  stepIndex,
  evidence,
  onNodePress,
  onEvidencePress,
  defaultExpanded = false,
  subSteps = [],
}: TimelineStepProps) {
  const { t } = useTranslation(["common", "timelineJourney"]);
  const [expanded, setExpanded] = useState(defaultExpanded);
  // E (state) — the one #406 color language: the header state word reads from the
  // same map the node uses (stepStateColorMap), replacing the old StatusBadge.
  const statusLabel = t(stepStateColorMap[step.status].badgeI18nKey);

  return (
    <View style={styles.wrapper}>
      <View style={styles.container} accessibilityRole="none">
        <View style={styles.nodeColumn}>
          <TimelineNode
            status={step.status}
            stepNumber={stepIndex + 1}
            onPress={() => onNodePress(stepIndex)}
            accessibilityLabel={t("timelineJourney:step.a11yGoTo", {
              number: stepIndex + 1,
              title: step.title,
            })}
          />
        </View>
        <View style={styles.contentCard}>
          <Pressable
            onPress={() => setExpanded((prev) => !prev)}
            accessible
            accessibilityRole="button"
            accessibilityLabel={`${step.title}, ${statusLabel}`}
            accessibilityState={{ expanded }}
            style={styles.header}
          >
            <View style={styles.titleContainer}>
              <Text style={styles.title} numberOfLines={2}>
                {step.title}
              </Text>
            </View>
            <StateWord status={step.status} label={statusLabel} />
            <Text
              style={[styles.chevron, expanded && styles.chevronExpanded]}
              accessibilityElementsHidden
            >
              {"\u25BC"}
            </Text>
          </Pressable>
          <MetadataBand
            afterStep={step.afterStep}
            waitingOn={step.waitingOn}
            dueDate={step.dueDate}
          />
          {expanded && (
            <View style={styles.evidenceSection}>
              {evidence.length > 0 ? (
                evidence.map((ev) => (
                  <TimelineEvidenceCard
                    key={ev.id}
                    evidence={ev}
                    onPress={onEvidencePress}
                  />
                ))
              ) : (
                <Text style={styles.noEvidence}>
                  {t("timelineJourney:step.noEvidence")}
                </Text>
              )}
            </View>
          )}
        </View>
      </View>
      {subSteps.length > 0 && (
        <View style={styles.childSpine}>
          {subSteps.map((child, index) => (
            <ChildRow
              key={child.id}
              child={child}
              ordinal={toLetterOrdinal(index)}
              parentIndex={stepIndex}
              onNodePress={onNodePress}
              onEvidencePress={onEvidencePress}
            />
          ))}
        </View>
      )}
    </View>
  );
}

/**
 * One sub-step row on the indented sub-spine: a small lettered node (current
 * leaf highlights via `in-progress`) plus a slim card with its own collapsible
 * evidence drawer. Local component so each child owns its expand state without
 * hooks-in-loop (#293).
 */
function ChildRow({
  child,
  ordinal,
  parentIndex,
  onNodePress,
  onEvidencePress,
}: {
  child: TimelineStepChild;
  ordinal: string;
  parentIndex: number;
  onNodePress: (stepIndex: number) => void;
  onEvidencePress: (evidenceId: string) => void;
}) {
  const { t } = useTranslation(["common", "timelineJourney"]);
  const [expanded, setExpanded] = useState(false);
  // #406 state word (E) replaces StatusBadge here too. Children carry no C/B
  // band (OQ-2); the evidence drawer below is pre-existing #293 behavior — the
  // prototype's E-only (no-drawer) child is a fidelity follow-up owned by #378.
  const statusLabel = t(stepStateColorMap[child.status].badgeI18nKey);

  return (
    <View style={styles.childRow}>
      <TimelineNode
        status={child.status}
        size="sm"
        label={ordinal}
        onPress={() => onNodePress(parentIndex)}
        accessibilityLabel={t("timelineJourney:step.a11yGoTo", {
          number: ordinal,
          title: child.title,
        })}
      />
      <View style={styles.childContentCard}>
        <Pressable
          onPress={() => setExpanded((prev) => !prev)}
          accessible
          accessibilityRole="button"
          accessibilityLabel={t("timelineJourney:step.a11yChildExpand", {
            ordinal,
            title: child.title,
          })}
          accessibilityState={{ expanded }}
          style={styles.childHeader}
        >
          <View style={styles.titleContainer}>
            <Text style={styles.childTitle} numberOfLines={2}>
              {child.title}
            </Text>
          </View>
          <StateWord status={child.status} label={statusLabel} />
          <Text
            style={[styles.chevron, expanded && styles.chevronExpanded]}
            accessibilityElementsHidden
          >
            {"\u25BC"}
          </Text>
        </Pressable>
        {expanded && (
          <View style={styles.evidenceSection}>
            {child.evidence.length > 0 ? (
              child.evidence.map((ev) => (
                <TimelineEvidenceCard
                  key={ev.id}
                  evidence={ev}
                  onPress={onEvidencePress}
                />
              ))
            ) : (
              <Text style={styles.noEvidence}>
                {t("timelineJourney:step.noEvidence")}
              </Text>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

/**
 * E (state) as a compact header pill in the one #406 color language: background
 * from `stepStateNodeBg` and ink from `stepStateNodeFg` — the exact bg+fg pairing
 * the node renders — so the word reads as the same state color as its node in
 * every theme. Replaces the old `StatusBadge`, whose active/completed/locked
 * vocabulary was a second, drifting color language (#406 handoff line 21).
 */
function StateWord({ status, label }: { status: StepStatus; label: string }) {
  return (
    <View style={styles.stateWordPill(status)}>
      <Text style={styles.stateWordText(status)}>{label}</Text>
    </View>
  );
}

/**
 * Quiet C·B truth-lines beneath the step title (E lives in the header word, not
 * here). C = a dependency stated as "after [step]" (internal) or "waiting on
 * [who] · expected [date]" (external wait) — never "blocked by". B = a factual
 * "due [date]" with no urgency/overdue framing (ADR-0010/0012). Lines render in
 * `textSecondary` only; the prototype's amber/green glyph hues are dropped. Copy
 * is literal pending #378, which owns real data + i18n. Renders nothing when no
 * C/B prop is set; never rendered on child rows (OQ-2 — children carry no C/B band).
 */
function MetadataBand({
  afterStep,
  waitingOn,
  dueDate,
}: {
  afterStep?: string;
  waitingOn?: { who: string; expected?: string };
  dueDate?: string;
}) {
  const cLine = waitingOn
    ? `waiting on ${waitingOn.who}${
        waitingOn.expected ? ` · expected ${waitingOn.expected}` : ""
      }`
    : afterStep
      ? `after ${afterStep}`
      : null;
  const bLine = dueDate ? `due ${dueDate}` : null;

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
