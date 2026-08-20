/**
 * EditGoalTimingLine — the one pressable timing target on an Edit Goal step or
 * sub-step row (#575).
 *
 * One affordance per row, never two ghost chips: the row's date/dependency
 * truth-lines and the unset `＋ when?` prompt share a single tap target, which
 * signals outward via `onEditTiming`. No editor opens here — StepTimingEditor
 * (#573) owns that, and #576 wires this callback to it.
 *
 * Presentation matches StepTimingEditor's own read-out (stacked borderless
 * lines, glyph + text, D1) rather than the pre-#575 bordered pills, so a step's
 * timing reads identically in the row and in the editor. `TruthLines` itself is
 * not reused: it has no `waiting` case, because the editor deliberately never
 * authors "waiting on" (D2) — the read-only row still displays one.
 *
 * Both rows share this renderer, so the glyph/tone map and the three-state gate
 * (set / unset / completed-with-nothing) exist once.
 */
import React from "react";
import { View, Text as RNText, Pressable } from "react-native";
import { useUnistyles } from "react-native-unistyles";
import { styles } from "./EditGoalView.styles";
import type { EditGoalChipTone, EditGoalDateDepChip } from "./EditGoalView";

// Date/dependency chip glyphs, transcribed from the App Shell prototype's
// `edit` route (subOf/editSteps): after ↩ / waiting ⏳ / due ▦.
export const CHIP_GLYPH: Record<EditGoalChipTone, string> = {
  after: "↩",
  waiting: "⏳",
  due: "▦",
};

export interface EditGoalTimingLineProps {
  /** The row's date/dependency chips. Absent/empty → the unset state. */
  chips?: EditGoalDateDepChip[];
  /** Suppresses the unset prompt only — set timing survives completion. */
  isCompleted?: boolean;
  /** Step or sub-step title, named in both a11y labels. */
  title: string;
  /**
   * Makes the line pressable. Omitted → the row renders its chips inert, with
   * no unset prompt and no `accessibilityRole` (the pre-#575 read-only path,
   * D7).
   */
  onEditTiming?: () => void;
  /** Reflects an *external* editor's open state on this line (#576, D10). */
  isTimingExpanded?: boolean;
  testID: string;

  // --- Copy (i18n-free per D9; English defaults; [Integrate] passes t()). ---
  whenPromptLabel?: string;
  editTimingUnsetA11yLabel?: (title: string) => string;
  editTimingSetA11yLabel?: (title: string, lines: string[]) => string;
}

export function EditGoalTimingLine({
  chips,
  isCompleted = false,
  title,
  onEditTiming,
  isTimingExpanded = false,
  testID,
  whenPromptLabel = "＋ when?",
  editTimingUnsetA11yLabel = (stepTitle) => `Set when "${stepTitle}" is due`,
  editTimingSetA11yLabel = (stepTitle, lines) =>
    `Edit timing for "${stepTitle}": ${lines.join(", ")}`,
}: EditGoalTimingLineProps) {
  const { theme } = useUnistyles();

  const chipColor: Record<EditGoalChipTone, string> = {
    after: theme.colors.success,
    waiting: theme.colors.warning,
    due: theme.colors.textSecondary,
  };

  const hasTiming = Boolean(chips && chips.length > 0);
  // Nothing is left to plan on a finished row, so it carries no placeholder —
  // only the timing it already has, if any. The read-only path (no callback)
  // keeps its pre-#575 behaviour: chips when present, nothing otherwise (D7).
  const showTimingLine = onEditTiming ? hasTiming || !isCompleted : hasTiming;
  if (!showTimingLine) return null;

  const content = hasTiming ? (
    chips?.map((chip, i) => (
      <View key={i} style={styles.truthLine}>
        <RNText
          style={[styles.truthGlyph, { color: chipColor[chip.tone] }]}
          accessibilityElementsHidden
          importantForAccessibility="no"
        >
          {CHIP_GLYPH[chip.tone]}
        </RNText>
        <RNText style={[styles.truthText, { color: chipColor[chip.tone] }]}>
          {chip.text}
        </RNText>
      </View>
    ))
  ) : (
    // One affordance, not two: the unset state is a single quiet prompt.
    <RNText style={styles.whenPrompt}>{whenPromptLabel}</RNText>
  );

  if (!onEditTiming) {
    return (
      <View style={[styles.timingLine, styles.timingLineInert]} testID={testID}>
        {content}
      </View>
    );
  }

  return (
    <Pressable
      onPress={onEditTiming}
      accessibilityRole="button"
      // Reads the lines back rather than naming the control, so set and unset
      // announce differently and the unset case never just echoes "＋ when?".
      accessibilityLabel={
        hasTiming
          ? editTimingSetA11yLabel(
              title,
              (chips ?? []).map((chip) => chip.text),
            )
          : editTimingUnsetA11yLabel(title)
      }
      accessibilityState={{ expanded: isTimingExpanded }}
      testID={testID}
      style={({ pressed }) => [
        styles.timingLine,
        pressed && styles.timingLinePressed,
      ]}
    >
      {content}
    </Pressable>
  );
}
