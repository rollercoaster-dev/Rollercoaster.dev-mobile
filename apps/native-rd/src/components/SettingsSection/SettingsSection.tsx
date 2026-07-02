import React from "react";
import { View, Text } from "react-native";
import { styles } from "./SettingsSection.styles";

export interface SettingsSectionProps {
  title: string;
  children: React.ReactNode;
  /**
   * Optional accessibility grouping applied to the rows container. Used by
   * SettingsDensityRows to mark its three rows as a `radiogroup` (and to drop
   * that grouping in E2E mode via `accessible={false}`). Unset for ordinary
   * sections, preserving today's behavior.
   */
  accessible?: boolean;
  accessibilityRole?: "radiogroup";
  accessibilityLabel?: string;
}

export function SettingsSection({
  title,
  children,
  accessible,
  accessibilityRole,
  accessibilityLabel,
}: SettingsSectionProps) {
  const childArray = React.Children.toArray(children);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <View
        style={styles.rows}
        accessible={accessible}
        accessibilityRole={accessibilityRole}
        accessibilityLabel={accessibilityLabel}
      >
        {childArray.map((child, i) => (
          <React.Fragment key={i}>
            {i > 0 && (
              <View testID="settings-separator" style={styles.separator} />
            )}
            {child}
          </React.Fragment>
        ))}
      </View>
    </View>
  );
}
