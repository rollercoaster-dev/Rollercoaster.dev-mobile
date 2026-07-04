import { StyleSheet } from "react-native-unistyles";

// Same width as an md IconButton (ScreenHeader.styles.ts's SPACER_WIDTH), so
// the centered header label doesn't shift when the back arrow is absent.
const HEADER_SPACER_WIDTH = 44;

// Zero hardcoded hex (hard acceptance gate). Token map to the App Shell
// `newgoal` route: header band #a78bfa → chrome.screenHeaderBg (via
// HeaderBand) · progress fill #ffe50c → accentYellow (D4 — wizard position,
// not step state, so not journey-*) · card/input surface #fff → background ·
// ink border #0a0a0a → border · muted #737373 → textSecondary · CTA #2563eb →
// accentPrimary (via Button) · badge banner #ede9fe/#3b1f6b →
// accentPurpleLight/accentPrimary.
export const styles = StyleSheet.create((theme) => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },

  // --- Header band ---
  headerSpacer: {
    width: HEADER_SPACER_WIDTH,
  },
  headerLabel: {
    color: theme.chrome.screenHeaderFg,
    fontWeight: theme.fontWeight.bold,
  },

  // --- 4-segment progress bar (D4) ---
  progressRow: {
    flexDirection: "row" as const,
    gap: theme.space[2],
    paddingHorizontal: theme.space[4],
    paddingTop: theme.space[4],
  },
  progressSegment: {
    flex: 1,
    height: 6,
    borderWidth: theme.borderWidth.medium,
    borderColor: theme.colors.border,
  },
  progressSegmentFilled: {
    backgroundColor: theme.colors.accentYellow,
  },
  progressSegmentUnfilled: {
    backgroundColor: theme.colors.background,
  },

  // --- "step" / "build" placeholder body (D2, filled by #463/#464) ---
  placeholderBody: {
    flex: 1,
  },
}));
