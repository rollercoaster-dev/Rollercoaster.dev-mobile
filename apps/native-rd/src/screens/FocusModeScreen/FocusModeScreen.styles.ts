import { StyleSheet } from "react-native-unistyles";
import { PEEK_HEIGHT } from "../../components/EvidenceDrawer/EvidenceDrawer.styles";
import { shadowStyle } from "../../styles/shadows";

export const styles = StyleSheet.create((theme) => ({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.accentPurple,
  },
  keyboardAvoidingView: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: theme.space[4],
    paddingVertical: theme.space[2],
    paddingBottom: theme.space[4],
    backgroundColor: theme.colors.accentPurple,
    zIndex: 1,
    ...shadowStyle(theme, "hardMd"),
  },
  topBarTitle: {
    color: theme.colors.accentPurpleFg,
  },
  backIcon: {
    fontSize: 18,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.accentPurpleFg,
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
