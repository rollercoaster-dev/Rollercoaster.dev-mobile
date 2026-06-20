import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text as RNText,
  TextInput,
  Pressable,
  AccessibilityInfo,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useTranslation } from "react-i18next";
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
  // One-level hierarchy: null/undefined = top-level step, set = sub-step
  // whose parent is the referenced top-level step. The caller passes a flat
  // list already in render order (parent immediately followed by its
  // children) — StepList does not group internally.
  parentStepId?: string | null;
}

export interface StepListProps {
  steps: Step[];
  onCreateStep?: (
    title: string,
    plannedEvidenceTypes: EvidenceTypeValue[],
  ) => void;
  onCreateSubStep?: (
    parentStepId: string,
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
  onCreateSubStep,
  onUpdateStep,
  onDeleteStep,
  onReorderSteps,
}: StepListProps) {
  const { theme } = useUnistyles();
  const { t } = useTranslation(["editGoal"]);
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

  // Inline "add sub-step" state: which parent's ghost row is expanded into an
  // input, plus the draft title/types for that pending sub-step.
  const [addingSubStepForId, setAddingSubStepForId] = useState<string | null>(
    null,
  );
  const [subStepTitle, setSubStepTitle] = useState("");
  const [subStepTypes, setSubStepTypes] = useState<EvidenceTypeValue[]>([
    EvidenceType.text as EvidenceTypeValue,
  ]);

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

  function startAddingSubStep(parentStepId: string) {
    setAddingSubStepForId(parentStepId);
    setSubStepTitle("");
    setSubStepTypes([EvidenceType.text as EvidenceTypeValue]);
  }

  function toggleSubStepType(type: EvidenceTypeValue) {
    setSubStepTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
    );
  }

  function handleSubStepSubmit(parentStepId: string) {
    const trimmed = subStepTitle.trim();
    if (trimmed && onCreateSubStep) {
      const types =
        subStepTypes.length > 0
          ? subStepTypes
          : [EvidenceType.text as EvidenceTypeValue];
      onCreateSubStep(parentStepId, trimmed, types);
    }
    setAddingSubStepForId(null);
    setSubStepTitle("");
    setSubStepTypes([EvidenceType.text as EvidenceTypeValue]);
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
        t("editGoal:stepList.a11y.movedFromTo", {
          from: draggedIndex + 1,
          to: hoverIndex + 1,
        }),
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
      t("editGoal:stepList.a11y.movedUp", {
        title: steps[index].title,
        position: index,
      }),
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
      t("editGoal:stepList.a11y.movedDown", {
        title: steps[index].title,
        position: index + 2,
      }),
    );
  }

  // The current drag handler reorders the whole flat list, which would corrupt
  // sibling-scoped ordinals once children are interleaved. Disable drag while
  // any sub-step is present until the reparent-aware gesture lands (D8).
  const hasSubSteps = steps.some((s) => s.parentStepId != null);
  const canDrag =
    onReorderSteps && steps.length > 1 && editingId === null && !hasSubSteps;
  const stepCountLabel = t("editGoal:stepList.count", { count: steps.length });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <RNText style={styles.headerLabel} accessibilityRole="header">
          {t("editGoal:stepList.header")}
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
                    accessibilityLabel={t("editGoal:stepList.editA11yLabel", {
                      title: step.title,
                    })}
                  />
                  {onDeleteStep && (
                    <IconButton
                      icon={<Text variant="body">✕</Text>}
                      onPress={() => onDeleteStep(step.id)}
                      size="sm"
                      tone="ghost"
                      accessibilityLabel={t(
                        "editGoal:stepList.deleteA11yLabel",
                        {
                          title: step.title,
                        },
                      )}
                    />
                  )}
                </View>
                <View style={styles.evidencePickerRow}>
                  <EvidenceTypePicker
                    selectedTypes={editPlannedTypes}
                    onToggleType={toggleEditType}
                    label={t("editGoal:stepList.evidenceTypesLabel")}
                  />
                </View>
              </View>
            ) : null;

          const isChild = step.parentStepId != null;

          const itemNode = canDrag ? (
            <DraggableStepItem
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
          ) : (
            <View style={styles.draggableItem}>
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
                        onUpdateStep
                          ? t("editGoal:stepList.tapToEditHint")
                          : undefined
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
                        accessibilityLabel={t(
                          "editGoal:stepList.deleteA11yLabel",
                          {
                            title: step.title,
                          },
                        )}
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

          // Indent child rows behind a thick vertical left rail so the
          // parent→child relationship reads without colour alone (D11).
          const rowNode = isChild ? (
            <View style={styles.childRowWrapper}>
              <View
                style={styles.leftRail}
                accessibilityElementsHidden
                importantForAccessibility="no"
              />
              <View style={styles.childRowContent}>{itemNode}</View>
            </View>
          ) : (
            itemNode
          );

          // "Add sub-step" affordance: top-level steps only (one-level depth
          // guard, D6) and not while this row is being edited — don't stack
          // the ghost row with the inline edit input.
          const showSubStepAffordance =
            !isChild && !!onCreateSubStep && editingId !== step.id;

          return (
            <View key={step.id}>
              {rowNode}
              {showSubStepAffordance &&
                (addingSubStepForId === step.id ? (
                  <View>
                    <View style={styles.addSubStepInputRow}>
                      <View style={styles.addSubStepInputCard}>
                        <TextInput
                          style={styles.addSubStepInput}
                          placeholder={t("editGoal:stepList.addSubStepLabel")}
                          placeholderTextColor={theme.colors.textMuted}
                          value={subStepTitle}
                          onChangeText={setSubStepTitle}
                          onSubmitEditing={() => handleSubStepSubmit(step.id)}
                          onBlur={() => handleSubStepSubmit(step.id)}
                          autoFocus
                          returnKeyType="done"
                          testID={`step-list-sub-step-input-${step.id}`}
                          accessibilityLabel={t(
                            "editGoal:stepList.addSubStepInputA11yLabel",
                            { title: step.title },
                          )}
                        />
                      </View>
                    </View>
                    <View style={styles.addSubStepPickerRow}>
                      <EvidenceTypePicker
                        selectedTypes={subStepTypes}
                        onToggleType={toggleSubStepType}
                        label={t(
                          "editGoal:stepList.evidenceTypesForNewStepLabel",
                        )}
                      />
                    </View>
                  </View>
                ) : (
                  <Pressable
                    style={styles.addSubStepGhost}
                    onPress={() => startAddingSubStep(step.id)}
                    testID={`step-list-add-sub-step-${step.id}`}
                    accessibilityRole="button"
                    accessibilityLabel={t(
                      "editGoal:stepList.addSubStepA11yLabel",
                      { title: step.title },
                    )}
                    accessibilityHint={t(
                      "editGoal:stepList.addSubStepA11yHint",
                    )}
                  >
                    <RNText style={styles.addSubStepText}>
                      {`+ ${t("editGoal:stepList.addSubStepLabel")}`}
                    </RNText>
                  </Pressable>
                ))}
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
                placeholder={t("editGoal:stepList.addPlaceholder")}
                placeholderTextColor={theme.colors.textMuted}
                value={newStepTitle}
                onChangeText={setNewStepTitle}
                onSubmitEditing={handleNewStepSubmit}
                returnKeyType="done"
                blurOnSubmit={false}
                testID="step-list-new-step-input"
                accessibilityLabel={t("editGoal:stepList.addA11yLabel")}
                accessibilityHint={t("editGoal:stepList.addA11yHint")}
              />
            </View>
            <Pressable
              style={styles.addStepButton}
              onPress={handleNewStepSubmit}
              testID="step-list-add-step-button"
              accessibilityRole="button"
              accessibilityLabel={t("editGoal:stepList.addButtonA11y")}
            >
              <RNText style={styles.addStepButtonText}>+</RNText>
            </Pressable>
          </View>
          <EvidenceTypePicker
            selectedTypes={newStepTypes}
            onToggleType={toggleNewStepType}
            label={t("editGoal:stepList.evidenceTypesForNewStepLabel")}
          />
        </View>
      )}
    </View>
  );
}
