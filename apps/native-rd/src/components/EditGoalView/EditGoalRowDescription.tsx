/**
 * EditGoalRowDescription — the optional how-to text under an Edit Goal step or
 * sub-step title (#803), in whichever of its three states applies:
 *
 * - no description → a quiet `＋ description` prompt (same register as the
 *   timing line's `＋ when?`);
 * - a description → the text itself, tappable to edit;
 * - editing → a multi-line input with Save / Cancel (and Clear while it holds
 *   text).
 *
 * Controlled: the draft and which row is open live in EditGoalStepList (D2), so
 * the row swapping between its draggable and static shells while an editor is
 * open can never drop what was typed. Save is explicit rather than on blur
 * (D1): a multi-line field has no "done" return key, and a blur-commit would
 * race Cancel.
 *
 * Over the limit the editor stays open with the draft intact and says how long
 * the limit is. There is no `maxLength` on the input — that would silently cut
 * a paste short, which is dropping what the user typed.
 *
 * Without `onStartEditing` (New Goal wizard, Storybook) an existing description
 * renders read-only and no prompt shows.
 */
import React, { useEffect, useRef } from "react";
import { AccessibilityInfo, Pressable, TextInput, View } from "react-native";
import { useUnistyles } from "react-native-unistyles";
import { Text } from "../Text";
import { focusAccessibilityRef } from "../../utils/accessibilityFocus";
import { Button } from "../Button";
import { styles } from "./EditGoalView.styles";

/** Copy for the description slot. English defaults live in the component. */
export interface EditGoalDescriptionCopy {
  /** Unset-state prompt. */
  addPrompt?: string;
  /** a11y label for the unset prompt. */
  addA11yLabel?: (title: string) => string;
  /** a11y label for the set-state text; the text itself rides accessibilityValue. */
  editA11yLabel?: (title: string) => string;
  /** a11y hint on the set-state text. */
  editA11yHint?: string;
  /** a11y label for the multi-line input. */
  inputA11yLabel?: (title: string) => string;
  placeholder?: string;
  saveLabel?: string;
  cancelLabel?: string;
  clearLabel?: string;
  /** Shown (and announced on Save) while the draft is over the limit. */
  tooLongMessage?: (count: number, max: number) => string;
}

/**
 * The list layer's description wiring for one row, id-bound before it reaches
 * the row. Omitted → read-only.
 */
export interface EditGoalRowDescriptionBinding {
  isEditing: boolean;
  draft: string;
  maxLength: number;
  onStartEditing: () => void;
  onDraftChange: (text: string) => void;
  /** Only called with a draft inside the limit. */
  onSave: () => void;
  onCancel: () => void;
  /**
   * This row's editor just closed: screen-reader focus goes back to the line
   * that replaced it rather than being lost with the unmounted input.
   */
  focusOnMount?: boolean;
  copy?: EditGoalDescriptionCopy;
}

export interface EditGoalRowDescriptionProps {
  /** Step or sub-step title, named in the a11y labels. */
  title: string;
  description?: string | null;
  binding?: EditGoalRowDescriptionBinding;
  /** Prefix: `-add`, `-text`, `-input`, `-save`, `-cancel`, `-clear`, `-too-long`. */
  testID: string;
}

const DEFAULT_COPY: Required<EditGoalDescriptionCopy> = {
  addPrompt: "＋ description",
  addA11yLabel: (title) => `Add a description to "${title}"`,
  editA11yLabel: (title) => `Description of "${title}"`,
  editA11yHint: "Edit the description",
  inputA11yLabel: (title) => `Description of "${title}"`,
  placeholder: "How to go about it, notes, links",
  saveLabel: "Save",
  cancelLabel: "Cancel",
  clearLabel: "Clear text",
  tooLongMessage: (count, max) =>
    `A description holds up to ${max} characters. This one has ${count}.`,
};

/** Trimmed length — the same measure `updateStep` validates against. */
export function descriptionLength(text: string): number {
  return text.trim().length;
}

export function EditGoalRowDescription({
  title,
  description,
  binding,
  testID,
}: EditGoalRowDescriptionProps) {
  const { theme } = useUnistyles();
  const copy = { ...DEFAULT_COPY, ...stripUndefined(binding?.copy) };
  const text = description ?? "";
  const lineRef = useRef<View | null>(null);
  // Held in the list, not here: closing the editor can also swap the row's
  // drag shell, which remounts this component and would reset local state.
  const focusLine = Boolean(binding?.focusOnMount && !binding.isEditing);
  useEffect(() => {
    if (!focusLine) return;
    return focusAccessibilityRef(lineRef);
  }, [focusLine]);

  if (!binding) {
    if (!text) return null;
    return (
      <Text
        variant="caption"
        style={styles.descriptionText}
        testID={`${testID}-text`}
      >
        {text}
      </Text>
    );
  }

  if (!binding.isEditing) {
    return (
      <Pressable
        ref={lineRef}
        onPress={binding.onStartEditing}
        accessibilityRole="button"
        accessibilityLabel={
          text ? copy.editA11yLabel(title) : copy.addA11yLabel(title)
        }
        accessibilityValue={text ? { text } : undefined}
        accessibilityHint={text ? copy.editA11yHint : undefined}
        testID={text ? `${testID}-text` : `${testID}-add`}
        style={({ pressed }) => [
          styles.descriptionLine,
          pressed && styles.timingLinePressed,
        ]}
      >
        {text ? (
          <Text variant="caption" style={styles.descriptionText}>
            {text}
          </Text>
        ) : (
          <Text variant="metadata" style={styles.whenPrompt}>
            {copy.addPrompt}
          </Text>
        )}
      </Pressable>
    );
  }

  const count = descriptionLength(binding.draft);
  const tooLong = count > binding.maxLength;
  const tooLongText = copy.tooLongMessage(count, binding.maxLength);

  function handleSave() {
    if (!binding) return;
    // Refused, not trimmed: the editor stays open with every character the
    // user typed, and the message (already on screen) is read out.
    if (tooLong) {
      AccessibilityInfo.announceForAccessibility(tooLongText);
      return;
    }
    binding.onSave();
  }

  return (
    <View style={styles.descriptionEditor}>
      <TextInput
        style={styles.descriptionEditInput}
        value={binding.draft}
        onChangeText={binding.onDraftChange}
        multiline
        autoFocus
        placeholder={copy.placeholder}
        placeholderTextColor={theme.colors.textMuted}
        accessibilityLabel={copy.inputA11yLabel(title)}
        testID={`${testID}-input`}
      />
      {tooLong ? (
        // No live region: it would read out on every keystroke past the
        // limit. The refused Save announces it instead, on both platforms.
        <Text
          variant="caption"
          style={styles.descriptionTooLong}
          testID={`${testID}-too-long`}
        >
          {tooLongText}
        </Text>
      ) : null}
      <View style={styles.descriptionActions}>
        {binding.draft.length > 0 ? (
          <Button
            label={copy.clearLabel}
            variant="ghost"
            onPress={() => binding.onDraftChange("")}
            testID={`${testID}-clear`}
          />
        ) : null}
        <View style={styles.descriptionActionsEnd}>
          <Button
            label={copy.cancelLabel}
            variant="secondary"
            onPress={binding.onCancel}
            testID={`${testID}-cancel`}
          />
          <Button
            label={copy.saveLabel}
            onPress={handleSave}
            testID={`${testID}-save`}
          />
        </View>
      </View>
    </View>
  );
}

function stripUndefined<T extends object>(obj: T | undefined): Partial<T> {
  if (!obj) return {};
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined),
  ) as Partial<T>;
}
