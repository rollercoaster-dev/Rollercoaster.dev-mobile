/**
 * EditGoalOverflowMenu — content of the ⋯ overflow menu on the Edit Goal view
 * (issue #445). A single destructive "Delete goal" row, demoting the loud
 * destructive button the old design used.
 *
 * Mirrors BadgeOverflowMenu's shape (#412, D7): content-only, pure, i18n-free
 * (D9, English default). It owns no open/close or positioning state and no
 * confirm-delete flow — the future [Integrate] issue drops it into its own
 * popover/Modal and wires `onDelete` to the existing confirm-delete UX.
 */
import React from "react";
import { View, Pressable } from "react-native";
import { Trash } from "phosphor-react-native";
import { useUnistyles } from "react-native-unistyles";
import { Text } from "../Text";
import { styles } from "./EditGoalOverflowMenu.styles";

export interface EditGoalOverflowMenuProps {
  onDelete: () => void;
  /** i18n-free copy (D9); English default, [Integrate] passes t() output. */
  deleteGoalLabel?: string;
}

export function EditGoalOverflowMenu({
  onDelete,
  deleteGoalLabel = "Delete goal",
}: EditGoalOverflowMenuProps) {
  const { theme } = useUnistyles();

  return (
    <View style={styles.menu}>
      <Pressable
        onPress={onDelete}
        accessible
        accessibilityRole="button"
        accessibilityLabel={deleteGoalLabel}
        testID="edit-goal-overflow-delete"
        style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      >
        <Trash size={18} weight="regular" color={theme.colors.error} />
        <Text variant="body" style={styles.deleteLabel}>
          {deleteGoalLabel}
        </Text>
      </Pressable>
    </View>
  );
}
