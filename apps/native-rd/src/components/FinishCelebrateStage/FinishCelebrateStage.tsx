import React, { useState } from "react";
import { Pressable, TextInput, View } from "react-native";

import { Text } from "../Text";
import { Button } from "../Button";
import { styles } from "./FinishCelebrateStage.styles";

export interface FinishCelebrateStageProps {
  /** Mono uppercase eyebrow above the headline. */
  eyebrow?: string;
  /** Large display headline ("You did it."). */
  headline?: string;
  /** Summary sentence naming the goal and evidence count. */
  summary: string;
  /** Current closing-note text (controlled by the caller). */
  closingNoteValue: string;
  /** Fires on every keystroke in the open note field. */
  onClosingNoteChange: (text: string) => void;
  /**
   * Optional "done editing" trigger — fires with the current text when the
   * note field blurs. The open/closed toggle itself is internal state (D8);
   * only the resulting text and this save signal are outward callbacks.
   */
  onSaveClosingNote?: (text: string) => void;
  /** Closed-state prompt label ("Add a closing note"). */
  closingNotePromptLabel?: string;
  /** Muted suffix rendered after the prompt ("optional"). */
  closingNoteOptionalLabel?: string;
  /** Placeholder shown in the open note field. */
  closingNotePlaceholder?: string;
  /** a11y label for the note field. */
  closingNoteAccessibilityLabel?: string;
  /** a11y hint for the note field. */
  closingNoteAccessibilityHint?: string;
  /** Primary CTA press handler. */
  onDesignBadge: () => void;
  /** Primary CTA label ("Design your badge →"). */
  ctaLabel?: string;
  /** Muted subcopy below the CTA. */
  ctaSubcopy?: string;
  /**
   * Seeds the internal open/closed state of the note field (uncontrolled
   * default, like `defaultValue`). The toggle stays internal (D8); this only
   * sets its starting position — used by the open-state story.
   */
  initialNoteOpen?: boolean;
}

/**
 * Goal-complete celebration stage of the finishing flow. Renders the
 * "You did it." moment, an optional closing note (closed dashed prompt ↔ open
 * text field, toggled by internal state), and the primary "Design your badge"
 * CTA. Presentational only — copy arrives as props with English defaults, and
 * there is deliberately no badge preview (a badge design does not yet exist at
 * this stage). See dev plan for issue #470.
 */
export function FinishCelebrateStage({
  eyebrow = "Goal complete",
  headline = "You did it.",
  summary,
  closingNoteValue,
  onClosingNoteChange,
  onSaveClosingNote,
  closingNotePromptLabel = "Add a closing note",
  closingNoteOptionalLabel = "optional",
  closingNotePlaceholder = "What did finishing this feel like?",
  closingNoteAccessibilityLabel = "Closing note",
  closingNoteAccessibilityHint = "Optional. Write a few words about finishing this goal.",
  onDesignBadge,
  ctaLabel = "Design your badge →",
  ctaSubcopy = "the keepsake for this win — make it yours",
  initialNoteOpen = false,
}: FinishCelebrateStageProps) {
  const [noteOpen, setNoteOpen] = useState(initialNoteOpen);

  return (
    <View style={styles.container} testID="finish-celebrate-stage">
      <View style={styles.content}>
        <Text variant="mono" style={styles.eyebrow}>
          {eyebrow}
        </Text>
        <Text
          variant="display"
          style={styles.headline}
          accessibilityRole="header"
        >
          {headline}
        </Text>
        <Text variant="body" style={styles.summary}>
          {summary}
        </Text>

        {noteOpen ? (
          <TextInput
            style={styles.noteInput}
            value={closingNoteValue}
            onChangeText={onClosingNoteChange}
            onBlur={() => onSaveClosingNote?.(closingNoteValue)}
            placeholder={closingNotePlaceholder}
            placeholderTextColor={styles.notePlaceholderColor.color}
            multiline
            autoFocus
            accessibilityLabel={closingNoteAccessibilityLabel}
            accessibilityHint={closingNoteAccessibilityHint}
            testID="finish-celebrate-note-input"
          />
        ) : (
          <Pressable
            style={styles.notePrompt}
            onPress={() => setNoteOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={closingNotePromptLabel}
            accessibilityHint={closingNoteAccessibilityHint}
            testID="finish-celebrate-note-prompt"
          >
            <Text style={styles.notePromptIcon} accessibilityElementsHidden>
              ✍️
            </Text>
            <Text variant="body" style={styles.notePromptText}>
              {closingNotePromptLabel}{" "}
              <Text style={styles.noteOptional}>
                · {closingNoteOptionalLabel}
              </Text>
            </Text>
          </Pressable>
        )}
      </View>

      <View style={styles.footer}>
        <Button
          label={ctaLabel}
          onPress={onDesignBadge}
          variant="primary"
          size="lg"
          testID="finish-celebrate-cta"
        />
        <Text variant="caption" style={styles.subcopy}>
          {ctaSubcopy}
        </Text>
      </View>
    </View>
  );
}
