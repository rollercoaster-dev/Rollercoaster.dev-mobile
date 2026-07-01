/**
 * BadgeOverflowMenu — the content of the ⋯ overflow menu on the Badge Detail
 * screen (issue #412, Track D3 of Epic #384).
 *
 * Three rows: Share badge / Export credential / Delete badge, with Delete in a
 * destructive tone. This ships the menu CONTENT only — the ⋯ trigger + its
 * `onOverflow` prop already ship on CelebrationHeroHeader (#410), and the
 * open/close state + positioning (absolute popover vs. Modal) belong to the
 * consumer that wires `onOverflow` (#380). Exposing it as a plain content block
 * lets #380 drop it into whatever container it chooses.
 *
 * Pure, prop-driven, i18n-free (D6). Rows use accessibilityRole="button" and
 * ship NO EXPO_PUBLIC_E2E_MODE Maestro-collapse guard — this is Storybook-only
 * and E2E handling belongs to #380 (Q2, resolved 2026-07-01).
 */
import React from "react";
import { View, Pressable } from "react-native";
import { Star, CodeBlock, Trash } from "phosphor-react-native";
import { useUnistyles } from "react-native-unistyles";
import { Text } from "../../components/Text";
import { styles } from "./BadgeOverflowMenu.styles";

export interface BadgeOverflowMenuProps {
  onShareBadge: () => void;
  onExportCredential: () => void;
  onDelete: () => void;
  /** Enables the Export credential row (a credential exists). */
  hasCredential: boolean;

  // --- Copy (i18n-free per D6; English defaults, #380 passes t() output). ---
  shareBadgeLabel?: string;
  exportCredentialLabel?: string;
  deleteBadgeLabel?: string;
}

export function BadgeOverflowMenu({
  onShareBadge,
  onExportCredential,
  onDelete,
  hasCredential,
  shareBadgeLabel = "Share badge",
  exportCredentialLabel = "Export credential",
  deleteBadgeLabel = "Delete badge",
}: BadgeOverflowMenuProps) {
  const { theme } = useUnistyles();

  return (
    <View style={styles.menu}>
      {/* eslint-disable-next-line local/no-shared-component-reimplementation */}
      <Pressable
        onPress={onShareBadge}
        accessible
        accessibilityRole="button"
        accessibilityLabel={shareBadgeLabel}
        testID="overflow-row-share"
        style={({ pressed }) => [
          styles.row,
          styles.rowDivider,
          pressed && styles.rowPressed,
        ]}
      >
        <Star
          size={18}
          weight="fill"
          color={theme.surfaceBorder.surfaceCardFg}
        />
        <Text variant="body" style={styles.label}>
          {shareBadgeLabel}
        </Text>
      </Pressable>

      {/* eslint-disable-next-line local/no-shared-component-reimplementation */}
      <Pressable
        onPress={onExportCredential}
        disabled={!hasCredential}
        accessible
        accessibilityRole="button"
        accessibilityLabel={exportCredentialLabel}
        accessibilityState={{ disabled: !hasCredential }}
        testID="overflow-row-credential"
        style={({ pressed }) => [
          styles.row,
          styles.rowDivider,
          pressed && hasCredential && styles.rowPressed,
          !hasCredential && styles.rowDisabled,
        ]}
      >
        <CodeBlock
          size={18}
          weight="regular"
          color={theme.surfaceBorder.surfaceCardFg}
        />
        <Text variant="body" style={styles.label}>
          {exportCredentialLabel}
        </Text>
      </Pressable>

      {/* eslint-disable-next-line local/no-shared-component-reimplementation */}
      <Pressable
        onPress={onDelete}
        accessible
        accessibilityRole="button"
        accessibilityLabel={deleteBadgeLabel}
        testID="overflow-row-delete"
        style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      >
        <Trash size={18} weight="regular" color={theme.colors.error} />
        <Text variant="body" style={styles.deleteLabel}>
          {deleteBadgeLabel}
        </Text>
      </Pressable>
    </View>
  );
}
