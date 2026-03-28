import { StyleSheet } from 'react-native-unistyles';
import { shadowStyle } from '../../styles/shadows';

export const styles = StyleSheet.create((theme) => ({
  container: {
    flex: 1,
  },
  trackWrapper: {
    flex: 1,
    position: 'relative' as const,
  },
  track: {
    flex: 1,
    position: 'relative' as const,
    width: '100%',
    overflow: 'hidden' as const,
  },
  arrowContainer: {
    position: 'absolute' as const,
    top: 0,
    bottom: 0,
    justifyContent: 'center' as const,
    zIndex: 10,
  },
  arrowLeft: {
    left: theme.space[1],
  },
  arrowRight: {
    right: theme.space[1],
  },
  arrow: {
    width: 44,
    height: 44,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.backgroundSecondary,
    borderWidth: theme.borderWidth.medium,
    borderColor: theme.colors.border,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    ...shadowStyle(theme, 'hardSm'),
  },
  arrowDisabled: {
    opacity: 0.3,
  },
  arrowText: {
    fontSize: theme.size['2xl'],
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    fontFamily: theme.fontFamily.body,
  },
  indicatorRow: {
    alignItems: 'center' as const,
    paddingVertical: theme.space[2],
    paddingHorizontal: theme.space[2],
  },
}));
