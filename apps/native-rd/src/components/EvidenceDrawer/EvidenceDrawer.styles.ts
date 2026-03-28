import { StyleSheet } from 'react-native-unistyles';
import { palette } from '../../themes/palette';

/**
 * Collapsed height of the EvidenceDrawer in points.
 * Used as both the CSS minHeight for the handle area and the
 * Reanimated shared value initial/collapsed target — keep them in sync.
 */
export const PEEK_HEIGHT = 56;

export const styles = StyleSheet.create((theme) => ({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: `${theme.colors.shadow}cc`,
    zIndex: 20,
  },
  overlayPressable: {
    flex: 1,
  },
  drawer: (isGoal: boolean) => ({
    position: 'absolute' as const,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: theme.colors.background,
    borderTopWidth: isGoal ? 3 : theme.borderWidth.medium,
    borderTopColor: isGoal ? palette.yellow300 : theme.colors.border,
    borderLeftWidth: theme.borderWidth.thin,
    borderRightWidth: theme.borderWidth.thin,
    borderLeftColor: theme.colors.border,
    borderRightColor: theme.colors.border,
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    zIndex: 21,
    overflow: 'hidden' as const,
  }),
  handleArea: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingVertical: theme.space[3],
    paddingHorizontal: theme.space[4],
    minHeight: PEEK_HEIGHT,
  },
  handleLeft: {
    flexDirection: 'column' as const,
    alignItems: 'center' as const,
    flex: 1,
    gap: theme.space[1],
  },
  handleBar: (isGoal: boolean) => ({
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: isGoal ? palette.yellow300 : theme.colors.textMuted,
  }),
  handleLabel: {
    fontSize: theme.size.sm,
    color: theme.colors.textSecondary,
    fontFamily: theme.fontFamily.body,
    fontWeight: theme.fontWeight.bold,
  },
  scrollView: {
    flex: 1,
  },
  grid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: theme.space[2],
    paddingTop: 0,
    paddingHorizontal: theme.space[4],
    paddingBottom: theme.space[6],
  },
  gridItem: (width: number) => ({
    width,
  }),
  emptyText: {
    fontSize: theme.size.sm,
    color: theme.colors.textMuted,
    fontFamily: theme.fontFamily.body,
    fontStyle: 'italic',
    textAlign: 'center',
    width: '100%',
    paddingVertical: theme.space[4],
  },
  fabMenuContainer: {
    alignItems: 'flex-end' as const,
    paddingHorizontal: theme.space[4],
    paddingBottom: theme.space[2],
  },
}));
