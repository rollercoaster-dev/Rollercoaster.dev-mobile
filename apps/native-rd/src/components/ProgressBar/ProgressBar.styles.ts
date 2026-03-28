import { StyleSheet } from 'react-native-unistyles';

export const styles = StyleSheet.create((theme) => ({
  track: {
    height: 8,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.backgroundTertiary,
    borderWidth: theme.borderWidth.medium,
    borderColor: theme.colors.border,
    overflow: 'hidden' as const,
  },
  fillBase: {
    height: '100%' as const,
    backgroundColor: theme.colors.accentPrimary,
  },
}));
