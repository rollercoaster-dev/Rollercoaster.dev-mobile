import { StyleSheet } from 'react-native-unistyles';
import { shadowStyle } from '../../styles/shadows';

export const styles = StyleSheet.create((theme) => ({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.space[6],
  },
  card: {
    alignItems: 'center',
    padding: theme.space[6],
    borderWidth: theme.borderWidth.medium,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.backgroundSecondary,
    gap: theme.space[3],
    ...shadowStyle(theme, 'hardMd'),
  },
  title: {
    color: theme.colors.text,
    textAlign: 'center',
  },
  message: {
    color: theme.colors.textSecondary,
    textAlign: 'center',
    fontSize: theme.size.sm,
    lineHeight: theme.lineHeight.sm,
  },
  action: {
    marginTop: theme.space[2],
  },
}));
