import { StyleSheet } from "react-native-unistyles";
import { shadowStyle } from "../../styles/shadows";
import { GOAL_NODE_SIZE } from "../TimelineNode/TimelineNode.styles";

export const styles = StyleSheet.create((theme) => ({
  // Column wrapper: parent row on top, child sub-spine tucked underneath. Owns
  // the inter-step spacing so a parent and its children read as one group (#293).
  wrapper: {
    marginBottom: theme.space[4],
  },
  container: {
    flexDirection: "row",
  },
  nodeColumn: {
    width: GOAL_NODE_SIZE,
    alignItems: "center",
    marginRight: theme.space[3],
  },
  contentCard: {
    flex: 1,
    backgroundColor: theme.colors.backgroundSecondary,
    borderWidth: theme.borderWidth.medium,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    ...shadowStyle(theme, "cardElevationSmall"),
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: theme.space[3],
    paddingHorizontal: theme.space[4],
    minHeight: 44,
    gap: theme.space[2],
  },
  titleContainer: {
    flex: 1,
    marginLeft: theme.space[2],
  },
  title: {
    fontSize: theme.size.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
  },
  chevron: {
    fontSize: theme.size.sm,
    color: theme.colors.textSecondary,
  },
  chevronExpanded: {
    transform: [{ rotate: "180deg" }],
  },
  evidenceSection: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingVertical: theme.space[3],
    paddingHorizontal: theme.space[4],
  },
  evidenceCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.space[2],
    paddingVertical: theme.space[2],
    paddingHorizontal: theme.space[3],
    backgroundColor: theme.colors.background,
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    marginBottom: theme.space[1],
  },
  evidenceIcon: {
    fontSize: theme.size.sm,
  },
  evidenceLabel: {
    flex: 1,
    fontSize: theme.size.xs,
    color: theme.colors.text,
  },
  noEvidence: {
    fontSize: theme.size.xs,
    color: theme.colors.textSecondary,
    fontStyle: "italic",
  },
  // Indented sub-spine: a left rail descending from the parent node column
  // (GOAL_NODE_SIZE / 2 ≈ the parent node's centerline), holding the child rows
  // (#293, prototype `.jchildren-indent`).
  childSpine: {
    marginLeft: GOAL_NODE_SIZE / 2,
    marginTop: theme.space[2],
    paddingLeft: theme.space[4],
    borderLeftWidth: theme.borderWidth.thin,
    borderLeftColor: theme.colors.border,
  },
  childRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.space[3],
    marginBottom: theme.space[2],
  },
  // Slim card: thinner border, no elevation — visually subordinate to the parent.
  childContentCard: {
    flex: 1,
    backgroundColor: theme.colors.backgroundSecondary,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
  },
  childHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: theme.space[2],
    paddingHorizontal: theme.space[3],
    minHeight: 44,
    gap: theme.space[2],
  },
  childTitle: {
    fontSize: theme.size.sm,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
  },
}));
