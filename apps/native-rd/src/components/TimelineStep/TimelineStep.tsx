import React, { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { useTranslation } from "react-i18next";
import { TimelineNode } from "../TimelineNode";
import { stepStateColorMap } from "../TimelineNode/stepStateColorMap";
import { TimelineEvidenceCard } from "../TimelineEvidenceCard";
import type { StepStatus } from "../../types/steps";
import type { EvidenceItemData } from "../../types/evidence";
import { toLetterOrdinal } from "../../utils/format";
import { MetadataBand } from "./TimelineStep.parts";
import { styles } from "./TimelineStep.styles";

export interface TimelineStepData {
  id: string;
  title: string;
  status: StepStatus;
  evidenceCount: number;
  /**
   * C (dependency), internal: this step comes "after [title]". Never rendered as
   * "blocked by" (ADR-0010/0012). Carries the prerequisite's raw title — the
   * connective copy around it is localized in {@link MetadataBand}.
   */
  afterStep?: string;
  /**
   * C (dependency), external wait: "waiting on [who] · expected [date]".
   * `expected` is a display date the caller has already formatted for the active
   * locale; the band only wraps it in localized copy.
   */
  waitingOn?: { who: string; expected?: string };
  /**
   * B (date): factual "due [date]" — no urgency, no "overdue" framing regardless
   * of whether the date is past (ADR-0012). Caller-formatted display date, as
   * with `waitingOn.expected`.
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
  /**
   * Go to the tapped node's step. Receives the tapped step's **own** id — a
   * sub-step node reports the sub-step, never its parent (#467 D3), so the
   * Focus Mode return leg lands on exactly what was tapped.
   */
  onNodePress: (stepId: string) => void;
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
  const { t } = useTranslation(["timelineJourney"]);
  const [expanded, setExpanded] = useState(defaultExpanded);
  // E (state) — the one #406 color language: the header state word reads from the
  // same map the node uses (stepStateColorMap), replacing the old StatusBadge.
  // The word itself is the Timeline's own vocabulary (#453), not StepCard's.
  const statusLabel = t(stepStateColorMap[step.status].stateWordI18nKey);
  // With no evidence there is nothing to disclose, so the header stops being a
  // disclosure control entirely — no chevron, no `expanded` state to announce.
  // Otherwise a screen reader would hear "expanded" while nothing mounts below.
  const hasEvidence = evidence.length > 0;

  return (
    <View style={styles.wrapper}>
      <View style={styles.container} accessibilityRole="none">
        <View style={styles.nodeColumn}>
          <TimelineNode
            status={step.status}
            stepNumber={stepIndex + 1}
            onPress={() => onNodePress(step.id)}
            accessibilityLabel={t("timelineJourney:step.a11yGoTo", {
              number: stepIndex + 1,
              title: step.title,
            })}
          />
        </View>
        <View style={styles.contentCard}>
          <Pressable
            onPress={
              hasEvidence ? () => setExpanded((prev) => !prev) : undefined
            }
            accessible
            accessibilityRole={hasEvidence ? "button" : "text"}
            accessibilityLabel={`${step.title}, ${statusLabel}`}
            accessibilityState={hasEvidence ? { expanded } : undefined}
            style={styles.header}
          >
            <View style={styles.titleContainer}>
              <Text style={styles.title} numberOfLines={2}>
                {step.title}
              </Text>
            </View>
            <StateWord status={step.status} label={statusLabel} />
            {hasEvidence && (
              <Text
                style={[styles.chevron, expanded && styles.chevronExpanded]}
                accessibilityElementsHidden
              >
                {"\u25BC"}
              </Text>
            )}
          </Pressable>
          <MetadataBand
            afterStep={step.afterStep}
            waitingOn={step.waitingOn}
            dueDate={step.dueDate}
          />
          {/* No evidence → no section at all. An empty box saying "No evidence
              yet" is visual noise on a surface the user already reads as empty. */}
          {expanded && hasEvidence && (
            <View
              style={styles.evidenceSection}
              // Suffixed with the step id: a parent and a sub-step can be
              // expanded in the same tree, and a shared testID would make
              // `getByTestId` ambiguous.
              testID={`timeline-evidence-section-${step.id}`}
            >
              {evidence.map((ev) => (
                <TimelineEvidenceCard
                  key={ev.id}
                  evidence={ev}
                  onPress={onEvidencePress}
                />
              ))}
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
  onNodePress,
  onEvidencePress,
}: {
  child: TimelineStepChild;
  ordinal: string;
  onNodePress: (stepId: string) => void;
  onEvidencePress: (evidenceId: string) => void;
}) {
  const { t } = useTranslation(["timelineJourney"]);
  const [expanded, setExpanded] = useState(false);
  // #406 state word (E) replaces StatusBadge here too. Children carry no C/B
  // band (OQ-2); the evidence drawer below is pre-existing #293 behavior — the
  // prototype's E-only (no-drawer) child is a fidelity follow-up owned by #378.
  const statusLabel = t(stepStateColorMap[child.status].stateWordI18nKey);
  // Same disclosure honesty as the parent step — see `hasEvidence` there.
  const hasEvidence = child.evidence.length > 0;

  return (
    <View style={styles.childRow}>
      <TimelineNode
        status={child.status}
        size="sm"
        label={ordinal}
        onPress={() => onNodePress(child.id)}
        accessibilityLabel={t("timelineJourney:step.a11yGoTo", {
          number: ordinal,
          title: child.title,
        })}
      />
      <View style={styles.childContentCard}>
        <Pressable
          onPress={hasEvidence ? () => setExpanded((prev) => !prev) : undefined}
          accessible
          accessibilityRole={hasEvidence ? "button" : "text"}
          accessibilityLabel={t("timelineJourney:step.a11yChildExpand", {
            ordinal,
            title: child.title,
          })}
          accessibilityState={hasEvidence ? { expanded } : undefined}
          style={styles.childHeader}
        >
          <View style={styles.titleContainer}>
            <Text style={styles.childTitle} numberOfLines={2}>
              {child.title}
            </Text>
          </View>
          <StateWord status={child.status} label={statusLabel} />
          {hasEvidence && (
            <Text
              style={[styles.chevron, expanded && styles.chevronExpanded]}
              accessibilityElementsHidden
            >
              {"\u25BC"}
            </Text>
          )}
        </Pressable>
        {/* Same as the parent step: nothing renders when there's no evidence. */}
        {expanded && hasEvidence && (
          <View
            style={styles.evidenceSection}
            testID={`timeline-evidence-section-${child.id}`}
          >
            {child.evidence.map((ev) => (
              <TimelineEvidenceCard
                key={ev.id}
                evidence={ev}
                onPress={onEvidencePress}
              />
            ))}
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
