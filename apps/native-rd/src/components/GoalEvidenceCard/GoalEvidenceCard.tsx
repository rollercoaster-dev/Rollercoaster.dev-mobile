import React from 'react';
import { View, Text, Pressable } from 'react-native';
import Animated from 'react-native-reanimated';
import { Card } from '../Card';
import { useFlashOnIncrease } from '../../hooks/useFlashOnIncrease';
import { formatEvidenceLabel } from '../../utils/formatEvidenceLabel';
import { styles } from './GoalEvidenceCard.styles';

export interface GoalEvidenceCardProps {
  evidenceCount: number;
  onEvidenceTap: () => void;
}

export function GoalEvidenceCard({
  evidenceCount,
  onEvidenceTap,
}: GoalEvidenceCardProps) {
  const evidenceLabel = formatEvidenceLabel(evidenceCount);
  const flashStyle = useFlashOnIncrease(evidenceCount);

  return (
    <View style={styles.wrapper}>
      <Card>
        <View style={styles.container}>
          <Text style={styles.goalLabel}>★ Goal</Text>
          <Text
            style={styles.title}
            accessible
            accessibilityRole="header"
          >
            Goal Evidence
          </Text>
          <Text style={styles.description}>
            Evidence for the overall goal, not tied to a specific step
          </Text>
          <View style={styles.evidenceBadgeWrapper}>
            <Pressable
              onPress={onEvidenceTap}
              style={styles.evidenceBadge}
              accessible
              accessibilityRole="button"
              accessibilityLabel={`${evidenceCount} goal evidence items, tap to view`}
            >
              <Text style={styles.evidenceText}>{evidenceLabel}</Text>
            </Pressable>
            <Animated.View
              style={[styles.evidenceFlash, flashStyle]}
              pointerEvents="none"
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            />
          </View>
        </View>
      </Card>
    </View>
  );
}
