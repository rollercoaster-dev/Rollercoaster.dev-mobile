import { StyleSheet } from "react-native-unistyles";

/** Grid cell dimensions */
export const MODAL_ICON_SIZE = 28;
export const MODAL_CELL_SIZE = 56;
export const MODAL_GRID_COLUMNS = 5;
/** Row height = cell + vertical gap */
export const MODAL_ROW_HEIGHT = MODAL_CELL_SIZE + 8;

export const styles = StyleSheet.create((theme) => ({
  modalRoot: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  contentArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },

  headerTitle: {
    ...theme.textStyles.title,
    color: theme.colors.accentPurpleFg,
  },
  headerSpacer: {
    width: 48,
  },
  closeButton: {
    width: 48,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
  },
  closeIconFallback: {
    color: theme.colors.accentPurpleFg,
    fontSize: 18,
    fontWeight: "700",
  },

  // -- Preview bar --
  previewBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.space[3],
    paddingHorizontal: theme.space[4],
    paddingVertical: theme.space[3],
    backgroundColor: theme.colors.backgroundSecondary,
  },
  previewIconContainer: {
    width: 56,
    height: 56,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: theme.borderWidth.medium,
    borderColor: theme.colors.border,
    borderRadius: 0,
  },
  previewLabel: {
    ...theme.textStyles.body,
    color: theme.colors.text,
    flex: 1,
  },

  // -- Search --
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: theme.space[4],
    paddingVertical: theme.space[2],
    gap: theme.space[2],
  },
  searchInput: {
    flex: 1,
    height: 44,
    borderWidth: theme.borderWidth.thick,
    borderColor: theme.colors.border,
    borderRadius: 0,
    paddingHorizontal: theme.space[3],
    fontSize: 16,
    fontFamily: theme.fontFamily.body,
    color: theme.colors.text,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  searchCount: {
    ...theme.textStyles.caption,
    color: theme.colors.textMuted,
    minWidth: 50,
    textAlign: "center",
  },
  clearButton: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  clearButtonText: {
    fontSize: 18,
    fontWeight: "700",
    fontFamily: theme.fontFamily.body,
    color: theme.colors.textSecondary,
  },

  // -- Category tabs --
  categoryContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.space[2],
    paddingHorizontal: theme.space[4],
    paddingVertical: theme.space[2],
    borderBottomWidth: theme.borderWidth.thin,
    borderBottomColor: theme.colors.border,
  },
  categoryTab: {
    minWidth: 44,
    minHeight: 44,
    paddingHorizontal: theme.space[2],
    paddingVertical: theme.space[1],
    justifyContent: "center",
    alignItems: "center",
    borderWidth: theme.borderWidth.medium,
    borderColor: "transparent",
    borderRadius: 0,
  },
  categoryTabActive: {
    borderColor: theme.colors.border,
    borderWidth: theme.borderWidth.thick,
  },

  // -- Icon grid --
  gridContent: {
    paddingVertical: theme.space[2],
  },
  gridColumnWrapper: {
    paddingHorizontal: theme.space[4],
    justifyContent: "flex-start",
    gap: theme.space[1],
  },
  iconCell: {
    width: MODAL_CELL_SIZE,
    height: MODAL_CELL_SIZE,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "transparent",
    borderRadius: 0,
    margin: 4,
  },
  iconCellSelected: {
    borderColor: theme.colors.border,
  },
  iconLabel: {
    fontSize: 9,
    fontFamily: theme.fontFamily.body,
    color: theme.colors.textMuted,
    marginTop: 2,
    textAlign: "center",
  },
  iconLabelSelected: {
    color: theme.colors.background,
  },
  emptyContainer: {
    padding: theme.space[8],
    alignItems: "center",
  },
  emptyText: {
    ...theme.textStyles.body,
    color: theme.colors.textSecondary,
  },

  // -- Weight bar --
  weightBar: {
    flexDirection: "row",
    borderTopWidth: theme.borderWidth.thick,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  weightSegment: {
    flex: 1,
    minHeight: 44,
    justifyContent: "center",
    alignItems: "center",
    borderRightWidth: theme.borderWidth.medium,
    borderRightColor: theme.colors.border,
  },
  weightSegmentLast: {
    borderRightWidth: 0,
  },
  weightLabel: {
    fontSize: 12,
    fontWeight: "600",
    fontFamily: theme.fontFamily.body,
    color: theme.colors.text,
  },
  weightLabelActive: {
    color: theme.colors.background,
  },
}));
