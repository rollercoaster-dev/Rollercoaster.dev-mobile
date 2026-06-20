import { StyleSheet } from "react-native-unistyles";
import { shadowStyle } from "../../styles/shadows";

export const styles = StyleSheet.create((theme) => {
  const cardBase = {
    borderWidth: theme.borderWidth.thick,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.space[3],
    paddingVertical: theme.space[2],
    ...shadowStyle(theme, "cardElevationSmall"),
  } as const;

  return {
    container: {
      gap: theme.space[2],
    },
    stepItems: {
      position: "relative",
      gap: theme.space[2],
    },
    draggableItem: {
      ...cardBase,
    },
    draggingItem: {
      backgroundColor: theme.colors.backgroundSecondary,
      borderColor: theme.colors.accentPrimary,
      ...shadowStyle(theme, "modalElevation"),
      elevation: 4,
    },
    // Armed dwell-target feedback: a sustained dashed "success" outline that
    // stays for the whole time the row is armed (D16 revised — the transient
    // grow-and-settle pulse was imperceptible). Dashed + the success token make
    // it read as a distinct "drop here to nest" target, separate from the
    // dragged row's solid accent border. Same treatment for every motion
    // setting (no separate reduced-motion path needed — it's static).
    armedTargetItem: {
      borderStyle: "dashed",
      borderWidth: theme.borderWidth.thick + 1,
      borderColor: theme.colors.success,
    },
    // Reorder insertion indicator: a solid accent bar drawn at the real landing
    // slot (positioned from measured row geometry, not a fixed row height) so a
    // plain reorder shows exactly where the dragged row will come to rest. Uses
    // accentPrimary to match the dragged row — "this is where I go".
    dropLine: {
      position: "absolute",
      left: 0,
      right: 0,
      height: theme.borderWidth.thick + 1,
      backgroundColor: theme.colors.accentPrimary,
      borderRadius: theme.radius.sm,
      zIndex: 50,
    },
    // Nested drop destination: outline the full target substep rather than
    // relying on a small insertion line. It sits above the translated dragged
    // card so the destination remains legible during overlap.
    nestedDropOutline: {
      position: "absolute",
      left: theme.space[4] + theme.borderWidth.thick + theme.space[3],
      right: 0,
      borderStyle: "dashed",
      borderWidth: theme.borderWidth.thick + 1,
      borderColor: theme.colors.success,
      borderRadius: theme.radius.md,
      zIndex: 150,
    },
    groupDropOutline: {
      position: "absolute",
      left: 0,
      right: 0,
      borderStyle: "dashed",
      borderWidth: theme.borderWidth.thick + 1,
      borderColor: theme.colors.success,
      borderRadius: theme.radius.md,
      zIndex: 150,
    },
    stepRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.space[2],
    },
    dragHandle: {
      minWidth: 24,
      fontSize: 18,
      color: theme.colors.textMuted,
      textAlign: "center",
    },
    stepContent: {
      flex: 1,
      minHeight: 44,
      justifyContent: "center",
    },
    stepTitleText: {
      fontSize: theme.size.md,
      fontFamily: theme.fontFamily.body,
      color: theme.colors.text,
      paddingVertical: theme.space[1],
    },
    reorderButtons: {
      flexDirection: "row",
      gap: theme.space[1],
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: theme.space[2],
    },
    headerLabel: {
      fontSize: theme.size.xs,
      fontWeight: theme.fontWeight.bold,
      fontFamily: theme.fontFamily.body,
      textTransform: "uppercase",
      letterSpacing: theme.letterSpacing.wide,
      color: theme.colors.textMuted,
    },
    count: {
      fontSize: theme.size.xs,
      fontFamily: theme.fontFamily.mono,
      color: theme.colors.textSecondary,
    },
    editRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.space[2],
      minHeight: 48,
    },
    editInput: {
      flex: 1,
      fontSize: theme.size.md,
      fontFamily: theme.fontFamily.body,
      color: theme.colors.text,
      borderBottomWidth: theme.borderWidth.medium,
      borderBottomColor: theme.colors.accentPrimary,
      paddingVertical: theme.space[2],
    },
    addStepRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.space[2],
      minHeight: 48,
      marginTop: theme.space[2],
    },
    addStepInputCard: {
      flex: 1,
      ...cardBase,
    },
    addStepInput: {
      fontSize: theme.size.md,
      fontFamily: theme.fontFamily.body,
      color: theme.colors.text,
    },
    addStepButton: {
      width: 44,
      height: 44,
      backgroundColor: theme.colors.accentPrimary,
      borderWidth: theme.borderWidth.thick,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.sm,
      alignItems: "center",
      justifyContent: "center",
      ...shadowStyle(theme, "cardElevationSmall"),
    },
    addStepButtonText: {
      fontSize: 22,
      fontWeight: theme.fontWeight.bold,
      color: theme.colors.background,
    },
    addStepSection: {
      gap: theme.space[2],
      marginTop: theme.space[2],
    },
    evidencePickerRow: {
      paddingLeft: 36,
      paddingTop: theme.space[2],
      paddingBottom: theme.space[1],
    },
    evidenceIconsRow: {
      paddingLeft: 36,
      paddingTop: theme.space[1],
    },
    // --- Sub-step (one-level child) rows -------------------------------
    // A child row is indented behind a thick vertical "left rail" so the
    // parent→child relationship reads without relying on colour alone (D11).
    childRowWrapper: {
      flexDirection: "row",
      alignItems: "stretch",
      paddingLeft: theme.space[4],
      gap: theme.space[3],
    },
    leftRail: {
      width: theme.borderWidth.thick,
      backgroundColor: theme.colors.border,
      borderRadius: theme.radius.sm,
    },
    childRowContent: {
      flex: 1,
    },
    // "+ sub-step" ghost row: muted, no shadow — discoverable without
    // pressuring structure (D5). Indented to align under its parent.
    addSubStepGhost: {
      minHeight: 44,
      justifyContent: "center",
      marginLeft: theme.space[4],
      marginTop: theme.space[1],
      paddingHorizontal: theme.space[3],
      paddingVertical: theme.space[1],
      borderWidth: theme.borderWidth.medium,
      borderColor: theme.colors.border,
      borderStyle: "dashed",
      borderRadius: theme.radius.sm,
    },
    addSubStepText: {
      fontSize: theme.size.sm,
      fontFamily: theme.fontFamily.body,
      color: theme.colors.textMuted,
    },
    addSubStepInputRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.space[2],
      minHeight: 44,
      marginLeft: theme.space[4],
      marginTop: theme.space[1],
    },
    addSubStepInputCard: {
      flex: 1,
      ...cardBase,
    },
    addSubStepInput: {
      fontSize: theme.size.md,
      fontFamily: theme.fontFamily.body,
      color: theme.colors.text,
    },
    addSubStepPickerRow: {
      marginLeft: theme.space[4],
      marginTop: theme.space[1],
    },
    // --- "Nest under…" picker (screen-reader reparent path, Q1) ----------
    pickerOverlay: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: theme.space[4],
    },
    pickerContainer: {
      width: "100%",
      maxWidth: 400,
    },
    pickerCard: {
      ...cardBase,
      gap: theme.space[2],
    },
    pickerTitle: {
      marginBottom: theme.space[2],
    },
    pickerRow: {
      minHeight: 44,
      justifyContent: "center",
      paddingHorizontal: theme.space[3],
      paddingVertical: theme.space[2],
      borderWidth: theme.borderWidth.medium,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.sm,
      backgroundColor: theme.colors.backgroundSecondary,
    },
    pickerRowText: {
      fontSize: theme.size.md,
      fontFamily: theme.fontFamily.body,
      color: theme.colors.text,
    },
  };
});
