import React, { memo } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { useTranslation } from "react-i18next";
import { Checkbox } from "../Checkbox";
import { type QuickEvidenceType } from "../../types/evidence";
import { StepCardTopBand } from "./StepCardTopBand";
import { type StepCardStatus, type StepCardPart } from "./StepCard.shared";
import {
  EvidenceCaptureButtons,
  getMissingQuickEvidenceOptions,
} from "./StepCardEvidenceCapture";
import { styles } from "./StepCard.styles";

export interface StepOverviewCardProps {
  stepId: string;
  title: string;
  status: StepCardStatus;
  stepIndex: number;
  totalSteps: number;
  parts: readonly StepCardPart[];
  /**
   * Planned/captured evidence for the parent step itself (#360, Joe
   * 2026-06-21). A parent can capture its own evidence via the foot's typed
   * buttons, same as a leaf. Independent of completion — the parent's checkbox
   * still gates on all parts done (ADR-0012), never on its own evidence — and
   * note this evidence is not summed into the "evidence across parts" rollup.
   */
  plannedEvidenceTypes?: string[] | null;
  capturedEvidenceTypes?: string[];
  onToggleComplete: (stepId: string) => void;
  /** Capture a typed piece of evidence on the parent step (#360). */
  onQuickEvidence?: (stepId: string, type: QuickEvidenceType) => void;
  /**
   * Jump the carousel to a part's own card (#360). When supplied, each spine
   * row becomes a button that opens that part; without it the rows stay
   * read-only (parts remain reachable by swiping).
   */
  onOpenPart?: (partId: string) => void;
}

function StepOverviewCardComponent({
  stepId,
  title,
  status,
  stepIndex,
  totalSteps,
  parts,
  plannedEvidenceTypes,
  capturedEvidenceTypes,
  onToggleComplete,
  onQuickEvidence,
  onOpenPart,
}: StepOverviewCardProps) {
  const { t } = useTranslation(["common", "focusMode"]);

  const isCompleted = status === "completed";
  const allPartsDone =
    parts.length > 0 && parts.every((p) => p.status === "completed");
  // The active part is the first one still open — it gets the ringed node and
  // the highlighted cell (D7: accentYellow in-progress token).
  const activePartId = parts.find((p) => p.status !== "completed")?.id ?? null;
  const totalEvidence = parts.reduce((sum, p) => sum + p.evidenceCount, 0);

  // The manual "mark parent complete" invite (Q9) appears only when every part
  // is done — never auto-judged (ADR-0012). A completed parent keeps the
  // checkbox so it can be un-completed. While parts remain, the foot mirrors a
  // blocked leaf card: a quiet prompt, no completion control.
  const canMarkComplete = allPartsDone || isCompleted;
  const markCompleteLabel = isCompleted
    ? t("common:stepCard.checkbox.completed")
    : t("focusMode:overview.markComplete", { parent: title });

  // Typed capture buttons for the parent's own planned-but-uncaptured evidence.
  // Each disappears as its type lands. Purely a capture convenience — it does
  // not gate the parent's completion (that stays parts-driven).
  const planned = plannedEvidenceTypes ?? null;
  const captured = capturedEvidenceTypes ?? [];
  const quickEvidenceOptions =
    !isCompleted && planned !== null && planned.length > 0 && onQuickEvidence
      ? getMissingQuickEvidenceOptions(planned, captured)
      : [];

  return (
    <View style={styles.cardOuter}>
      <StepCardTopBand
        status={status}
        stepIndex={stepIndex}
        totalSteps={totalSteps}
        isOverview
      />
      <ScrollView
        style={styles.cardBody}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.cardBodyContent}
      >
        <Text
          style={styles.title}
          numberOfLines={2}
          accessible
          accessibilityRole="header"
        >
          {title}
        </Text>

        {/* Parts list rendered as a vertical timeline spine — node-on-connector,
            ✓ for done, the active part ringed. Mirrors the prototype spineList. */}
        <Text style={styles.evidenceRailLabel} accessibilityRole="text">
          {t("focusMode:overview.partsHeading")}
        </Text>
        <View style={styles.overviewSpine}>
          {parts.map((part, index) => {
            const done = part.status === "completed";
            const isActive = part.id === activePartId;
            const isLast = index === parts.length - 1;
            const statusWord = t(`common:stepCard.status.${part.status}`);
            return (
              <Pressable
                key={part.id}
                style={styles.spineRow}
                onPress={onOpenPart ? () => onOpenPart(part.id) : undefined}
                accessible
                accessibilityRole={onOpenPart ? "button" : "text"}
                accessibilityLabel={t("focusMode:overview.partA11y", {
                  title: part.title,
                  status: statusWord,
                })}
                accessibilityHint={
                  onOpenPart ? t("focusMode:overview.partOpenHint") : undefined
                }
                testID={`overview-part-${part.id}`}
              >
                <View style={styles.spineRail}>
                  <View
                    style={[
                      styles.spineNode,
                      done && styles.spineNodeDone,
                      isActive && styles.spineNodeActive,
                    ]}
                  >
                    {done && (
                      <Text
                        style={styles.spineNodeCheck}
                        accessibilityElementsHidden
                      >
                        ✓
                      </Text>
                    )}
                  </View>
                  {!isLast && <View style={styles.spineConnector} />}
                </View>
                <View
                  style={[styles.spineCell, isActive && styles.spineCellActive]}
                >
                  <Text
                    style={[
                      styles.spineCellText,
                      isActive && styles.spineCellActiveText,
                    ]}
                    numberOfLines={2}
                  >
                    {part.title}
                  </Text>
                  {part.evidenceCount > 0 && (
                    <View
                      style={styles.spineEvidenceBadge}
                      accessibilityElementsHidden
                    >
                      <Text style={styles.spineEvidenceBadgeText}>
                        {part.evidenceCount}
                      </Text>
                    </View>
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* Evidence rollup — sum of evidence captured across all parts. A
            read-only count, never a deficiency marker (D8). */}
        <View
          style={styles.overviewRollup}
          accessible
          accessibilityRole="text"
          accessibilityLabel={t("focusMode:overview.evidenceRollupA11y", {
            count: totalEvidence,
          })}
          testID="overview-evidence-rollup"
        >
          <Text style={styles.overviewRollupLabel}>
            {t("focusMode:overview.evidenceRollupLabel")}
          </Text>
          <View style={styles.overviewRollupBadge}>
            <Text style={styles.overviewRollupBadgeText}>{totalEvidence}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Pinned foot — same shape as a leaf card. The completion control sits at
          the left: the Q9 complete invite once all parts are done, otherwise a
          quiet prompt. The parent's own typed capture buttons are pushed to the
          right on the same row (each hides as its type lands). No foot
          navigation control (D10); parts are reached by tapping their spine row
          above or by swiping. */}
      <View style={styles.cardFoot}>
        {canMarkComplete ? (
          <View style={styles.checkboxRow}>
            <Checkbox
              checked={isCompleted}
              onToggle={() => onToggleComplete(stepId)}
              label={markCompleteLabel}
            />
          </View>
        ) : (
          <Text
            style={styles.addEvidencePromptText}
            accessibilityRole="text"
            testID="overview-parts-pending-prompt"
          >
            {t("focusMode:overview.partsPendingPrompt")}
          </Text>
        )}
        {onQuickEvidence && quickEvidenceOptions.length > 0 && (
          <EvidenceCaptureButtons
            stepId={stepId}
            options={quickEvidenceOptions}
            onQuickEvidence={onQuickEvidence}
          />
        )}
      </View>
    </View>
  );
}

export const StepOverviewCard = memo(StepOverviewCardComponent);
