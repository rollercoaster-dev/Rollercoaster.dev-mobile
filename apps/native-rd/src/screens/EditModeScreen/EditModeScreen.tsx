import React, {
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { View, TextInput, ActivityIndicator, Alert } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useNavigation, type NavigationProp } from "@react-navigation/native";
import { useQuery } from "@evolu/react";
import { useTranslation } from "react-i18next";
import { useUnistyles } from "react-native-unistyles";
import { Text } from "../../components/Text";
import { ErrorBoundary } from "../../components/ErrorBoundary";
import { Button } from "../../components/Button";
import { ScreenSubHeader } from "../../components/ScreenHeader";
import { StepList } from "../../components/StepList";
import { ConfirmDeleteModal } from "../ConfirmDeleteModal";
import {
  goalsQuery,
  updateGoal,
  deleteGoal,
  stepsByGoalQuery,
  createStep,
  updateStep,
  deleteStep,
  reorderSteps,
  StepStatus,
} from "../../db";
import type { GoalId, StepId } from "../../db";
import { reportError } from "../../services/sentry-report";
import {
  validateEvidenceType,
  type EvidenceTypeValue,
} from "../../types/evidence";
import { parsePlannedEvidenceTypes } from "../../utils/parsePlannedEvidenceTypes";
import type {
  EditModeScreenProps,
  GoalsStackParamList,
} from "../../navigation/types";
import { useTabScreenContentInset } from "../../navigation/useTabScreenContentInset";
import { ModeIndicator } from "../../components/ModeIndicator";
import { styles } from "./EditModeScreen.styles";

const DEBOUNCE_MS = 500;

function EditContent({
  goalId,
  cameFromFocus,
}: {
  goalId: string;
  cameFromFocus: boolean;
}) {
  const navigation = useNavigation<NavigationProp<GoalsStackParamList>>();
  const { theme } = useUnistyles();
  const { t } = useTranslation("editGoal");
  const tabInset = useTabScreenContentInset();
  const rows = useQuery(goalsQuery);
  const goal = rows.find((r) => r.id === goalId);
  const stepRows = useQuery(stepsByGoalQuery(goalId as GoalId));

  const [title, setTitle] = useState(goal?.title ?? "");
  const [description, setDescription] = useState(goal?.description ?? "");
  const [titleError, setTitleError] = useState("");
  const [showDeleteGoalModal, setShowDeleteGoalModal] = useState(false);

  const titleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const descTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (titleTimer.current) clearTimeout(titleTimer.current);
      if (descTimer.current) clearTimeout(descTimer.current);
    };
  }, []);

  const debouncedUpdateTitle = useCallback(
    (newTitle: string) => {
      if (titleTimer.current) clearTimeout(titleTimer.current);
      titleTimer.current = setTimeout(() => {
        const trimmed = newTitle.trim();
        if (!trimmed) {
          setTitleError(t("errors.titleRequired"));
          return;
        }
        setTitleError("");
        try {
          updateGoal(goalId as GoalId, { title: trimmed });
        } catch (error) {
          console.error("[EditModeScreen] Failed to update title", {
            goalId,
            title: trimmed,
            error,
          });
          reportError(error, { area: "goal.mutate", kind: "update" });
          setTitleError(t("errors.updateTitleFailed"));
        }
      }, DEBOUNCE_MS);
    },
    [goalId, t],
  );

  const debouncedUpdateDescription = useCallback(
    (newDesc: string) => {
      if (descTimer.current) clearTimeout(descTimer.current);
      descTimer.current = setTimeout(() => {
        try {
          const value = newDesc.trim() || null;
          updateGoal(goalId as GoalId, { description: value });
        } catch (error) {
          console.error("[EditModeScreen] Failed to update description", {
            goalId,
            error,
          });
          reportError(error, { area: "goal.mutate", kind: "update" });
          Alert.alert(
            t("errors.alertErrorTitle"),
            t("errors.updateDescriptionMessage"),
          );
        }
      }, DEBOUNCE_MS);
    },
    [goalId, t],
  );

  if (!goal) {
    return (
      <View style={styles.centered}>
        <Text variant="body">{t("errors.goalNotFound")}</Text>
      </View>
    );
  }

  function handleTitleChange(text: string) {
    setTitle(text);
    debouncedUpdateTitle(text);
  }

  function handleDescriptionChange(text: string) {
    setDescription(text);
    debouncedUpdateDescription(text);
  }

  function handleUpdateStep(
    stepId: string,
    newTitle: string,
    plannedEvidenceTypes?: EvidenceTypeValue[],
  ) {
    try {
      updateStep(stepId as StepId, {
        title: newTitle,
        ...(plannedEvidenceTypes !== undefined ? { plannedEvidenceTypes } : {}),
      });
    } catch (error) {
      console.error("[EditModeScreen] Failed to update step", {
        stepId,
        newTitle,
        error,
      });
      reportError(error, { area: "step.mutate", kind: "update" });
      Alert.alert(t("errors.alertErrorTitle"), t("errors.updateStepMessage"));
    }
  }

  function handleDeleteStep(stepId: string) {
    if (stepRows.length <= 1) return;
    try {
      deleteStep(stepId as StepId);
    } catch (error) {
      console.error("[EditModeScreen] Failed to delete step", {
        goalId,
        stepId,
        error,
      });
      reportError(error, { area: "step.mutate", kind: "delete" });
      Alert.alert(t("errors.alertErrorTitle"), t("errors.deleteStepMessage"));
    }
  }

  function handleCreateStep(
    stepTitle: string,
    plannedEvidenceTypes: EvidenceTypeValue[],
  ) {
    const maxOrdinal = stepRows.reduce(
      (max, s) => Math.max(max, s.ordinal ?? -1),
      -1,
    );
    try {
      createStep(
        goalId as GoalId,
        stepTitle,
        maxOrdinal + 1,
        plannedEvidenceTypes,
      );
    } catch (error) {
      console.error("[EditModeScreen] Failed to create step", {
        goalId,
        stepTitle,
        error,
      });
      reportError(error, { area: "step.mutate", kind: "create" });
      Alert.alert(t("errors.alertErrorTitle"), t("errors.createStepMessage"));
    }
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
      Alert.alert(t("errors.alertErrorTitle"), t("errors.reorderStepsMessage"));
    }
  }

  function handleDeleteGoal() {
    try {
      deleteGoal(goalId as GoalId);
      setShowDeleteGoalModal(false);
      navigation.navigate("Goals");
    } catch (error) {
      console.error("[EditModeScreen] Failed to delete goal", {
        goalId,
        error,
      });
      reportError(error, { area: "goal.mutate", kind: "delete" });
      setShowDeleteGoalModal(false);
      Alert.alert(t("errors.deleteGoalTitle"), t("errors.deleteGoalMessage"));
    }
  }

  function handleNavigate() {
    navigation.navigate("FocusMode", { goalId });
  }

  const canDelete = stepRows.length > 1;

  return (
    <>
      <KeyboardAwareScrollView
        contentContainerStyle={[styles.scrollContent, tabInset]}
        bottomOffset={40}
        keyboardShouldPersistTaps="handled"
      >
        {/* Title */}
        <View style={styles.section}>
          <Text variant="label" style={styles.label}>
            {t("fields.title.label")}
          </Text>
          <TextInput
            style={[
              styles.titleInput,
              titleError ? styles.inputError : undefined,
            ]}
            value={title}
            onChangeText={handleTitleChange}
            placeholder={t("fields.title.placeholder")}
            placeholderTextColor={theme.colors.textMuted}
            accessibilityLabel={t("fields.title.a11yLabel")}
            accessibilityHint={t("fields.title.a11yHint")}
            returnKeyType="next"
          />
          {titleError ? (
            <Text variant="caption" style={styles.errorText}>
              {titleError}
            </Text>
          ) : null}
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text variant="label" style={styles.label}>
            {t("fields.description.label")}
          </Text>
          <TextInput
            style={styles.descriptionInput}
            value={description}
            onChangeText={handleDescriptionChange}
            placeholder={t("fields.description.placeholder")}
            placeholderTextColor={theme.colors.textMuted}
            multiline
            accessibilityLabel={t("fields.description.a11yLabel")}
            accessibilityHint={t("fields.description.a11yHint")}
          />
        </View>

        {/* Steps — reuses StepList with drag-and-drop support */}
        <StepList
          steps={stepRows.map((s) => ({
            id: s.id,
            title: s.title ?? "",
            completed: s.status === StepStatus.completed,
            plannedEvidenceTypes:
              parsePlannedEvidenceTypes(
                s.plannedEvidenceTypes as string | null,
              )?.map(validateEvidenceType) ?? null,
          }))}
          onCreateStep={handleCreateStep}
          onUpdateStep={handleUpdateStep}
          onDeleteStep={canDelete ? handleDeleteStep : undefined}
          onReorderSteps={handleReorderSteps}
        />

        {/* Navigate button */}
        <View style={styles.buttonSection}>
          <Button
            label={
              cameFromFocus
                ? t("actions.backToFocus")
                : t("actions.startWorking")
            }
            onPress={handleNavigate}
            testID={cameFromFocus ? "back-to-focus" : "start-working"}
          />
        </View>

        {/* Delete goal */}
        <View style={styles.buttonSection}>
          <Button
            label={t("actions.deleteGoal")}
            variant="destructive"
            onPress={() => setShowDeleteGoalModal(true)}
          />
        </View>
      </KeyboardAwareScrollView>
      <ConfirmDeleteModal
        visible={showDeleteGoalModal}
        onCancel={() => setShowDeleteGoalModal(false)}
        onConfirm={handleDeleteGoal}
        title={t("confirmDelete.title")}
        message={t("confirmDelete.message", { title: goal.title })}
      />
    </>
  );
}

export function EditModeScreen({ route }: EditModeScreenProps) {
  const navigation = useNavigation();
  const { theme } = useUnistyles();
  const { t } = useTranslation("editGoal");
  const { goalId, cameFromFocus = false } = route.params;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScreenSubHeader label={t("title")} onBack={() => navigation.goBack()} />
      <ErrorBoundary>
        <Suspense
          fallback={
            <ActivityIndicator style={styles.loadingIndicator} size="large" />
          }
        >
          <EditContent goalId={goalId} cameFromFocus={cameFromFocus} />
        </Suspense>
      </ErrorBoundary>
      <ModeIndicator mode="edit" />
    </View>
  );
}
