import React from 'react';
import { Pressable, Text } from 'react-native';
import type { EvidenceTypeValue } from '../../types/evidence';
import { EVIDENCE_TYPE_ICONS } from '../../constants/evidenceIcons';
import { styles } from './EvidenceItem.styles';

export interface EvidenceItemProps {
  id: string;
  type: EvidenceTypeValue;
  label: string;
  isGoal?: boolean;
  onPress?: (id: string) => void;
  onLongPress: (id: string) => void;
}

const MAX_LABEL_LENGTH = 20;

function truncateLabel(label: string): string {
  if (!label) return '';
  if (label.length <= MAX_LABEL_LENGTH) return label;
  return label.slice(0, MAX_LABEL_LENGTH) + '\u2026';
}

export function EvidenceItem({
  id,
  type,
  label,
  isGoal = false,
  onPress,
  onLongPress,
}: EvidenceItemProps) {
  const icon = EVIDENCE_TYPE_ICONS[type];
  const truncated = truncateLabel(label);

  return (
    <Pressable
      onPress={onPress ? () => onPress(id) : undefined}
      onLongPress={() => onLongPress(id)}
      delayLongPress={600}
      accessible
      accessibilityRole="button"
      accessibilityLabel={`${type} evidence: ${truncated}`}
      accessibilityHint={onPress ? 'Tap to view, long press to delete' : 'Long press to delete'}
      style={({ pressed }) => [
        styles.container(isGoal),
        pressed && styles.pressed,
      ]}
    >
      <Text style={styles.icon} accessibilityElementsHidden>
        {icon}
      </Text>
      <Text style={styles.label} numberOfLines={1}>
        {truncated}
      </Text>
    </Pressable>
  );
}
