/**
 * Icon picker for badge design
 *
 * Renders a trigger button that shows the currently selected icon and its name.
 * Pressing the button opens a full-screen IconPickerModal for browsing and
 * selecting icons with category tabs, search, and weight selection.
 */

import React, { useCallback, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import type { IconWeight } from "phosphor-react-native";

import { getIconComponent } from "./iconRegistry";
import { iconNameToLabel } from "./iconIndex";
import { IconPickerModal } from "./IconPickerModal";
import type { BadgeIconWeight } from "./types";
import { shadowStyle } from "../styles/shadows";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface IconPickerProps {
  /** Currently selected icon name (PascalCase Phosphor name) */
  selectedIcon: string;
  /** Currently selected icon weight */
  selectedWeight: BadgeIconWeight;
  /** Callback when the user selects an icon */
  onSelectIcon: (iconName: string) => void;
  /** Callback when the user changes the icon weight */
  onSelectWeight: (weight: BadgeIconWeight) => void;
  /** Optional accent color for selected state (hex). Falls back to theme accent. */
  accentColor?: string;
  /** Test ID prefix for testing */
  testID?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TRIGGER_ICON_SIZE = 32;

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function IconPicker({
  selectedIcon,
  selectedWeight,
  onSelectIcon,
  onSelectWeight,
  accentColor,
  testID = "icon-picker",
}: IconPickerProps) {
  const { theme } = useUnistyles();
  const [modalVisible, setModalVisible] = useState(false);

  const resolvedAccent = accentColor ?? theme.colors.accentPrimary;
  const selectedIconColor = theme.colors.background;

  const handleOpen = useCallback(() => setModalVisible(true), []);
  const handleClose = useCallback(() => setModalVisible(false), []);

  const IconComponent = getIconComponent(selectedIcon);
  const label = iconNameToLabel(selectedIcon);

  return (
    <View testID={testID}>
      {/* Trigger button */}
      <Pressable
        onPress={handleOpen}
        accessibilityRole="button"
        accessibilityLabel={`Selected icon: ${label}. Tap to change`}
        style={[
          styles.trigger,
          {
            borderColor: theme.colors.border,
            backgroundColor: theme.colors.backgroundSecondary,
          },
        ]}
      >
        <View
          style={[styles.triggerIconBox, { backgroundColor: resolvedAccent }]}
        >
          {IconComponent && (
            <IconComponent
              size={TRIGGER_ICON_SIZE}
              weight={selectedWeight as IconWeight}
              color={selectedIconColor}
            />
          )}
        </View>
        <View style={styles.triggerTextContainer}>
          <Text
            style={[styles.triggerLabel, { color: theme.colors.text }]}
            numberOfLines={1}
          >
            {label}
          </Text>
          <Text
            style={[styles.triggerHint, { color: theme.colors.textSecondary }]}
          >
            Tap to change icon
          </Text>
        </View>
      </Pressable>

      {/* Modal */}
      <IconPickerModal
        visible={modalVisible}
        selectedIcon={selectedIcon}
        selectedWeight={selectedWeight}
        onSelectIcon={onSelectIcon}
        onSelectWeight={onSelectWeight}
        onClose={handleClose}
        accentColor={accentColor}
        testID={`${testID}-modal`}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create((theme) => ({
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.space[3],
    padding: theme.space[3],
    borderWidth: theme.borderWidth.thick,
    borderRadius: 0,
    ...shadowStyle(theme, "cardElevationSmall"),
  },
  triggerIconBox: {
    width: 52,
    height: 52,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: theme.borderWidth.medium,
    borderColor: theme.colors.border,
    borderRadius: 0,
  },
  triggerTextContainer: {
    flex: 1,
    gap: 2,
  },
  triggerLabel: {
    ...theme.textStyles.body,
    fontWeight: "600",
  },
  triggerHint: {
    ...theme.textStyles.caption,
  },
}));
