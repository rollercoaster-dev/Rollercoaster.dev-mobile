import { StyleSheet } from 'react-native-unistyles';
import { shadowStyle } from '../../styles/shadows';

export const styles = StyleSheet.create((theme) => {
  const cardBase = {
    borderWidth: theme.borderWidth.thick,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.space[3],
    paddingVertical: theme.space[2],
    ...shadowStyle(theme, 'hardSm'),
  } as const;

  return {
  container: {
    gap: theme.space[2],
  },
  stepItems: {
    gap: theme.space[2],
  },
  draggableItem: {
    ...cardBase,
  },
  draggingItem: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderColor: theme.colors.accentPrimary,
    ...shadowStyle(theme, 'hardLg'),
    elevation: 4,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space[2],
  },
  dragHandle: {
    minWidth: 24,
    fontSize: 18,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
  stepContent: {
    flex: 1,
    minHeight: 44,
    justifyContent: 'center',
  },
  stepTitleText: {
    fontSize: theme.size.md,
    fontFamily: theme.fontFamily.body,
    color: theme.colors.text,
    paddingVertical: theme.space[1],
  },
  reorderButtons: {
    flexDirection: 'row',
    gap: theme.space[1],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.space[2],
  },
  headerLabel: {
    fontSize: theme.size.xs,
    fontWeight: theme.fontWeight.bold,
    fontFamily: theme.fontFamily.body,
    textTransform: 'uppercase',
    letterSpacing: theme.letterSpacing.wide,
    color: theme.colors.textMuted,
  },
  count: {
    fontSize: theme.size.xs,
    fontFamily: theme.fontFamily.mono,
    color: theme.colors.textSecondary,
  },
  editRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space[2],
    minHeight: 48,
  },
  editInput: {
    flex: 1,
    fontSize: theme.size.md,
    fontFamily: theme.fontFamily.body,
    color: theme.colors.text,
    borderBottomWidth: theme.borderWidth.medium,
    borderBottomColor: theme.colors.accentPrimary,
    paddingVertical: theme.space[2],
  },
  addStepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space[2],
    minHeight: 48,
    marginTop: theme.space[2],
  },
  addStepInputCard: {
    flex: 1,
    ...cardBase,
  },
  addStepInput: {
    fontSize: theme.size.md,
    fontFamily: theme.fontFamily.body,
    color: theme.colors.text,
  },
  addStepButton: {
    width: 44,
    height: 44,
    backgroundColor: theme.colors.accentPrimary,
    borderWidth: theme.borderWidth.thick,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadowStyle(theme, 'hardSm'),
  },
  addStepButtonText: {
    fontSize: 22,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.background,
  },
  addStepSection: {
    gap: theme.space[2],
    marginTop: theme.space[2],
  },
  evidencePickerRow: {
    paddingLeft: 36,
    paddingTop: theme.space[2],
    paddingBottom: theme.space[1],
  },
  evidenceIconsRow: {
    paddingLeft: 36,
    paddingTop: theme.space[1],
  },
  };
});
