import React from 'react';
import { View, Image } from 'react-native';
import type { ImageSourcePropType } from 'react-native';
import { Text } from '../Text';
import { styles } from './ModeIndicator.styles';

export type LifecycleMode = 'edit' | 'focus' | 'complete' | 'timeline';

const MODE_CONFIG: Record<LifecycleMode, { emoji: string; label: string }> = {
  edit: { emoji: '📝', label: 'Edit' },
  focus: { emoji: '🎯', label: 'Focus' },
  complete: { emoji: '🎉', label: 'Complete' },
  timeline: { emoji: '📖', label: 'Timeline' },
};

export interface ModeIndicatorProps {
  mode: LifecycleMode;
  icon?: ImageSourcePropType;
}

export function ModeIndicator({ mode, icon }: ModeIndicatorProps) {
  const config = MODE_CONFIG[mode];

  return (
    <View
      style={styles.container}
      accessibilityRole="header"
      accessibilityLabel={`Current mode: ${config.label}`}
    >
      {icon ? (
        <Image source={icon} style={styles.iconImage} resizeMode="contain" />
      ) : (
        <Text style={styles.icon} accessibilityElementsHidden>
          {config.emoji}
        </Text>
      )}
      <Text variant="label" style={styles.label}>
        {config.label}
      </Text>
    </View>
  );
}
