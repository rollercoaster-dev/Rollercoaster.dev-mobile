import { StyleSheet } from 'react-native-unistyles';

export const styles = StyleSheet.create((theme) => ({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space[3],
    padding: theme.space[3],
    backgroundColor: theme.colors.backgroundSecondary,
    borderWidth: theme.borderWidth.medium,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.accentPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: theme.borderWidth.medium,
    borderColor: theme.colors.border,
  },
  playButtonPressed: {
    opacity: 0.8,
  },
  playIcon: {
    fontSize: 16,
    color: theme.colors.background,
  },
  progressContainer: {
    flex: 1,
  },
  progressTrack: {
    height: 6,
    backgroundColor: theme.colors.backgroundTertiary,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.accentPrimary,
    borderRadius: 3,
  },
  timeText: {
    fontSize: theme.size.xs,
    fontFamily: theme.fontFamily.mono,
    color: theme.colors.textMuted,
    minWidth: 40,
    textAlign: 'right',
  },
}));
