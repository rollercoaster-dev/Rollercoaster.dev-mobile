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
import { classifyDrop } from "./classifyDrop";
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
  onReorderSubSteps?: (parentStepId: string, childStepIds: string[]) => void;
  onReparentStep?: (stepId: string, newParentStepId: string | null) => void;
}

const ITEM_HEIGHT = 48;
// Dwell duration before a hovered childless-root target arms for demote (D14,
// Q3). A named module constant so it can be tuned on device without hunting
// through the gesture code; not a theme token (it's timing, not styling).
const DWELL_ARM_MS = 220;

export function StepList({
  steps,
  onCreateStep,
  onCreateSubStep,
  onUpdateStep,
  onDeleteStep,
  onReorderSteps,
  onReorderSubSteps,
  onReparentStep,
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
  // Identity of the childless-root target currently armed by dwell (D15), and
  // whether a drag is in progress (used to hide the +sub-step ghost rows).
  const [armedTargetId, setArmedTargetId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dwellTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Last hovered row id — change-detection that survives async setState so the
  // dwell timer is only (re)started when the hovered row actually changes.
  const hoverStepIdRef = useRef<string | null>(null);
  const [screenReaderActive, setScreenReaderActive] = useState(false);

  useEffect(() => {
    return () => {
      if (dwellTimer.current) clearTimeout(dwellTimer.current);
    };
  }, []);

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

  function hasChildren(id: string) {
    return steps.some((s) => s.parentStepId === id);
  }

  function handleDragStart(index: number) {
    setDraggedIndex(index);
    setHoverIndex(index);
    setIsDragging(true);
    hoverStepIdRef.current = steps[index]?.id ?? null;
    if (dwellTimer.current) clearTimeout(dwellTimer.current);
    setArmedTargetId(null);
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

    // Only react to a genuine change of hovered row. Restarting the dwell
    // timer on every pan frame would mean it never fires.
    const hovered = steps[newIndex];
    const hoveredId = hovered?.id ?? null;
    if (hoveredId === hoverStepIdRef.current) return;
    hoverStepIdRef.current = hoveredId;

    // Any move to a new row disarms immediately (no unintended demote).
    if (dwellTimer.current) clearTimeout(dwellTimer.current);
    setArmedTargetId(null);

    // Arm only when a release here would actually nest: target is a childless
    // root, distinct from the dragged leaf, and the dragged step is itself a
    // leaf (mirrors classifyDrop's dwell rule so the highlight never lies).
    const dragged = steps[draggedIndex];
    const armable =
      !!hovered &&
      !!dragged &&
      hovered.id !== dragged.id &&
      hovered.parentStepId == null &&
      !hasChildren(hovered.id) &&
      !hasChildren(dragged.id);
    if (armable) {
      dwellTimer.current = setTimeout(
        () => setArmedTargetId(hovered.id),
        DWELL_ARM_MS,
      );
    }
  }

  function handleDragEnd() {
    if (dwellTimer.current) clearTimeout(dwellTimer.current);

    if (draggedIndex !== null && hoverIndex !== null) {
      const result = classifyDrop(
        steps,
        draggedIndex,
        hoverIndex,
        armedTargetId,
      );
      switch (result.kind) {
        case "reorder":
          if (result.parentStepId === null) {
            onReorderSteps?.(result.orderedIds);
          } else {
            onReorderSubSteps?.(result.parentStepId, result.orderedIds);
          }
          break;
        case "reparent":
          onReparentStep?.(result.stepId, result.newParentStepId);
          break;
        case "none":
          break;
      }
      if (result.kind !== "none") {
        triggerDragDrop();
        AccessibilityInfo.announceForAccessibility(
          t("editGoal:stepList.a11y.movedFromTo", {
            from: draggedIndex + 1,
            to: hoverIndex + 1,
          }),
        );
      }
    }

    setDraggedIndex(null);
    setHoverIndex(null);
    setIsDragging(false);
    setArmedTargetId(null);
    hoverStepIdRef.current = null;
  }

  // ↑/↓ are sibling-reorder only — they never change nesting level (Q2, WCAG
  // 3.2 predictability). Reorder within the step's own sibling group; at a
  // group boundary the move is a no-op (reparenting is the nest/un-nest job).
  function moveWithinSiblingGroup(index: number, direction: 1 | -1) {
    const step = steps[index];
    if (!step) return null;
    const parent = step.parentStepId ?? null;
    const group = steps.filter((s) => (s.parentStepId ?? null) === parent);
    const pos = group.findIndex((s) => s.id === step.id);
    const swapWith = pos + direction;
    if (swapWith < 0 || swapWith >= group.length) return null;
    const reordered = [...group];
    [reordered[pos], reordered[swapWith]] = [
      reordered[swapWith],
      reordered[pos],
    ];
    const ids = reordered.map((s) => s.id);
    if (parent === null) {
      onReorderSteps?.(ids);
    } else {
      onReorderSubSteps?.(parent, ids);
    }
    triggerDragDrop();
    return swapWith;
  }

  function handleMoveUp(index: number) {
    if (!onReorderSteps) return;
    const newPos = moveWithinSiblingGroup(index, -1);
    if (newPos === null) return;
    AccessibilityInfo.announceForAccessibility(
      t("editGoal:stepList.a11y.movedUp", {
        title: steps[index].title,
        position: newPos + 1,
      }),
    );
  }

  function handleMoveDown(index: number) {
    if (!onReorderSteps) return;
    const newPos = moveWithinSiblingGroup(index, 1);
    if (newPos === null) return;
    AccessibilityInfo.announceForAccessibility(
      t("editGoal:stepList.a11y.movedDown", {
        title: steps[index].title,
        position: newPos + 1,
      }),
    );
  }

  const canDrag = onReorderSteps && steps.length > 1 && editingId === null;
  // Childless roots are the only eligible nest-under targets (mirror
  // classifyDrop's dwell rule so the screen-reader picker and drag agree).
  const childlessRootTargets = steps
    .filter((s) => s.parentStepId == null && !hasChildren(s.id))
    .map((s) => ({ id: s.id, title: s.title }));
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

          const stepHasChildren = hasChildren(step.id);
          const nestTargets = childlessRootTargets.filter(
            (target) => target.id !== step.id,
          );
          const canNestUnder =
            !isChild && !stepHasChildren && nestTargets.length > 0;

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
              isArmedTarget={armedTargetId === step.id}
              canNestUnder={canNestUnder}
              nestTargets={nestTargets}
              onNestUnder={
                onReparentStep
                  ? (targetId) => onReparentStep(step.id, targetId)
                  : undefined
              }
              canUnNest={isChild}
              onUnNest={
                onReparentStep ? () => onReparentStep(step.id, null) : undefined
              }
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

          // "Add sub-step" affordance: render it after the LAST node of a
          // parent's group (parent + its children) so it sits *below* all
          // existing sub-steps, reading as "add another here" rather than a
          // group header. The flat list is parent-then-children, so a step is
          // the last in its group when the next step belongs to a different
          // group (or there is no next step). The owning parent is the group's
          // top-level ancestor. One-level depth guard (D6) still holds: groupId
          // always resolves to a top-level step id.
          const groupId = step.parentStepId ?? step.id;
          const nextStep = steps[index + 1];
          const isLastInGroup =
            !nextStep || (nextStep.parentStepId ?? nextStep.id) !== groupId;
          const affordanceParent =
            isLastInGroup && onCreateSubStep
              ? steps.find((s) => s.id === groupId)
              : undefined;
          // Don't stack the ghost row with the parent's inline edit input, and
          // hide it entirely mid-drag so it doesn't read as a drop target.
          const showSubStepAffordance =
            !!affordanceParent &&
            editingId !== affordanceParent.id &&
            !isDragging;

          return (
            <View key={step.id}>
              {rowNode}
              {showSubStepAffordance &&
                (addingSubStepForId === affordanceParent.id ? (
                  <View>
                    <View style={styles.addSubStepInputRow}>
                      <View style={styles.addSubStepInputCard}>
                        <TextInput
                          style={styles.addSubStepInput}
                          placeholder={t("editGoal:stepList.addSubStepLabel")}
                          placeholderTextColor={theme.colors.textMuted}
                          value={subStepTitle}
                          onChangeText={setSubStepTitle}
                          onSubmitEditing={() =>
                            handleSubStepSubmit(affordanceParent.id)
                          }
                          autoFocus
                          returnKeyType="done"
                          blurOnSubmit={false}
                          testID={`step-list-sub-step-input-${affordanceParent.id}`}
                          accessibilityLabel={t(
                            "editGoal:stepList.addSubStepInputA11yLabel",
                            { title: affordanceParent.title },
                          )}
                        />
                      </View>
                      <Pressable
                        style={styles.addStepButton}
                        onPress={() => handleSubStepSubmit(affordanceParent.id)}
                        testID={`step-list-add-sub-step-button-${affordanceParent.id}`}
                        accessibilityRole="button"
                        accessibilityLabel={t(
                          "editGoal:stepList.addSubStepButtonA11y",
                          { title: affordanceParent.title },
                        )}
                      >
                        <RNText style={styles.addStepButtonText}>+</RNText>
                      </Pressable>
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
                    onPress={() => startAddingSubStep(affordanceParent.id)}
                    testID={`step-list-add-sub-step-${affordanceParent.id}`}
                    accessibilityRole="button"
                    accessibilityLabel={t(
                      "editGoal:stepList.addSubStepA11yLabel",
                      { title: affordanceParent.title },
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

      {/* Only one create/edit context is active at a time: hide the
          top-level "add step" row (and its evidence picker) while a step is
          being edited or a sub-step is being created, so the evidence pickers
          are never doubled. */}
      {onCreateStep && editingId === null && addingSubStepForId === null && (
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
