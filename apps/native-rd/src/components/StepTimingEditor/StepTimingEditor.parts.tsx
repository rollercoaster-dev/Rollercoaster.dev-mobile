import React from "react";
import { Pressable, ScrollView, View } from "react-native";
import { Text } from "../Text";
import { styles } from "./StepTimingEditor.styles";
import type { StepTimingCandidate } from "./types";

/** The ordinal badge — "1", "a", or a check for a completed step. */
export function OrdinalBadge({
  label,
  isCompleted,
}: {
  label: string;
  isCompleted?: boolean;
}) {
  return (
    <View style={[styles.ordinal, isCompleted && styles.ordinalCompleted]}>
      <Text style={styles.ordinalLabel}>{isCompleted ? "✓" : label}</Text>
    </View>
  );
}

/**
 * The row's truth lines — the same text Focus and Timeline render for the same
 * data, so a step authored here reads identically wherever it is opened.
 *
 * The glyph is a separate element, matching `FocusCurrentTaskCard`'s metadata
 * band; the *text* is what parity is asserted on.
 */
export function TruthLines({
  afterStepTitle,
  afterStepIsCompleted,
  dueDateLabel,
  afterLineText,
  dueLineText,
  doneSuffix,
  testID,
}: {
  afterStepTitle?: string | null;
  afterStepIsCompleted?: boolean;
  dueDateLabel?: string | null;
  afterLineText: string;
  dueLineText: string;
  doneSuffix: string;
  testID: string;
}) {
  return (
    <>
      {afterStepTitle ? (
        <View style={styles.truthLine}>
          <Text style={[styles.truthGlyph, styles.truthGlyphAfter]}>↩</Text>
          <Text style={styles.truthText} testID={`${testID}-after-line`}>
            {afterLineText}
            {/* Opt-in only: the shipped read-out carries no completion suffix,
                because the resolver supplies no done-state to back it. */}
            {afterStepIsCompleted ? (
              <Text style={styles.doneTag}>{doneSuffix}</Text>
            ) : null}
          </Text>
        </View>
      ) : null}

      {dueDateLabel ? (
        <View style={styles.truthLine}>
          <Text style={[styles.truthGlyph, styles.truthGlyphDue]}>▦</Text>
          <Text style={styles.truthText} testID={`${testID}-due-line`}>
            {dueLineText}
          </Text>
        </View>
      ) : null}
    </>
  );
}

/**
 * `Depends on` — the C line. Not "comes after": step 4 comes after step 3 by
 * being step 4, and it stops short of "blocked by", which is forbidden here
 * (ADR-0010/0012, #384). Nothing is gated — the complete action stays live on a
 * step whose dependency is still open — so borrowing a gate word would lie.
 */
export function DependencyPicker({
  candidates,
  selectedId,
  isOpen,
  onToggle,
  onPick,
  nothingLabel,
  noCandidatesLabel,
  dependsOnLabel,
  testID,
}: {
  candidates: readonly StepTimingCandidate[];
  selectedId: string | null;
  isOpen: boolean;
  onToggle: () => void;
  onPick: (id: string | null) => void;
  nothingLabel: string;
  noCandidatesLabel: string;
  dependsOnLabel: string;
  testID: string;
}) {
  const selected = candidates.find((c) => c.id === selectedId) ?? null;

  return (
    <View>
      <Text style={styles.fieldLabel}>{dependsOnLabel}</Text>

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: isOpen }}
        accessibilityLabel={`${dependsOnLabel}: ${selected ? selected.title : nothingLabel}`}
        testID={`${testID}-toggle`}
        onPress={onToggle}
        style={({ pressed }) => [
          styles.pickerButton,
          pressed && styles.pickerButtonPressed,
        ]}
      >
        {selected ? (
          <>
            <OrdinalBadge
              label={selected.label}
              isCompleted={selected.isCompleted}
            />
            <Text style={styles.pickerValue}>{selected.title}</Text>
          </>
        ) : (
          <Text style={styles.pickerPlaceholder}>{nothingLabel}</Text>
        )}
        <Text style={styles.caret}>{isOpen ? "▲" : "▼"}</Text>
      </Pressable>

      {isOpen ? (
        candidates.length === 0 ? (
          // A goal's first step has nothing to depend on. Say so plainly —
          // no "missing", no "needed".
          <Text style={styles.emptyCandidates} testID={`${testID}-empty`}>
            {noCandidatesLabel}
          </Text>
        ) : (
          <ScrollView
            style={styles.candidateList}
            contentContainerStyle={styles.candidateListContent}
            testID={`${testID}-list`}
          >
            <CandidateRow
              title={nothingLabel}
              isSelected={selectedId === null}
              onPress={() => onPick(null)}
              testID={`${testID}-option-nothing`}
            />
            {candidates.map((candidate) => (
              <CandidateRow
                key={candidate.id}
                title={candidate.title}
                ordinal={candidate.label}
                isCompleted={candidate.isCompleted}
                isSubStep={candidate.isSubStep}
                isSelected={candidate.id === selectedId}
                onPress={() => onPick(candidate.id)}
                testID={`${testID}-option-${candidate.id}`}
              />
            ))}
          </ScrollView>
        )
      ) : null}
    </View>
  );
}

function CandidateRow({
  title,
  ordinal,
  isCompleted,
  isSubStep,
  isSelected,
  onPress,
  testID,
}: {
  title: string;
  ordinal?: string;
  isCompleted?: boolean;
  isSubStep?: boolean;
  isSelected: boolean;
  onPress: () => void;
  testID: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
      accessibilityLabel={title}
      testID={testID}
      onPress={onPress}
      style={[
        styles.candidateRow,
        isSubStep && styles.candidateRowChild,
        isSelected && styles.candidateRowSelected,
      ]}
    >
      {ordinal !== undefined ? (
        <OrdinalBadge label={ordinal} isCompleted={isCompleted} />
      ) : null}
      <Text
        style={[
          styles.candidateTitle,
          isCompleted && styles.candidateTitleCompleted,
          isSelected && styles.candidateTitleSelected,
        ]}
      >
        {title}
      </Text>
      {isSelected ? <Text style={styles.tick}>●</Text> : null}
    </Pressable>
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
  return (
    <View style={styles.footer}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={clearLabel}
        testID={`${testID}-clear`}
        onPress={onClear}
        style={({ pressed }) => [
          styles.footerButton,
          styles.clearButton,
          pressed && styles.buttonPressed,
        ]}
      >
        <Text style={styles.clearLabel}>{clearLabel}</Text>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={doneLabel}
        testID={`${testID}-done`}
        onPress={onDone}
        style={({ pressed }) => [
          styles.footerButton,
          styles.doneButton,
          pressed && styles.buttonPressed,
        ]}
      >
        <Text style={styles.doneLabel}>{doneLabel}</Text>
      </Pressable>
    </View>
  );
}
