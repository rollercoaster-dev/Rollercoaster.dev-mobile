import React, {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  View,
  Modal,
  ScrollView,
  ActivityIndicator,
  Alert,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, type NavigationProp } from "@react-navigation/native";
import { useQuery } from "@evolu/react";
import { useTranslation } from "react-i18next";
import { useUnistyles } from "react-native-unistyles";
import { Text } from "../../components/Text";
import { Button } from "../../components/Button";
import { ErrorBoundary } from "../../components/ErrorBoundary";
import { ConfirmDeleteModal } from "../../components/ConfirmDeleteModal";
import {
  EditGoalView,
  EditGoalOverflowMenu,
} from "../../components/EditGoalView";
import type {
  DragScrollController,
  DragScrollMetrics,
} from "../../components/StepList";
import {
  goalsQuery,
  updateGoal,
  deleteGoal,
  stepsByGoalQuery,
  createStep,
  createSubStep,
  updateStep,
  deleteStep,
  reorderSteps,
  reorderSubSteps,
} from "../../db";
import type { GoalId, StepId } from "../../db";
import type { StepTimingValue } from "../../components/StepTimingEditor";
import { reportError } from "../../services/sentry-report";
import { runEvoluMutation } from "../../utils/evoluMutation";
import { localDayKeyToDateIso } from "../../utils/localDay";
import type {
  EditModeScreenProps,
  GoalsStackParamList,
} from "../../navigation/types";
import { buildEditGoalCopy, buildTimingCopy } from "./editGoalCopy";
import { buildEditGoalSteps } from "./editGoalSteps";
import { styles } from "./EditModeScreen.styles";

const DEBOUNCE_MS = 500;

function EditContent({ goalId }: { goalId: string }) {
  const navigation = useNavigation<NavigationProp<GoalsStackParamList>>();
  const { theme } = useUnistyles();
  const { t, i18n } = useTranslation(["editGoal", "common"]);
  // EditGoalView is i18n-free by design (#445/D9) — its ~30 copy props are
  // resolved in one place (editGoalCopy) and spread in below.
  const copy = useMemo(() => buildEditGoalCopy(t), [t]);
  // Rides `timingHost.copy` rather than the view's prop surface, so it is
  // resolved beside the copy bundle but handed over separately.
  const timingCopy = useMemo(() => buildTimingCopy(t), [t]);
  const rows = useQuery(goalsQuery);
  const goal = rows.find((r) => r.id === goalId);
  const stepRows = useQuery(stepsByGoalQuery(goalId as GoalId));

  const [title, setTitle] = useState(goal?.title ?? "");
  const [description, setDescription] = useState(goal?.description ?? "");
  const [overflowOpen, setOverflowOpen] = useState(false);
  const [showDeleteGoalModal, setShowDeleteGoalModal] = useState(false);
  // Which row has its timing editor open. One at a time: the editor unfolds in
  // place with the list still on screen, which is the whole point of authoring
  // in the row, and a second open editor would push that context off it.
  const [expandedTimingId, setExpandedTimingId] = useState<string | null>(null);
  // Set when a timing write has just failed, and consumed by the collapse that
  // the editor fires immediately afterwards. StepTimingEditor's `Done` calls
  // `onCommit` and closes in the same synchronous breath, with no way to veto
  // the close from inside `onCommit` — so the veto has to happen one callback
  // later, here, or a rejected write would alert and still lose the draft.
  const justFailedTimingWriteRef = useRef(false);

  const titleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const descTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Drag auto-scroll (unchanged from the StepList era) — but the ScrollView it
  // measures now lives inside EditGoalView (#493/D8), so the metrics arrive via
  // the view's `scrollInstrumentation` prop instead of props on our own
  // ScrollView.
  const scrollRef = useRef<ScrollView>(null);
  const scrollMetricsRef = useRef<DragScrollMetrics>({
    offsetY: 0,
    viewportTop: 0,
    viewportHeight: 0,
    contentHeight: 0,
  });
  const dragScrollController = useMemo<DragScrollController>(
    () => ({
      getMetrics: () => scrollMetricsRef.current,
      scrollTo: (y) => {
        scrollMetricsRef.current.offsetY = y;
        scrollRef.current?.scrollTo({ y, animated: false });
      },
    }),
    [],
  );
  const scrollInstrumentation = useMemo(
    () => ({
      ref: scrollRef,
      onLayout: (event: LayoutChangeEvent) => {
        scrollMetricsRef.current.viewportHeight = event.nativeEvent.layout.height; // prettier-ignore
        // viewportTop is screen-absolute (the drag pointer's frame), so it can
        // only come from a measure — layout coordinates are parent-relative.
        // ScrollView itself has no measureInWindow; its native host node does.
        scrollRef.current
          ?.getNativeScrollRef()
          ?.measureInWindow((_x, y, _width, height) => {
            scrollMetricsRef.current.viewportTop = y;
            scrollMetricsRef.current.viewportHeight = height;
          });
      },
      onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        scrollMetricsRef.current.offsetY = event.nativeEvent.contentOffset.y;
      },
      onContentSizeChange: (_width: number, height: number) => {
        scrollMetricsRef.current.contentHeight = height;
      },
    }),
    [],
  );

  useEffect(() => {
    return () => {
      if (titleTimer.current) clearTimeout(titleTimer.current);
      if (descTimer.current) clearTimeout(descTimer.current);
    };
  }, []);

  const writeTitle = useCallback(
    (trimmed: string) => {
      runEvoluMutation(
        () => updateGoal(goalId as GoalId, { title: trimmed }),
        (error) => {
          console.error("[EditModeScreen] Failed to update title", {
            goalId,
            title: trimmed,
            error,
          });
          reportError(error, { area: "goal.mutate", kind: "update" });
          // Write failures still surface through Alert: EditGoalView's title
          // card has no error slot, and inventing one would be un-storied UI.
          // Same channel the description path has always used.
          Alert.alert(
            t("editGoal:errors.alertErrorTitle"),
            t("editGoal:errors.updateTitleFailed"),
          );
        },
      );
    },
    [goalId, t],
  );

  const debouncedUpdateTitle = useCallback(
    (newTitle: string) => {
      if (titleTimer.current) clearTimeout(titleTimer.current);
      titleTimer.current = setTimeout(() => {
        titleTimer.current = null;
        const trimmed = newTitle.trim();
        // An empty field surviving the debounce is not a submission (#562) —
        // the user cleared the title and is about to retype it. Skip the write
        // (an empty title is never persisted) and leave the decision to the
        // commit point, handleTitleEndEditing. The modal Alert that used to
        // fire here took first responder mid-edit and dropped the replacement
        // text.
        if (!trimmed) return;
        writeTitle(trimmed);
      }, DEBOUNCE_MS);
    },
    [writeTitle],
  );

  const debouncedUpdateDescription = useCallback(
    (newDesc: string) => {
      if (descTimer.current) clearTimeout(descTimer.current);
      descTimer.current = setTimeout(() => {
        const value = newDesc.trim() || null;
        runEvoluMutation(
          () => updateGoal(goalId as GoalId, { description: value }),
          (error) => {
            console.error("[EditModeScreen] Failed to update description", {
              goalId,
              error,
            });
            reportError(error, { area: "goal.mutate", kind: "update" });
            Alert.alert(
              t("editGoal:errors.alertErrorTitle"),
              t("editGoal:errors.updateDescriptionMessage"),
            );
          },
        );
      }, DEBOUNCE_MS);
    },
    [goalId, t],
  );

  // The clock is an input, not a dependency (#571): a passed expected date
  // reads as "was" from the next rebuild on, which any row edit or language
  // change already triggers. Nothing here needs to re-render on a tick.
  //
  // `now` comes back out of the memo rather than being read again below, so the
  // open editor and the rows it sits between judge "today" against the same
  // instant — and so the memoised StepDayGrid keeps its memo: a fresh `Date`
  // every render would miss it on all 31 cells.
  const { steps, now } = useMemo(() => {
    const instant = new Date();
    return {
      steps: buildEditGoalSteps(stepRows, t, i18n.language, instant),
      now: instant,
    };
  }, [stepRows, t, i18n.language]);

  if (!goal) {
    return (
      <View style={styles.centered}>
        <Text variant="body">{t("editGoal:errors.goalNotFound")}</Text>
      </View>
    );
  }

  function handleTitleChange(text: string) {
    setTitle(text);
    debouncedUpdateTitle(text);
  }

  // Commit point for the title (#562). Leaving the field empty is an abandoned
  // edit, not an error: drop any pending debounce write and fall back to the
  // stored title, the same "empty rename is a no-op" contract the step rows
  // keep in EditGoalStepList.commitEditing. No modal — the old title simply
  // comes back, and the DB row was never touched. A non-empty title with a
  // write still pending is flushed right here: Done/back inside the debounce
  // window unmounts the screen, and the unmount cleanup drops the timer.
  function handleTitleEndEditing() {
    const pending = titleTimer.current !== null;
    if (titleTimer.current) clearTimeout(titleTimer.current);
    titleTimer.current = null;
    const trimmed = title.trim();
    if (!trimmed) {
      setTitle(goal?.title ?? "");
      return;
    }
    if (pending) writeTitle(trimmed);
  }

  function handleDescriptionChange(text: string) {
    setDescription(text);
    debouncedUpdateDescription(text);
  }

  /**
   * Every `updateStep` call this screen makes, with its one error channel.
   *
   * Both of Evolu's failure modes reach `onFailure` (a thrown validation guard
   * and a returned `{ ok: false }`), and `log` names the write so the console
   * and Sentry breadcrumb say which one lost.
   */
  function updateStepFields(
    stepId: string,
    fields: Parameters<typeof updateStep>[1],
    log = "Failed to update step",
  ): boolean {
    return runEvoluMutation(
      () => updateStep(stepId as StepId, fields),
      (error) => {
        console.error(`[EditModeScreen] ${log}`, { stepId, fields, error });
        reportStepUpdateFailure(error);
      },
    );
  }

  /** Sentry + the one alert the editor has no error slot of its own for. */
  function reportStepUpdateFailure(error: unknown) {
    reportError(error, { area: "step.mutate", kind: "update" });
    Alert.alert(
      t("editGoal:errors.alertErrorTitle"),
      t("editGoal:errors.updateStepMessage"),
    );
  }

  /** The timing this row's editor opened with — the draft's own baseline. */
  function seededTiming(id: string): StepTimingValue | undefined {
    for (const step of steps) {
      if (step.id === id) return step.timing?.value;
      const sub = step.subSteps?.find((s) => s.id === id);
      if (sub) return sub.timing?.value;
    }
    return undefined;
  }

  function writeTiming(
    stepId: string,
    fields: Parameters<typeof updateStep>[1],
  ) {
    const ok = updateStepFields(stepId, fields, "Failed to update step timing");
    if (!ok) justFailedTimingWriteRef.current = true;
  }

  /**
   * `Done` inside the expanded editor.
   *
   * Written as a **diff against the draft the editor opened with**, not as the
   * draft wholesale: `undefined` is `updateStep`'s "don't touch". Committing the
   * whole draft would let a row destroy a dependency the editor never showed —
   * a dangling `afterStepId`, or the far side of a mutual two-step cycle, both
   * of which seed the draft as `nothing` because that is how they render. Dating
   * such a step would silently clear it. The issue asks for a quiet absence from
   * the candidate list, not a quiet delete.
   *
   * A due date arrives as the grid's plain local `YYYY-MM-DD` and is written as
   * a `DateIso` at local midnight — checked, not assumed, like every other
   * `dateToDateIso` call site in this app.
   *
   * Setting a dependency also clears the external wait: `waiting on` is a fact
   * about the world recorded in Focus, and the two cannot both be the reason a
   * step is not moving. Every other commit leaves those columns alone, so dating
   * a step never wipes a wait another surface recorded.
   */
  function handleCommitTiming(stepId: string, next: StepTimingValue) {
    const seed = seededTiming(stepId);
    const fields: Parameters<typeof updateStep>[1] = {};

    if (next.dueDate !== seed?.dueDate) {
      if (next.dueDate === null) {
        fields.dueAt = null;
      } else {
        const converted = localDayKeyToDateIso(next.dueDate);
        if (!converted.ok) {
          console.error("[EditModeScreen] Failed to convert due date", {
            stepId,
            dueDate: next.dueDate,
          });
          reportStepUpdateFailure(converted.error);
          justFailedTimingWriteRef.current = true;
          return;
        }
        fields.dueAt = converted.value;
      }
    }

    if (next.afterStepId !== seed?.afterStepId) {
      fields.afterStepId = next.afterStepId as StepId | null;
      if (next.afterStepId !== null) {
        fields.waitingOnLabel = null;
        fields.waitingOnExpectedAt = null;
      }
    }

    // Nothing moved — `Done` on an untouched draft is a close, not a write.
    if (Object.keys(fields).length === 0) return;
    writeTiming(stepId, fields);
  }

  /** `Clear` inside the expanded editor — the row goes back to unset. */
  function handleClearTiming(stepId: string) {
    writeTiming(stepId, {
      dueAt: null,
      afterStepId: null,
      waitingOnLabel: null,
      waitingOnExpectedAt: null,
    });
  }

  function handleCollapseTiming() {
    if (justFailedTimingWriteRef.current) {
      justFailedTimingWriteRef.current = false;
      return;
    }
    setExpandedTimingId(null);
  }

  // Unconditional (D9): the storied × has no min-count gate, and a goal with
  // zero steps is a supported state across the redesign, not an error.
  function handleDeleteStep(stepId: string) {
    runEvoluMutation(
      () => deleteStep(stepId as StepId),
      (error) => {
        console.error("[EditModeScreen] Failed to delete step", {
          goalId,
          stepId,
          error,
        });
        reportError(error, { area: "step.mutate", kind: "delete" });
        Alert.alert(
          t("editGoal:errors.alertErrorTitle"),
          t("editGoal:errors.deleteStepMessage"),
        );
      },
    );
  }

  // No plannedEvidenceTypes argument (D4): the editor's add-step flow has no
  // evidence-types input, so the column stays unset and the read path resolves
  // it to the default plan.
  function handleCreateStep(stepTitle: string) {
    // Top-level ordinals are their own sibling group — exclude sub-steps so a
    // new root step doesn't inherit a child's ordinal.
    const maxOrdinal = stepRows.reduce(
      (max, s) =>
        s.parentStepId == null ? Math.max(max, s.ordinal ?? -1) : max,
      -1,
    );
    runEvoluMutation(
      () => createStep(goalId as GoalId, stepTitle, maxOrdinal + 1),
      (error) => {
        console.error("[EditModeScreen] Failed to create step", {
          goalId,
          stepTitle,
          error,
        });
        reportError(error, { area: "step.mutate", kind: "create" });
        Alert.alert(
          t("editGoal:errors.alertErrorTitle"),
          t("editGoal:errors.createStepMessage"),
        );
      },
    );
  }

  function handleCreateSubStep(parentStepId: string, subStepTitle: string) {
    // Sub-step ordinals are scoped to their parent's sibling group.
    const maxChildOrdinal = stepRows.reduce(
      (max, s) =>
        s.parentStepId === parentStepId ? Math.max(max, s.ordinal ?? -1) : max,
      -1,
    );
    // Evolu reports validation/write failures via a { ok: false } Result rather
    // than throwing, so a discarded Result would swallow the failure silently.
    runEvoluMutation(
      () =>
        createSubStep(
          goalId as GoalId,
          parentStepId as StepId,
          subStepTitle,
          maxChildOrdinal + 1,
        ),
      (error) => {
        console.error("[EditModeScreen] Failed to create sub-step", {
          goalId,
          parentStepId,
          subStepTitle,
          error,
        });
        reportError(error, { area: "step.mutate", kind: "create" });
        Alert.alert(
          t("editGoal:errors.alertErrorTitle"),
          t("editGoal:errors.createStepMessage"),
        );
      },
    );
  }

  function handleReorderSteps(stepIds: string[]) {
    try {
      reorderSteps(goalId as GoalId, stepIds as StepId[]);
    } catch (error) {
      console.error("[EditModeScreen] Failed to reorder steps", {
        goalId,
        error,
      });
      reportError(error, { area: "step.mutate", kind: "reorder" });
      Alert.alert(
        t("editGoal:errors.alertErrorTitle"),
        t("editGoal:errors.reorderStepsMessage"),
      );
    }
  }

  function handleReorderSubSteps(parentStepId: string, childStepIds: string[]) {
    try {
      reorderSubSteps(
        goalId as GoalId,
        parentStepId as StepId,
        childStepIds as StepId[],
      );
    } catch (error) {
      console.error("[EditModeScreen] Failed to reorder sub-steps", {
        goalId,
        parentStepId,
        error,
      });
      reportError(error, { area: "step.mutate", kind: "reorder" });
      Alert.alert(
        t("editGoal:errors.alertErrorTitle"),
        t("editGoal:errors.reorderStepsMessage"),
      );
    }
  }

  function handleReparentStep(stepId: string, newParentStepId: string | null) {
    // A step's ordinal is scoped to its current sibling group, so on reparent
    // it would collide in the destination group. Append it to the end of the
    // destination group in BOTH directions (promote → root group, demote →
    // target's children) by recomputing the next ordinal there and setting it
    // alongside parentStepId in one update. (Position-implied insert on demote
    // is a Post-#330 follow-up — see Not in Scope.)
    const nextOrdinal =
      newParentStepId === null
        ? stepRows.reduce(
            (max, s) =>
              s.parentStepId == null ? Math.max(max, s.ordinal ?? -1) : max,
            -1,
          ) + 1
        : stepRows.reduce(
            (max, s) =>
              s.parentStepId === newParentStepId
                ? Math.max(max, s.ordinal ?? -1)
                : max,
            -1,
          ) + 1;
    // Evolu reports validation/write failures via a { ok: false } Result rather
    // than throwing, so a discarded Result would let a failed reparent snap the
    // dragged step back with no feedback. Surface it like the catch does.
    runEvoluMutation(
      () =>
        updateStep(stepId as StepId, {
          parentStepId: newParentStepId as StepId | null,
          ordinal: nextOrdinal,
        }),
      (error) => {
        console.error("[EditModeScreen] Failed to reparent step", {
          goalId,
          stepId,
          newParentStepId,
          error,
        });
        reportError(error, { area: "step.mutate", kind: "update" });
        Alert.alert(
          t("editGoal:errors.alertErrorTitle"),
          t("editGoal:errors.updateStepMessage"),
        );
      },
    );
  }

  function handleDeleteGoal() {
    // Only dismiss the confirmation modal and navigate away when the delete
    // actually succeeded — a rejected soft-delete (thrown or { ok: false })
    // must keep the goal on screen with an error, not silently drop the user
    // back on the Goals list as if the goal were gone.
    const ok = runEvoluMutation(
      () => deleteGoal(goalId as GoalId),
      (error) => {
        console.error("[EditModeScreen] Failed to delete goal", {
          goalId,
          error,
        });
        reportError(error, { area: "goal.mutate", kind: "delete" });
        Alert.alert(
          t("editGoal:errors.deleteGoalTitle"),
          t("editGoal:errors.deleteGoalMessage"),
        );
      },
    );
    if (ok) {
      setShowDeleteGoalModal(false);
      navigation.navigate("Goals");
    }
  }

  return (
    <>
      <EditGoalView
        goalTitle={title}
        onGoalTitleChange={handleTitleChange}
        onGoalTitleEndEditing={handleTitleEndEditing}
        description={description}
        onDescriptionChange={handleDescriptionChange}
        steps={steps}
        onReorderSteps={handleReorderSteps}
        onReorderSubSteps={handleReorderSubSteps}
        onReparentStep={handleReparentStep}
        onAddStep={handleCreateStep}
        onStepTitleChange={(stepId, stepTitle) =>
          updateStepFields(stepId, { title: stepTitle })
        }
        onStepEvidenceChange={(stepId, types) =>
          updateStepFields(stepId, { plannedEvidenceTypes: types })
        }
        onAddSubStep={handleCreateSubStep}
        onSubStepTitleChange={(subStepId, subStepTitle) =>
          updateStepFields(subStepId, { title: subStepTitle })
        }
        onSubStepEvidenceChange={(subStepId, types) =>
          updateStepFields(subStepId, { plannedEvidenceTypes: types })
        }
        onDeleteStep={handleDeleteStep}
        onDeleteSubStep={handleDeleteStep}
        onOverflowPress={() => setOverflowOpen(true)}
        onBack={() => navigation.goBack()}
        onDone={() => navigation.navigate("FocusMode", { goalId })}
        dragScrollController={dragScrollController}
        scrollInstrumentation={scrollInstrumentation}
        onEditTiming={setExpandedTimingId}
        timingHost={{
          expandedId: expandedTimingId,
          onCommit: handleCommitTiming,
          onClear: handleClearTiming,
          onCollapse: handleCollapseTiming,
          now,
          locale: i18n.language,
          copy: timingCopy,
        }}
        {...copy}
      />

      {/* ⋯ overflow popover (D7). No anchored-dropdown component exists in the
          app yet, so this mirrors the nest-under picker's Modal shape from
          EditGoalStepRow — scrim + bottom card + Cancel — rather than inventing
          one. It holds only "Delete goal"; confirming routes through the same
          ConfirmDeleteModal flow the old screen used. */}
      <Modal
        visible={overflowOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setOverflowOpen(false)}
        accessibilityViewIsModal
      >
        <View
          style={[
            styles.overflowOverlay,
            { backgroundColor: `${theme.colors.shadow}80` },
          ]}
        >
          <SafeAreaView edges={["bottom"]} style={styles.overflowContainer}>
            <View style={styles.overflowCard}>
              <EditGoalOverflowMenu
                onDelete={() => {
                  setOverflowOpen(false);
                  setShowDeleteGoalModal(true);
                }}
                deleteGoalLabel={t("editGoal:actions.deleteGoal")}
              />
              <Button
                label={t("common:actions.cancel")}
                variant="secondary"
                onPress={() => setOverflowOpen(false)}
              />
            </View>
          </SafeAreaView>
        </View>
      </Modal>

      <ConfirmDeleteModal
        visible={showDeleteGoalModal}
        onCancel={() => setShowDeleteGoalModal(false)}
        onConfirm={handleDeleteGoal}
        title={t("editGoal:confirmDelete.title")}
        message={t("editGoal:confirmDelete.message", { title: goal.title })}
      />
    </>
  );
}

export function EditModeScreen({ route }: EditModeScreenProps) {
  const { theme } = useUnistyles();
  const { goalId } = route.params;

  // No outer ScreenSubHeader and no ModeIndicator: EditGoalView is the screen
  // host — it renders its own header (with the ⋯ trigger) and pinned Done
  // footer (D1) — and the redesigned Epic #384 screens dropped the mode
  // indicator and tab inset (D2).
  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ErrorBoundary>
        <Suspense
          fallback={
            <ActivityIndicator style={styles.loadingIndicator} size="large" />
          }
        >
          <EditContent goalId={goalId} />
        </Suspense>
      </ErrorBoundary>
    </View>
  );
}
