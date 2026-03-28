import { StyleSheet } from 'react-native-unistyles';
import { shadowStyle } from '../../styles/shadows';

export const styles = StyleSheet.create((theme) => ({
  container: {
    gap: theme.space[2],
  },
  label: {
    fontSize: theme.size.xs,
    fontWeight: theme.fontWeight.bold,
    fontFamily: theme.fontFamily.body,
    textTransform: 'uppercase' as const,
    letterSpacing: theme.letterSpacing.wide,
    color: theme.colors.textMuted,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.space[2],
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space[1],
    paddingHorizontal: theme.space[3],
    paddingVertical: theme.space[2],
    borderWidth: theme.borderWidth.thick,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.background,
    minHeight: 44,
    ...shadowStyle(theme, 'hardSm'),
  },
  chipSelected: {
    backgroundColor: theme.colors.accentPrimary,
    borderColor: theme.colors.border,
  },
  chipIcon: {
    fontSize: 16,
  },
  chipLabel: {
    fontSize: theme.size.sm,
    fontFamily: theme.fontFamily.body,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
  },
  chipLabelSelected: {
    color: theme.colors.background,
  },
  compactChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.space[1],
  },
  compactChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: theme.space[1],
    paddingVertical: 2,
    borderWidth: theme.borderWidth.medium,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  compactChipIcon: {
    fontSize: 12,
  },
  compactChipLabel: {
    fontSize: theme.size.xs,
    fontFamily: theme.fontFamily.body,
    color: theme.colors.textSecondary,
  },
}));
