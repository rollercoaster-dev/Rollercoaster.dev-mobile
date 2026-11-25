/**
 * GoalActionsMenu — what the ⋯ on a cockpit goal card opens (#695).
 *
 * Goal management used to hide behind a long press on the card; the ⋯ makes
 * it visible, matching the ⋯ on Badge Detail. Long press stays as a shortcut
 * to delete. The menu is centred and titled with the goal's name, so it is
 * clear which card it belongs to wherever the ⋯ was tapped.
 */
import React from "react";
import { Modal, Pressable, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useUnistyles } from "react-native-unistyles";
import { Pencil, Trash } from "phosphor-react-native";
import { Text } from "../../components/Text";
import { styles } from "./GoalActionsMenu.styles";

export interface GoalActionsMenuProps {
  /** The goal the menu acts on, or null when closed. */
  goal: { id: string; title: string } | null;
  onEdit: (goalId: string) => void;
  onDelete: (goalId: string) => void;
  onClose: () => void;
  /** iOS: the menu has finished closing (Modal onDismiss). */
  onDismissed?: () => void;
}

export function GoalActionsMenu({
  goal,
  onEdit,
  onDelete,
  onClose,
  onDismissed,
}: GoalActionsMenuProps) {
  const { t } = useTranslation(["goals"]);
  const { theme } = useUnistyles();

  return (
    <Modal
      visible={goal !== null}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      onDismiss={onDismissed}
      accessibilityViewIsModal
    >
      {/* eslint-disable-next-line local/no-shared-component-reimplementation */}
      <Pressable
        style={[
          styles.backdrop,
          { backgroundColor: `${theme.colors.shadow}80` },
        ]}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel={t("goals:goalMenu.dismiss")}
        testID="goal-menu-backdrop"
      />
      <View style={styles.center} pointerEvents="box-none">
        {goal ? (
          <View style={styles.menu} testID="goal-menu">
            <Text
              variant="title"
              style={styles.title}
              numberOfLines={3}
              accessibilityRole="header"
            >
              {goal.title}
            </Text>
            {/* eslint-disable-next-line local/no-shared-component-reimplementation */}
            <Pressable
              onPress={() => onEdit(goal.id)}
              accessible
              accessibilityRole="button"
              accessibilityLabel={t("goals:goalMenu.edit")}
              testID="goal-menu-edit"
              style={({ pressed }) => [
                styles.row,
                styles.rowDivider,
                pressed && styles.rowPressed,
              ]}
            >
              <Pencil
                size={18}
                weight="regular"
                color={theme.surfaceBorder.surfaceCardFg}
              />
              <Text variant="body" style={styles.label}>
                {t("goals:goalMenu.edit")}
              </Text>
            </Pressable>
            {/* eslint-disable-next-line local/no-shared-component-reimplementation */}
            <Pressable
              onPress={() => onDelete(goal.id)}
              accessible
              accessibilityRole="button"
              accessibilityLabel={t("goals:goalMenu.delete")}
              testID="goal-menu-delete"
              style={({ pressed }) => [
                styles.row,
                pressed && styles.rowPressed,
              ]}
            >
              <Trash size={18} weight="regular" color={theme.colors.error} />
              <Text variant="body" style={styles.deleteLabel}>
                {t("goals:goalMenu.delete")}
              </Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}
