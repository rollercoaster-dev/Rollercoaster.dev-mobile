import { StyleSheet } from "react-native-unistyles";
import { PEEK_HEIGHT } from "../../components/EvidenceDrawer/EvidenceDrawer.styles";
import { shadowStyle } from "../../styles/shadows";

export const styles = StyleSheet.create((theme) => ({
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: theme.space[4],
    paddingVertical: theme.space[2],
    paddingBottom: theme.space[4],
    backgroundColor: theme.colors.accentYellow,
    zIndex: 1,
    ...shadowStyle(theme, "hardMd"),
  },
  backIcon: {
    fontSize: 18,
    fontWeight: theme.fontWeight.bold,
  },
  spacer: {
    width: 48,
  },
  loadingIndicator: {
    marginTop: theme.space[8],
  },
  content: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: theme.space[4],
  },
  carouselSection: {
    flex: 1,
    paddingBottom: PEEK_HEIGHT + theme.space[3],
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: theme.space[4],
    paddingVertical: theme.space[2],
    gap: theme.space[3],
  },
  title: {
    flex: 1,
  },
}));
