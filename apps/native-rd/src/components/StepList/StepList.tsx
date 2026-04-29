import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text as RNText,
  TextInput,
  Pressable,
  AccessibilityInfo,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useUnistyles } from "react-native-unistyles";
import { useAnimationPref } from "../../hooks/useAnimationPref";
import { triggerDragStart, triggerDragDrop } from "../../utils/haptics";
import { IconButton } from "../IconButton";
import { Text } from "../Text";
import { EvidenceTypePicker } from "../EvidenceTypePicker";
import { EvidenceType } from "../../db";
import type { EvidenceTypeValue } from "../../types/evidence";
import { DraggableStepItem } from "./DraggableStepItem";
import { styles } from "./StepList.styles";

export interface Step {
  id: string;
  title: string;
  completed: boolean;
  plannedEvidenceTypes?: EvidenceTypeValue[] | null;
}

export interface StepListProps {
  steps: Step[];
  onCreateStep?: (
    title: string,
    plannedEvidenceTypes: EvidenceTypeValue[],
  ) => void;
  onUpdateStep?: (
    id: string,
    title: string,
    plannedEvidenceTypes?: EvidenceTypeValue[],
  ) => void;
  onDeleteStep?: (id: string) => void;
  onReorderSteps?: (stepIds: string[]) => void;
}

const ITEM_HEIGHT = 48;

export function StepList({
  steps,
  onCreateStep,
  onUpdateStep,
  onDeleteStep,
  onReorderSteps,
}: StepListProps) {
  const { theme } = useUnistyles();
  const { animationPref } = useAnimationPref();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [editPlannedTypes, setEditPlannedTypes] = useState<EvidenceTypeValue[]>(
    [],
  );
  const editPlannedTypesRef = useRef<EvidenceTypeValue[]>([]);
  const [newStepTitle, setNewStepTitle] = useState("");
  const [newStepTypes, setNewStepTypes] = useState<EvidenceTypeValue[]>([
    EvidenceType.text as EvidenceTypeValue,
  ]);
  const newStepInputRef = useRef<TextInput>(null);

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [screenReaderActive, setScreenReaderActive] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isScreenReaderEnabled()
      .then(setScreenReaderActive)
      .catch(() => {
        // Fail open: show accessible controls if we can't determine screen reader status
        setScreenReaderActive(true);
      });

    const sub = AccessibilityInfo.addEventListener(
      "screenReaderChanged",
      setScreenReaderActive,
    );
    return () => sub.remove();
  }, []);

  const showAccessibleControls = screenReaderActive || animationPref === "none";

  function startEditing(step: Step) {
    if (!onUpdateStep) return;
    const types = step.plannedEvidenceTypes ?? [
      EvidenceType.text as EvidenceTypeValue,
    ];
    setEditingId(step.id);
    setEditText(step.title);
    setEditPlannedTypes(types);
    editPlannedTypesRef.current = types;
  }

  function commitEdit() {
    if (editingId && onUpdateStep) {
      const trimmed = editText.trim();
      const currentStep = steps.find((s) => s.id === editingId);
      // Read from ref to get the latest value, even if onBlur fires before a pending setState
      const latestTypes = editPlannedTypesRef.current;
      const titleChanged = trimmed && trimmed !== currentStep?.title;
      const typesChanged =
        JSON.stringify(latestTypes) !==
        JSON.stringify(currentStep?.plannedEvidenceTypes ?? []);
      if (titleChanged || typesChanged) {
        onUpdateStep(
          editingId,
          trimmed || currentStep?.title || "",
          typesChanged ? latestTypes : undefined,
        );
      }
    }
    setEditingId(null);
    setEditText("");
    setEditPlannedTypes([]);
    editPlannedTypesRef.current = [];
  }

  function toggleEditType(type: EvidenceTypeValue) {
    setEditPlannedTypes((prev) => {
      const next = prev.includes(type)
        ? prev.filter((t) => t !== type)
        : [...prev, type];
      editPlannedTypesRef.current = next;
      return next;
    });
  }

  function toggleNewStepType(type: EvidenceTypeValue) {
    setNewStepTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
    );
  }

  function handleNewStepSubmit() {
    const trimmed = newStepTitle.trim();
    if (trimmed && onCreateStep) {
      const types =
        newStepTypes.length > 0
          ? newStepTypes
          : [EvidenceType.text as EvidenceTypeValue];
      onCreateStep(trimmed, types);
      setNewStepTitle("");
      setNewStepTypes([EvidenceType.text as EvidenceTypeValue]);
    }
  }

  function handleDragStart(index: number) {
    setDraggedIndex(index);
    setHoverIndex(index);
    triggerDragStart();
  }

  function handleDragMove(translationY: number) {
    if (draggedIndex === null) return;
    const offset = Math.round(translationY / ITEM_HEIGHT);
    const newIndex = Math.max(
      0,
      Math.min(steps.length - 1, draggedIndex + offset),
    );
    setHoverIndex(newIndex);
  }

  function handleDragEnd() {
    if (
      draggedIndex !== null &&
      hoverIndex !== null &&
      draggedIndex !== hoverIndex &&
      onReorderSteps
    ) {
      const newOrder = [...steps];
      const [moved] = newOrder.splice(draggedIndex, 1);
      newOrder.splice(hoverIndex, 0, moved);
      onReorderSteps(newOrder.map((s) => s.id));
      triggerDragDrop();
      AccessibilityInfo.announceForAccessibility(
        `Step moved from position ${draggedIndex + 1} to ${hoverIndex + 1}`,
      );
    }
    setDraggedIndex(null);
    setHoverIndex(null);
  }

  function handleMoveUp(index: number) {
    if (index <= 0 || !onReorderSteps) return;
    const newOrder = [...steps];
    [newOrder[index - 1], newOrder[index]] = [
      newOrder[index],
      newOrder[index - 1],
    ];
    onReorderSteps(newOrder.map((s) => s.id));
    triggerDragDrop();
    AccessibilityInfo.announceForAccessibility(
      `Step "${steps[index].title}" moved up to position ${index}`,
    );
  }

  function handleMoveDown(index: number) {
    if (index >= steps.length - 1 || !onReorderSteps) return;
    const newOrder = [...steps];
    [newOrder[index], newOrder[index + 1]] = [
      newOrder[index + 1],
      newOrder[index],
    ];
    onReorderSteps(newOrder.map((s) => s.id));
    triggerDragDrop();
    AccessibilityInfo.announceForAccessibility(
      `Step "${steps[index].title}" moved down to position ${index + 2}`,
    );
  }

  const canDrag = onReorderSteps && steps.length > 1 && editingId === null;
  const stepCountLabel = `${steps.length} step${steps.length !== 1 ? "s" : ""}`;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <RNText style={styles.headerLabel} accessibilityRole="header">
          Steps
        </RNText>
        <RNText style={styles.count} accessibilityLabel={stepCountLabel}>
          {stepCountLabel}
        </RNText>
      </View>

      <GestureHandlerRootView style={styles.stepItems}>
        {steps.map((step, index) => {
          const editContent =
            editingId === step.id ? (
              <View>
                <View style={styles.editRow}>
                  <RNText
                    style={styles.dragHandle}
                    accessibilityElementsHidden
                    importantForAccessibility="no"
                  >
                    ≡
                  </RNText>
                  <TextInput
                    style={styles.editInput}
                    value={editText}
                    onChangeText={setEditText}
                    onSubmitEditing={commitEdit}
                    onBlur={commitEdit}
                    autoFocus
                    returnKeyType="done"
                    placeholderTextColor={theme.colors.textMuted}
                    selectTextOnFocus
                    accessibilityLabel={`Edit step: ${step.title}`}
                  />
                  {onDeleteStep && (
                    <IconButton
                      icon={<Text variant="body">✕</Text>}
                      onPress={() => onDeleteStep(step.id)}
                      size="sm"
                      tone="ghost"
                      accessibilityLabel={`Delete "${step.title}"`}
                    />
                  )}
                </View>
                <View style={styles.evidencePickerRow}>
                  <EvidenceTypePicker
                    selectedTypes={editPlannedTypes}
                    onToggleType={toggleEditType}
                    label="Evidence types"
                  />
                </View>
              </View>
            ) : null;

          if (canDrag) {
            return (
              <DraggableStepItem
                key={step.id}
                step={step}
                index={index}
                isBeingDragged={draggedIndex === index}
                onLabelPress={onUpdateStep ? startEditing : undefined}
                onDeleteStep={
                  onDeleteStep ? () => onDeleteStep(step.id) : undefined
                }
                onDragStart={handleDragStart}
                onDragMove={handleDragMove}
                onDragEnd={handleDragEnd}
                onMoveUp={() => handleMoveUp(index)}
                onMoveDown={() => handleMoveDown(index)}
                showAccessibleControls={showAccessibleControls}
                animationPref={animationPref}
                isFirst={index === 0}
                isLast={index === steps.length - 1}
                editContent={editContent}
              />
            );
          }

          return (
            <View key={step.id} style={styles.draggableItem}>
              {editingId === step.id ? (
                editContent
              ) : (
                <View>
                  <View style={styles.stepRow}>
                    <RNText
                      style={styles.dragHandle}
                      accessibilityElementsHidden
                      importantForAccessibility="no"
                    >
                      ≡
                    </RNText>
                    <Pressable
                      style={styles.stepContent}
                      onPress={
                        onUpdateStep ? () => startEditing(step) : undefined
                      }
                      accessibilityRole="button"
                      accessibilityLabel={step.title}
                      accessibilityHint={
                        onUpdateStep ? "Tap to edit step title" : undefined
                      }
                    >
                      <RNText style={styles.stepTitleText}>{step.title}</RNText>
                    </Pressable>
                    {onDeleteStep && (
                      <IconButton
                        icon={<Text variant="body">✕</Text>}
                        onPress={() => onDeleteStep(step.id)}
                        size="sm"
                        tone="ghost"
                        accessibilityLabel={`Delete "${step.title}"`}
                      />
                    )}
                  </View>
                  {step.plannedEvidenceTypes &&
                    step.plannedEvidenceTypes.length > 0 && (
                      <View style={styles.evidenceIconsRow}>
                        <EvidenceTypePicker
                          selectedTypes={step.plannedEvidenceTypes}
                          compact
                        />
                      </View>
                    )}
                </View>
              )}
            </View>
          );
        })}
      </GestureHandlerRootView>

      {onCreateStep && (
        <View style={styles.addStepSection}>
          <View style={styles.addStepRow}>
            <View style={styles.addStepInputCard}>
              <TextInput
                ref={newStepInputRef}
                style={styles.addStepInput}
                placeholder="Add step..."
                placeholderTextColor={theme.colors.textMuted}
                value={newStepTitle}
                onChangeText={setNewStepTitle}
                onSubmitEditing={handleNewStepSubmit}
                returnKeyType="done"
                blurOnSubmit={false}
                testID="step-list-new-step-input"
                accessibilityLabel="Add a new step"
                accessibilityHint="Type a step title and press return to add"
              />
            </View>
            <Pressable
              style={styles.addStepButton}
              onPress={handleNewStepSubmit}
              testID="step-list-add-step-button"
              accessibilityRole="button"
              accessibilityLabel="Add step"
            >
              <RNText style={styles.addStepButtonText}>+</RNText>
            </Pressable>
          </View>
          <EvidenceTypePicker
            selectedTypes={newStepTypes}
            onToggleType={toggleNewStepType}
            label="Evidence types for new step"
          />
        </View>
      )}
    </View>
  );
}
