import React from "react";
import { View } from "react-native";
import { Check } from "phosphor-react-native";
import { useUnistyles } from "react-native-unistyles";
import { Text } from "../Text";
import { Button } from "../Button";
import { TimingMarkIcon } from "../TimingMarkIcon";
import { styles } from "./StepTimingEditor.styles";

/** The ordinal badge — "1", "a", or a check for a completed step. */
export function OrdinalBadge({
  label,
  isCompleted,
}: {
  label: string;
  isCompleted?: boolean;
}) {
  const { theme } = useUnistyles();
  return (
    <View style={[styles.ordinal, isCompleted && styles.ordinalCompleted]}>
      {isCompleted ? (
        // Phosphor, not a "✓" text run — design system Rule 8 for state marks.
        <Check size={theme.size.xs} weight="bold" color={theme.colors.text} />
      ) : (
        <Text style={styles.ordinalLabel}>{label}</Text>
      )}
    </View>
  );
}

/**
 * The row's truth lines — the same text Focus and Timeline render for the same
 * data, so a step authored here reads identically wherever it is opened.
 *
 * The mark is a separate element, matching `FocusCurrentTaskCard`'s metadata
 * band — the same shared `TimingMarkIcon`, so the two surfaces cannot drift.
 * The *text* is what parity is asserted on.
 */
export function TruthLines({
  afterLineText,
  dueLineText,
  doneSuffix,
  testID,
}: {
  /** Pre-composed `after …` line, or null when there is no dependency. */
  afterLineText: string | null;
  /** Pre-composed `due …` line, or null when there is no date. */
  dueLineText: string | null;
  /** Opt-in completion suffix, or null — the default read-out carries none. */
  doneSuffix: string | null;
  testID: string;
}) {
  return (
    <>
      {afterLineText ? (
        <View style={styles.truthLine}>
          <TimingMarkIcon tone="after" testID={`${testID}-mark-after`} />
          <Text style={styles.truthText} testID={`${testID}-after-line`}>
            {afterLineText}
            {doneSuffix ? (
              <Text style={styles.doneTag}>{doneSuffix}</Text>
            ) : null}
          </Text>
        </View>
      ) : null}

      {dueLineText ? (
        <View style={styles.truthLine}>
          <TimingMarkIcon tone="due" testID={`${testID}-mark-due`} />
          <Text style={styles.truthText} testID={`${testID}-due-line`}>
            {dueLineText}
          </Text>
        </View>
      ) : null}
    </>
  );
}
/**
 * The neutral ordering note — what "inform, never enforce" looks like when
 * there is finally something to inform about.
 *
 * Plain body copy. No icon, no red, nothing disabled, nothing refused. The
 * selection that triggered it stays exactly as the user made it.
 */
export function OrderingNote({
  text,
  testID,
}: {
  text: string;
  testID: string;
}) {
  return (
    <View style={styles.note} testID={testID}>
      <Text style={styles.noteText}>{text}</Text>
    </View>
  );
}

export function EditorFooter({
  clearLabel,
  doneLabel,
  onClear,
  onDone,
  testID,
}: {
  clearLabel: string;
  doneLabel: string;
  onClear: () => void;
  onDone: () => void;
  testID: string;
}) {
  // The shared Button, not bespoke Pressables: it carries the neo-brutalist
  // pressed-translate every other button in the app uses, plus the Android
  // glyph-run fix. `Done` takes the flex so the prototype's proportions hold.
  return (
    <View style={styles.footer}>
      <View style={styles.clearSlot}>
        <Button
          label={clearLabel}
          variant="secondary"
          onPress={onClear}
          testID={`${testID}-clear`}
        />
      </View>
      <View style={styles.doneSlot}>
        <Button
          label={doneLabel}
          variant="primary"
          onPress={onDone}
          testID={`${testID}-done`}
        />
      </View>
    </View>
  );
}
