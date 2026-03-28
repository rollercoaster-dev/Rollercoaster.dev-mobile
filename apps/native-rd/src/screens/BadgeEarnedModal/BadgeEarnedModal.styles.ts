import { StyleSheet } from 'react-native-unistyles';
import { shadowStyle } from '../../styles/shadows';

export const styles = StyleSheet.create((theme) => ({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.space[4],
  },
  container: {
    width: '100%',
    maxWidth: 340,
  },
  card: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderWidth: theme.borderWidth.medium,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    padding: theme.space[6],
    alignItems: 'center',
    ...shadowStyle(theme, 'hardMd'),
  },
  badgeImage: {
    width: 120,
    height: 120,
    marginBottom: theme.space[4],
    borderRadius: theme.radius.sm,
  },
  badgePlaceholder: {
    width: 120,
    height: 120,
    borderWidth: theme.borderWidth.medium,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.background,
    marginBottom: theme.space[4],
    alignItems: 'center',
    justifyContent: 'center',
  },
  microcopy: {
    textAlign: 'center',
    color: theme.colors.textSecondary,
    marginBottom: theme.space[5],
  },
  actions: {
    width: '100%',
    gap: theme.space[3],
  },
}));
