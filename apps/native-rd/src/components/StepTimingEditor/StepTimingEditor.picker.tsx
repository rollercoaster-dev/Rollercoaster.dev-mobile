import React from "react";
import { Pressable, ScrollView, View } from "react-native";
import { CaretDown, CaretUp, Check } from "phosphor-react-native";
import { useUnistyles } from "react-native-unistyles";
import { Text } from "../Text";
import { OrdinalBadge } from "./StepTimingEditor.parts";
import { styles } from "./StepTimingEditor.styles";
import type { StepTimingCandidate } from "./types";

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
  const { theme } = useUnistyles();
  const selected = candidates.find((c) => c.id === selectedId) ?? null;
  const Caret = isOpen ? CaretUp : CaretDown;

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
        <Caret
          size={theme.size.sm}
          weight="bold"
          color={theme.colors.textSecondary}
        />
      </Pressable>

      {isOpen ? (
        <CandidateList
          candidates={candidates}
          selectedId={selectedId}
          onPick={onPick}
          nothingLabel={nothingLabel}
          noCandidatesLabel={noCandidatesLabel}
          testID={testID}
        />
      ) : null}
    </View>
  );
}

function CandidateList({
  candidates,
  selectedId,
  onPick,
  nothingLabel,
  noCandidatesLabel,
  testID,
}: {
  candidates: readonly StepTimingCandidate[];
  selectedId: string | null;
  onPick: (id: string | null) => void;
  nothingLabel: string;
  noCandidatesLabel: string;
  testID: string;
}) {
  if (candidates.length === 0) {
    // A goal's first step has nothing to depend on. Say so plainly.
    return (
      <Text style={styles.emptyCandidates} testID={`${testID}-empty`}>
        {noCandidatesLabel}
      </Text>
    );
  }

  return (
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
  const { theme } = useUnistyles();

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
      {/* The selection mark is a state indicator — Phosphor, not a "●" run. */}
      {isSelected ? (
        <Check
          size={theme.size.sm}
          weight="bold"
          color={theme.colors.accentPrimary}
        />
      ) : null}
    </Pressable>
  );
}
