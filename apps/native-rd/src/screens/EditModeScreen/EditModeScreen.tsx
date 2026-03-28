import React, { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { View, TextInput, ActivityIndicator, Alert } from 'react-native';
import {
  KeyboardProvider,
  KeyboardAwareScrollView,
} from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import { useQuery } from '@evolu/react';
import { useUnistyles } from 'react-native-unistyles';
import { Text } from '../../components/Text';
import { ErrorBoundary } from '../../components/ErrorBoundary';
import { Button } from '../../components/Button';
import { IconButton } from '../../components/IconButton';
import { StepList } from '../../components/StepList';
import { ConfirmDeleteModal } from '../ConfirmDeleteModal';
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
} from '../../db';
import type { GoalId, StepId } from '../../db';
import { validateEvidenceType, type EvidenceTypeValue } from '../../types/evidence';
import { parsePlannedEvidenceTypes } from '../../utils/parsePlannedEvidenceTypes';
import type { EditModeScreenProps, GoalsStackParamList } from '../../navigation/types';
import { ModeIndicator } from '../../components/ModeIndicator';
import { styles } from './EditModeScreen.styles';

const DEBOUNCE_MS = 500;

function EditContent({ goalId, cameFromFocus }: { goalId: string; cameFromFocus: boolean }) {
  const navigation = useNavigation<NavigationProp<GoalsStackParamList>>();
  const { theme } = useUnistyles();
  const rows = useQuery(goalsQuery);
  const goal = rows.find((r) => r.id === goalId);
  const stepRows = useQuery(stepsByGoalQuery(goalId as GoalId));

  const [title, setTitle] = useState(goal?.title ?? '');
  const [description, setDescription] = useState(goal?.description ?? '');
  const [titleError, setTitleError] = useState('');
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
          setTitleError('Title cannot be empty');
          return;
        }
        setTitleError('');
        try {
          updateGoal(goalId as GoalId, { title: trimmed });
        } catch (error) {
          console.error('[EditModeScreen] Failed to update title', { goalId, title: trimmed, error });
          setTitleError('Failed to update title');
        }
      }, DEBOUNCE_MS);
    },
    [goalId],
  );

  const debouncedUpdateDescription = useCallback(
    (newDesc: string) => {
      if (descTimer.current) clearTimeout(descTimer.current);
      descTimer.current = setTimeout(() => {
        try {
          const value = newDesc.trim() || null;
          updateGoal(goalId as GoalId, { description: value });
        } catch (error) {
          console.error('[EditModeScreen] Failed to update description', { goalId, error });
          Alert.alert('Error', 'Failed to update description.');
        }
      }, DEBOUNCE_MS);
    },
    [goalId],
  );

  if (!goal) {
    return (
      <View style={styles.centered}>
        <Text variant="body">Goal not found.</Text>
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

  function handleUpdateStep(stepId: string, newTitle: string, plannedEvidenceTypes?: EvidenceTypeValue[]) {
    try {
      updateStep(stepId as StepId, {
        title: newTitle,
        ...(plannedEvidenceTypes !== undefined ? { plannedEvidenceTypes } : {}),
      });
    } catch (error) {
      console.error('[EditModeScreen] Failed to update step', { stepId, newTitle, error });
      Alert.alert('Error', 'Could not update step.');
    }
  }

  function handleDeleteStep(stepId: string) {
    if (stepRows.length <= 1) return;
    try {
      deleteStep(stepId as StepId);
    } catch (error) {
      console.error('[EditModeScreen] Failed to delete step', { goalId, stepId, error });
      Alert.alert('Error', 'Could not delete step.');
    }
  }

  function handleCreateStep(stepTitle: string, plannedEvidenceTypes: EvidenceTypeValue[]) {
    const maxOrdinal = stepRows.reduce(
      (max, s) => Math.max(max, s.ordinal ?? -1),
      -1,
    );
    try {
      createStep(goalId as GoalId, stepTitle, maxOrdinal + 1, plannedEvidenceTypes);
    } catch (error) {
      console.error('[EditModeScreen] Failed to create step', { goalId, stepTitle, error });
      Alert.alert('Error', 'Could not create step.');
    }
  }

  function handleReorderSteps(stepIds: string[]) {
    try {
      reorderSteps(goalId as GoalId, stepIds as StepId[]);
    } catch (error) {
      console.error('[EditModeScreen] Failed to reorder steps', { goalId, error });
      Alert.alert('Error', 'Could not reorder steps.');
    }
  }

  function handleDeleteGoal() {
    try {
      deleteGoal(goalId as GoalId);
      setShowDeleteGoalModal(false);
      navigation.navigate('Goals');
    } catch (error) {
      console.error('[EditModeScreen] Failed to delete goal', { goalId, error });
      setShowDeleteGoalModal(false);
      Alert.alert('Could not delete goal', 'Something went wrong. Please try again.');
    }
  }

  function handleNavigate() {
    navigation.navigate('FocusMode', { goalId });
  }

  const canDelete = stepRows.length > 1;

  return (
    <KeyboardProvider>
      <KeyboardAwareScrollView contentContainerStyle={styles.scrollContent} bottomOffset={40}>
        {/* Title */}
        <View style={styles.section}>
          <Text variant="label" style={styles.label}>Goal Title</Text>
          <TextInput
            style={[styles.titleInput, titleError ? styles.inputError : undefined]}
            value={title}
            onChangeText={handleTitleChange}
            placeholder="Goal title"
            placeholderTextColor={theme.colors.textMuted}
            accessibilityLabel="Goal title"
            accessibilityHint="Edit the goal title"
            returnKeyType="next"
          />
          {titleError ? (
            <Text variant="caption" style={styles.errorText}>{titleError}</Text>
          ) : null}
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text variant="label" style={styles.label}>Description</Text>
          <TextInput
            style={styles.descriptionInput}
            value={description}
            onChangeText={handleDescriptionChange}
            placeholder="Add a description..."
            placeholderTextColor={theme.colors.textMuted}
            multiline
            accessibilityLabel="Goal description"
            accessibilityHint="Edit the goal description"
          />
        </View>

        {/* Steps — reuses StepList with drag-and-drop support */}
        <StepList
          steps={stepRows.map((s) => ({
            id: s.id,
            title: s.title ?? '',
            completed: s.status === StepStatus.completed,
            plannedEvidenceTypes: parsePlannedEvidenceTypes(s.plannedEvidenceTypes as string | null)?.map(validateEvidenceType) ?? null,
          }))}
          onCreateStep={handleCreateStep}
          onUpdateStep={handleUpdateStep}
          onDeleteStep={canDelete ? handleDeleteStep : undefined}
          onReorderSteps={handleReorderSteps}
        />

        {/* Navigate button */}
        <View style={styles.buttonSection}>
          <Button
            label={cameFromFocus ? 'Back to Focus' : 'Start Working'}
            onPress={handleNavigate}
          />
        </View>

        {/* Delete goal */}
        <View style={styles.buttonSection}>
          <Button
            label="Delete Goal"
            variant="destructive"
            onPress={() => setShowDeleteGoalModal(true)}
          />
        </View>
      </KeyboardAwareScrollView>
      <ConfirmDeleteModal
        visible={showDeleteGoalModal}
        onCancel={() => setShowDeleteGoalModal(false)}
        onConfirm={handleDeleteGoal}
        title="Delete this goal?"
        message={`"${goal.title}" and all progress will be permanently deleted.`}
      />
    </KeyboardProvider>
  );
}

export function EditModeScreen({ route }: EditModeScreenProps) {
  const navigation = useNavigation();
  const { theme } = useUnistyles();
  const { goalId, cameFromFocus = false } = route.params;

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <View style={styles.topBar}>
        <IconButton
          icon={<Text variant="body" style={styles.backIcon}>{'<'}</Text>}
          onPress={() => navigation.goBack()}
          accessibilityLabel="Go back"
          size="sm"
        />
        <Text variant="label">Edit Goal</Text>
        <View style={styles.spacer} />
      </View>
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
    </SafeAreaView>
  );
}
