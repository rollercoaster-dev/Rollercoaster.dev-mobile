import React from 'react';
import { View, Text } from 'react-native';
import { styles } from './SettingsSection.styles';

export interface SettingsSectionProps {
  title: string;
  children: React.ReactNode;
}

export function SettingsSection({ title, children }: SettingsSectionProps) {
  const childArray = React.Children.toArray(children);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.rows}>
        {childArray.map((child, i) => (
          <React.Fragment key={i}>
            {i > 0 && <View testID="settings-separator" style={styles.separator} />}
            {child}
          </React.Fragment>
        ))}
      </View>
    </View>
  );
}
