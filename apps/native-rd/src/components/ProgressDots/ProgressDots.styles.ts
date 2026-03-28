import { StyleSheet } from 'react-native-unistyles';

export const styles = StyleSheet.create((theme) => ({
  container: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: theme.space[3],
    paddingHorizontal: theme.space[4],
    paddingTop: theme.space[3],
    paddingBottom: theme.space[2],
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: theme.borderWidth.medium,
    borderColor: theme.colors.textMuted,
    backgroundColor: 'transparent',
  },
  dotCompleted: {
    backgroundColor: theme.colors.success,
    borderColor: theme.colors.success,
  },
  dotInProgress: {
    backgroundColor: theme.colors.accentPrimary,
    borderColor: theme.colors.accentPrimary,
  },
  dotCurrent: {
    transform: [{ scale: 1.3 }],
  },
  dotGoal: {
    width: 16,
    height: 16,
    borderRadius: 2,
    borderWidth: theme.borderWidth.medium,
    borderColor: theme.colors.warning,
    backgroundColor: theme.colors.warning,
    transform: [{ rotate: '45deg' }],
  },
  dotGoalCurrent: {
    borderColor: theme.colors.border,
    transform: [{ rotate: '45deg' }, { scale: 1.3 }],
  },
}));
