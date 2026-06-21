import React, { memo } from "react";
import { View, Text, ScrollView } from "react-native";
import { useTranslation } from "react-i18next";
import { Checkbox } from "../Checkbox";
import { StepCardTopBand } from "./StepCardTopBand";
import { type StepCardStatus, type StepCardPart } from "./StepCard.shared";
import { styles } from "./StepCard.styles";

export interface StepOverviewCardProps {
  stepId: string;
  title: string;
  status: StepCardStatus;
  stepIndex: number;
  totalSteps: number;
  parts: readonly StepCardPart[];
  onToggleComplete: (stepId: string) => void;
}

function StepOverviewCardComponent({
  stepId,
  title,
  status,
  stepIndex,
  totalSteps,
  parts,
  onToggleComplete,
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
              <View
                key={part.id}
                style={styles.spineRow}
                accessible
                accessibilityRole="text"
                accessibilityLabel={t("focusMode:overview.partA11y", {
                  title: part.title,
                  status: statusWord,
                })}
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
                  <Text style={styles.spineCellText} numberOfLines={2}>
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
              </View>
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

      {/* Pinned foot — same shape as a leaf card: the Q9 complete invite once all
          parts are done, otherwise a quiet prompt (no bespoke navigation here;
          parts are reached by swiping, like every other card). */}
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
      </View>
    </View>
  );
}

export const StepOverviewCard = memo(StepOverviewCardComponent);
