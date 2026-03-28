import { StyleSheet } from 'react-native-unistyles';

export const styles = StyleSheet.create((theme) => ({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.space[4],
  },
  container: {
    width: '100%',
    maxWidth: 400,
  },
  content: {
    gap: theme.space[2],
    marginBottom: theme.space[4],
  },
  title: {
    textAlign: 'left',
  },
  message: {
    textAlign: 'left',
    color: theme.colors.textSecondary,
  },
  actions: {
    gap: theme.space[2],
  },
}));
