import React from "react";
import { View, Text } from "react-native";
import { styles } from "./SettingsSection.styles";

export interface SettingsSectionProps {
  title: string;
  children: React.ReactNode;
  /**
   * Optional accessibility grouping applied to the rows container. Used by
   * SettingsDensityRows to mark its three rows as a `radiogroup`. Unset for
   * ordinary sections, preserving today's behavior.
   *
   * There is deliberately no `accessible` prop: setting it on the container
   * collapses every row into a single a11y node on iOS, so screen readers
   * could reach the group but never the individual radios (#500).
   */
  accessibilityRole?: "radiogroup";
  accessibilityLabel?: string;
  /**
   * Test-only handle on the rows container. Deliberately opt-in and undefined
   * by default: several sections render on one screen, so a hardcoded testID
   * would put duplicate ids in the live tree and make E2E selectors ambiguous.
   */
  rowsTestID?: string;
}

export function SettingsSection({
  title,
  children,
  accessibilityRole,
  accessibilityLabel,
  rowsTestID,
}: SettingsSectionProps) {
  const childArray = React.Children.toArray(children);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <View
        testID={rowsTestID}
        style={styles.rows}
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
