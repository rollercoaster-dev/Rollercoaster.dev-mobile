import { StyleSheet } from "react-native-unistyles";

/**
 * Bottom-sheet chrome shared by every consumer of {@link AnimatedSheet} /
 * {@link SheetSurface}. Lifted out of `EvidenceTypePicker.styles.ts` with the
 * shell itself (#573, D3) — a shared sheet importing styles from one specific
 * consumer was a backwards dependency.
 */
export const sheetStyles = StyleSheet.create((theme) => ({
  // In-tree overlay (no RN Modal): fills the nearest screen-sized ancestor and
  // anchors the sheet to its bottom edge. zIndex tiers: scrim below, sheet
  // above sibling content.
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "flex-end",
    zIndex: 20,
  },
  // Fading scrim layer: theme.colors.shadow at ~80% alpha (the `cc` suffix).
  scrim: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: `${theme.colors.shadow}cc`,
  },
  // Backdrop press target fills the scrim; tapping the exposed area dismisses.
  // Rendered before the sheet so the sheet sits on top and absorbs its own taps.
  backdrop: {
    flex: 1,
  },
  // Sheet chrome: opaque surface, medium top border + thin side borders,
  // rounded top corners. Bottom safe-area inset is
  // folded into paddingBottom (the root is a plain View, not SafeAreaView —
  // unistyles styles on SafeAreaView are dropped on web).
  sheet: (bottomInset: number) => ({
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    borderTopWidth: theme.borderWidth.medium,
    borderTopColor: theme.colors.border,
    borderLeftWidth: theme.borderWidth.thin,
    borderRightWidth: theme.borderWidth.thin,
    borderLeftColor: theme.colors.border,
    borderRightColor: theme.colors.border,
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.space[4],
    paddingTop: theme.space[3],
    paddingBottom: theme.space[4] + bottomInset,
    gap: theme.space[3],
    overflow: "hidden" as const,
  }),
  handle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.border,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sheetTitle: {
    fontSize: theme.size.lg,
    fontWeight: theme.fontWeight.bold,
    fontFamily: theme.fontFamily.headline,
    color: theme.colors.text,
  },
  // 44x44 tap target for the × dismiss control.
  closeButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  closeIcon: {
    fontSize: theme.size.lg,
    color: theme.colors.text,
  },
  // Prototype renders the sub-line in DM Mono.
  subLine: {
    fontFamily: theme.fontFamily.mono,
    fontSize: theme.size.sm,
    color: theme.colors.textMuted,
  },
}));
