import { StyleSheet } from 'react-native-unistyles';
import { shadowStyle } from '../../styles/shadows';

export const styles = StyleSheet.create((theme) => ({
  container: {
    gap: 0,
  },
  title: {
    fontSize: theme.size.xs,
    fontWeight: theme.fontWeight.bold,
    fontFamily: theme.fontFamily.body,
    textTransform: 'uppercase',
    letterSpacing: theme.letterSpacing.wide,
    color: theme.colors.textMuted,
    marginBottom: theme.space[2],
    paddingHorizontal: theme.space[4],
  },
  rows: {
    borderWidth: theme.borderWidth.medium,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    overflow: 'hidden',
    backgroundColor: theme.colors.backgroundSecondary,
    ...shadowStyle(theme, 'hardMd'),
  },
  separator: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginHorizontal: theme.space[4],
  },
}));
