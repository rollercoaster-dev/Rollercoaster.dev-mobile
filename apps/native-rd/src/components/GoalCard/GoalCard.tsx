import React from 'react';
import { View, Text } from 'react-native';
import { Card } from '../Card';
import { ProgressBar } from '../ProgressBar';
import { StatusBadge, type StatusBadgeVariant } from '../StatusBadge';
import { styles } from './GoalCard.styles';

export interface GoalCardGoal {
  id: string;
  title: string;
  status: 'active' | 'completed';
  stepsTotal: number;
  stepsCompleted: number;
}

export interface GoalCardProps {
  goal: GoalCardGoal;
  onPress?: () => void;
  onLongPress?: () => void;
}

export function GoalCard({ goal, onPress, onLongPress }: GoalCardProps) {
  const progress = goal.stepsTotal > 0
    ? goal.stepsCompleted / goal.stepsTotal
    : 0;

  const statusVariant: StatusBadgeVariant =
    goal.status === 'completed' ? 'completed' : 'active';

  const accessibilityLabel = `${goal.title}, ${goal.stepsCompleted} of ${goal.stepsTotal} steps completed, ${goal.status}`;

  return (
    <Card
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityLabel={onPress ? accessibilityLabel : undefined}
      accessibilityHint={onPress ? 'Double-tap to view details' : undefined}
    >
      <View style={styles.header}>
        <Text
          style={styles.title}
          numberOfLines={2}
          accessible
          accessibilityRole="header"
        >
          {goal.title}
        </Text>
        <StatusBadge variant={statusVariant} />
      </View>
      {goal.stepsTotal > 0 && (
        <View style={styles.progressRow}>
          <View style={styles.progressBar}>
            <ProgressBar progress={progress} />
          </View>
          <Text style={styles.progressLabel}>
            {goal.stepsCompleted}/{goal.stepsTotal} steps
          </Text>
        </View>
      )}
    </Card>
  );
}
