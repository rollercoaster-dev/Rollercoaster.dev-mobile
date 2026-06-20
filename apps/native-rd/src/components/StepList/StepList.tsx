import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text as RNText,
  TextInput,
  Pressable,
  AccessibilityInfo,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useSharedValue } from "react-native-reanimated";
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
import {
  clampScrollOffset,
  getAutoScrollVelocity,
  getEffectiveTranslationY,
  type DragScrollController,
} from "./dragAutoScroll";
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
  dragScrollController?: DragScrollController;
  onDragStateChange?: (isDragging: boolean) => void;
}

const ITEM_HEIGHT = 48;
// Dwell duration before a hovered root target arms for demote (D14,
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
  dragScrollController,
  onDragStateChange,
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
  // Active gesture callbacks may retain the render from before long-press
  // state updates. Refs are the authoritative indices for gesture decisions;
  // state mirrors them only to drive rendering.
  const draggedIndexRef = useRef<number | null>(null);
  const hoverIndexRef = useRef<number | null>(null);
  // Identity of the root target currently armed by dwell (D15), and
  // whether a drag is in progress (used to hide the +sub-step ghost rows).
  const [armedTargetId, setArmedTargetId] = useState<string | null>(null);
  // Gesture callbacks can outlive the render that created them. Keep the live
  // armed identity in a ref so pan updates disarm immediately and drag-end
  // dispatches the target that was actually shown to the user.
  const armedTargetIdRef = useRef<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  // Reorder insertion indicator: the pixel y of the landing boundary and
  // whether the landing level is nested. Computed in the drag handler from
  // measured geometry (rowLayoutsRef) so it tracks the real drop, not a guess —
  // pre-resolved to a number here so render never touches the ref.
  const [dropSlot, setDropSlot] = useState<{ top: number } | null>(null);
  // Nested destinations use a full dashed outline rather than the compact
  // insertion line, making the destination substep visible beneath the
  // translated dragged card.
  const [nestedDropOutline, setNestedDropOutline] = useState<{
    top: number;
    height: number;
  } | null>(null);
  // Parent steps drag as a block with their children. Outline the complete
  // destination group so the block-level reorder is explicit.
  const [groupDropOutline, setGroupDropOutline] = useState<{
    top: number;
    height: number;
  } | null>(null);
  // Measured vertical position + height of each rendered row, keyed by index,
  // captured via onLayout. The drag's landing slot is computed from these real
  // pixel bands instead of a fixed ITEM_HEIGHT, which drifts for variable-height
  // rows (evidence icons, wrapped titles, indented children) and made drops
  // land unpredictably.
  const rowLayoutsRef = useRef<({ y: number; height: number } | undefined)[]>(
    [],
  );
  const dwellTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastDragTranslationYRef = useRef(0);
  const lastDragAbsoluteYRef = useRef<number | null>(null);
  const dragStartScrollOffsetRef = useRef(0);
  const autoScrollFrameRef = useRef<number | null>(null);
  const dragScrollCompensation = useSharedValue(0);
  // Last hovered row id — change-detection that survives async setState so the
  // dwell timer is only (re)started when the hovered row actually changes.
  const hoverStepIdRef = useRef<string | null>(null);
  const hoverInDwellZoneRef = useRef(false);
  const [screenReaderActive, setScreenReaderActive] = useState(false);

  useEffect(() => {
    return () => {
      if (dwellTimer.current) clearTimeout(dwellTimer.current);
      if (autoScrollFrameRef.current !== null) {
        cancelAnimationFrame(autoScrollFrameRef.current);
      }
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

  function stopAutoScroll() {
    if (autoScrollFrameRef.current !== null) {
      cancelAnimationFrame(autoScrollFrameRef.current);
      autoScrollFrameRef.current = null;
    }
  }

  function handleDragStart(index: number) {
    draggedIndexRef.current = index;
    hoverIndexRef.current = index;
    setDraggedIndex(index);
    setIsDragging(true);
    setDropSlot(null);
    setNestedDropOutline(null);
    setGroupDropOutline(null);
    lastDragTranslationYRef.current = 0;
    lastDragAbsoluteYRef.current = null;
    dragStartScrollOffsetRef.current =
      dragScrollController?.getMetrics().offsetY ?? 0;
    dragScrollCompensation.value = 0;
    hoverStepIdRef.current = steps[index]?.id ?? null;
    hoverInDwellZoneRef.current = false;
    if (dwellTimer.current) clearTimeout(dwellTimer.current);
    armedTargetIdRef.current = null;
    setArmedTargetId(null);
    onDragStateChange?.(true);
    triggerDragStart();
  }

  // Which row's measured vertical band contains the given y. Falls back to the
  // fixed-height estimate only when a row hasn't reported its layout yet.
  function rowIndexAtY(centerY: number, draggedFrom: number): number {
    const layouts = rowLayoutsRef.current;
    for (let i = 0; i < steps.length; i++) {
      const l = layouts[i];
      if (!l) continue;
      if (centerY < l.y + l.height) return i;
    }
    if (layouts.some(Boolean)) return steps.length - 1;
    // No geometry at all — fall back to the (imprecise) fixed-height estimate.
    return draggedFrom;
  }

  function updateDragHover(translationY: number) {
    const activeDraggedIndex = draggedIndexRef.current;
    if (activeDraggedIndex === null) return;

    const draggedLayout = rowLayoutsRef.current[activeDraggedIndex];
    let dragCenterY: number | null = null;
    let newIndex: number;
    if (draggedLayout) {
      // Live centre of the dragged row = its resting top + how far it's moved.
      dragCenterY = draggedLayout.y + translationY + draggedLayout.height / 2;
      newIndex = rowIndexAtY(dragCenterY, activeDraggedIndex);
    } else {
      const offset = Math.round(translationY / ITEM_HEIGHT);
      newIndex = activeDraggedIndex + offset;
    }
    newIndex = Math.max(0, Math.min(steps.length - 1, newIndex));
    hoverIndexRef.current = newIndex;

    // Reorder insertion line: preview the actual drop so the indicator never
    // promises a landing the classifier would refuse. Suppressed when a nest
    // target is armed (that gets the dashed outline instead).
    const slotLayout = rowLayoutsRef.current[newIndex];
    const hovered = steps[newIndex];
    if (newIndex === activeDraggedIndex || !slotLayout) {
      setDropSlot(null);
      setNestedDropOutline(null);
      setGroupDropOutline(null);
    } else {
      const preview = classifyDrop(steps, activeDraggedIndex, newIndex, null);
      if (preview.kind === "none") {
        setDropSlot(null);
        setNestedDropOutline(null);
        setGroupDropOutline(null);
      } else {
        const indent =
          preview.kind === "reparent"
            ? preview.newParentStepId !== null
            : preview.parentStepId !== null;
        const dragged = steps[activeDraggedIndex];
        const targetRootId = hovered?.parentStepId ?? hovered?.id;
        const isGroupReorder =
          !!dragged &&
          hasChildren(dragged.id) &&
          preview.kind === "reorder" &&
          preview.parentStepId === null &&
          !!targetRootId &&
          targetRootId !== dragged.id;

        let groupOutline: { top: number; height: number } | null = null;
        if (isGroupReorder) {
          const groupStartIndex = steps.findIndex(
            (step) => step.id === targetRootId,
          );
          let groupEndIndex = groupStartIndex;
          while (
            groupEndIndex + 1 < steps.length &&
            steps[groupEndIndex + 1].parentStepId === targetRootId
          ) {
            groupEndIndex++;
          }
          const groupStart = rowLayoutsRef.current[groupStartIndex];
          const groupEnd = rowLayoutsRef.current[groupEndIndex];
          if (groupStart && groupEnd) {
            groupOutline = {
              top: groupStart.y,
              height: groupEnd.y + groupEnd.height - groupStart.y,
            };
          }
        }

        if (groupOutline) {
          setDropSlot(null);
          setNestedDropOutline(null);
          setGroupDropOutline((prev) =>
            prev?.top === groupOutline.top &&
            prev.height === groupOutline.height
              ? prev
              : groupOutline,
          );
        } else if (indent) {
          setDropSlot(null);
          setGroupDropOutline(null);
          setNestedDropOutline((prev) =>
            prev &&
            prev.top === slotLayout.y &&
            prev.height === slotLayout.height
              ? prev
              : { top: slotLayout.y, height: slotLayout.height },
          );
        } else {
          setNestedDropOutline(null);
          setGroupDropOutline(null);
          // Below the row when dragging down, above it when dragging up; -1 so
          // the bar straddles the boundary rather than sitting just past it.
          const top =
            (newIndex > activeDraggedIndex
              ? slotLayout.y + slotLayout.height
              : slotLayout.y) - 1;
          setDropSlot((prev) => (prev?.top === top ? prev : { top }));
        }
      }
    }

    // Only react to a genuine change of hovered row. Restarting the dwell
    // timer on every pan frame would mean it never fires.
    const hoveredId = hovered?.id ?? null;
    const hoveredLayout = rowLayoutsRef.current[newIndex];
    const inDwellZone =
      dragCenterY !== null &&
      hoveredLayout !== undefined &&
      dragCenterY >= hoveredLayout.y &&
      dragCenterY <= hoveredLayout.y + hoveredLayout.height;
    if (
      hoveredId === hoverStepIdRef.current &&
      inDwellZone === hoverInDwellZoneRef.current
    ) {
      return;
    }
    hoverStepIdRef.current = hoveredId;
    hoverInDwellZoneRef.current = inDwellZone;

    // Leaving the measured row disarms immediately. Movement within its bounds
    // keeps the target armed, while the gaps above/below remain unambiguous
    // before/after insertion targets.
    if (dwellTimer.current) clearTimeout(dwellTimer.current);
    armedTargetIdRef.current = null;
    setArmedTargetId(null);

    // Arm only when a release here would actually nest: target is a root,
    // distinct from the dragged leaf, and the dragged step is itself a leaf
    // (mirrors classifyDrop's dwell rule so the highlight never lies).
    const dragged = steps[activeDraggedIndex];
    const armable =
      !!hovered &&
      !!dragged &&
      hovered.id !== dragged.id &&
      hovered.parentStepId == null &&
      inDwellZone &&
      !hasChildren(dragged.id);
    if (armable) {
      dwellTimer.current = setTimeout(() => {
        dwellTimer.current = null;
        // The drag may have ended while this timer was pending. Arming now would
        // leave a dashed target border stuck on the row at rest, since handleDragEnd
        // has already cleared armedTargetId. Bail if no drag is active.
        if (draggedIndexRef.current === null) return;
        armedTargetIdRef.current = hovered.id;
        setArmedTargetId(hovered.id);
      }, DWELL_ARM_MS);
    }
  }

  function runAutoScrollFrame() {
    autoScrollFrameRef.current = null;
    const pointerY = lastDragAbsoluteYRef.current;
    if (!dragScrollController || pointerY === null) return;

    const metrics = dragScrollController.getMetrics();
    const velocity = getAutoScrollVelocity(pointerY, metrics);
    if (velocity === 0) return;

    const nextOffset = clampScrollOffset(metrics.offsetY + velocity, metrics);
    if (nextOffset === metrics.offsetY) return;

    dragScrollController.scrollTo(nextOffset);
    const scrollDelta = nextOffset - dragStartScrollOffsetRef.current;
    dragScrollCompensation.value = scrollDelta;
    updateDragHover(
      getEffectiveTranslationY(
        lastDragTranslationYRef.current,
        nextOffset,
        dragStartScrollOffsetRef.current,
      ),
    );
    autoScrollFrameRef.current = requestAnimationFrame(runAutoScrollFrame);
  }

  function syncAutoScroll() {
    const pointerY = lastDragAbsoluteYRef.current;
    if (!dragScrollController || pointerY === null) {
      stopAutoScroll();
      return;
    }

    const velocity = getAutoScrollVelocity(
      pointerY,
      dragScrollController.getMetrics(),
    );
    if (velocity === 0) {
      stopAutoScroll();
    } else if (autoScrollFrameRef.current === null) {
      autoScrollFrameRef.current = requestAnimationFrame(runAutoScrollFrame);
    }
  }

  function handleDragMove(translationY: number, absoluteY: number) {
    lastDragTranslationYRef.current = translationY;
    lastDragAbsoluteYRef.current = absoluteY;
    const currentScrollY =
      dragScrollController?.getMetrics().offsetY ??
      dragStartScrollOffsetRef.current;
    dragScrollCompensation.value =
      currentScrollY - dragStartScrollOffsetRef.current;
    updateDragHover(
      getEffectiveTranslationY(
        translationY,
        currentScrollY,
        dragStartScrollOffsetRef.current,
      ),
    );
    syncAutoScroll();
  }

  function handleDragEnd() {
    stopAutoScroll();
    if (dwellTimer.current) {
      clearTimeout(dwellTimer.current);
      dwellTimer.current = null;
    }

    const activeDraggedIndex = draggedIndexRef.current;
    const activeHoverIndex = hoverIndexRef.current;

    if (activeDraggedIndex !== null && activeHoverIndex !== null) {
      const result = classifyDrop(
        steps,
        activeDraggedIndex,
        activeHoverIndex,
        armedTargetIdRef.current,
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
            from: activeDraggedIndex + 1,
            to: activeHoverIndex + 1,
          }),
        );
      }
    }

    draggedIndexRef.current = null;
    hoverIndexRef.current = null;
    setDraggedIndex(null);
    setIsDragging(false);
    armedTargetIdRef.current = null;
    setArmedTargetId(null);
    setDropSlot(null);
    setNestedDropOutline(null);
    setGroupDropOutline(null);
    lastDragAbsoluteYRef.current = null;
    dragScrollCompensation.value = 0;
    hoverStepIdRef.current = null;
    hoverInDwellZoneRef.current = false;
    onDragStateChange?.(false);
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
  // Any root is an eligible nest-under target (mirror classifyDrop's dwell
  // rule so the screen-reader picker and drag agree).
  const rootTargets = steps
    .filter((s) => s.parentStepId == null)
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
          const nestTargets = rootTargets.filter(
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
              dragScrollCompensation={
                draggedIndex === index ? dragScrollCompensation : undefined
              }
              onMoveUp={() => handleMoveUp(index)}
              onMoveDown={() => handleMoveDown(index)}
              showAccessibleControls={showAccessibleControls}
              animationPref={animationPref}
              isFirst={index === 0}
              isLast={index === steps.length - 1}
              editContent={editContent}
              // Gate on isDragging so the dashed "drop here to nest" border is
              // strictly drag-scoped (like every other drag-feedback element) and
              // can never linger at rest.
              isArmedTarget={isDragging && armedTargetId === step.id}
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
            <View
              key={step.id}
              onLayout={(e) => {
                rowLayoutsRef.current[index] = {
                  y: e.nativeEvent.layout.y,
                  height: e.nativeEvent.layout.height,
                };
              }}
            >
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

        {/* Root reorder insertion line: drawn at the real landing slot from
            measured geometry. Nested destinations use the clearer dashed
            outline below. Both are hidden while a nest target is armed. */}
        {isDragging && armedTargetId === null && dropSlot && (
          <View
            pointerEvents="none"
            accessibilityElementsHidden
            importantForAccessibility="no"
            style={[styles.dropLine, { top: dropSlot.top }]}
          />
        )}
        {isDragging && armedTargetId === null && nestedDropOutline && (
          <View
            pointerEvents="none"
            accessibilityElementsHidden
            importantForAccessibility="no"
            style={[
              styles.nestedDropOutline,
              {
                top: nestedDropOutline.top,
                height: nestedDropOutline.height,
              },
            ]}
          />
        )}
        {isDragging && armedTargetId === null && groupDropOutline && (
          <View
            pointerEvents="none"
            accessibilityElementsHidden
            importantForAccessibility="no"
            style={[
              styles.groupDropOutline,
              {
                top: groupDropOutline.top,
                height: groupDropOutline.height,
              },
            ]}
          />
        )}
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
