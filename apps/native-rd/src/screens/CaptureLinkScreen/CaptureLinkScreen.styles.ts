import { StyleSheet } from 'react-native-unistyles';

export const styles = StyleSheet.create((theme) => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.space[4],
    paddingVertical: theme.space[2],
  },
  backIcon: {
    fontSize: 18,
    fontWeight: theme.fontWeight.bold,
  },
  spacer: {
    width: theme.space[12],
  },
  content: {
    flex: 1,
    padding: theme.space[4],
    gap: theme.space[4],
  },
  inputSection: {
    gap: theme.space[3],
  },
  previewCard: {
    padding: theme.space[4],
    gap: theme.space[2],
  },
  previewIcon: {
    fontSize: 32,
    textAlign: 'center',
  },
  previewUrl: {
    color: theme.colors.accentPrimary,
    textAlign: 'center',
  },
  actions: {
    gap: theme.space[3],
    marginTop: theme.space[2],
  },
}));
