import { StyleSheet } from "react-native-unistyles";
import { DRAWER_CLOSED_HEIGHT } from "../../components/EvidenceDrawer/EvidenceDrawer.styles";

export const styles = StyleSheet.create((theme) => ({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  keyboardAvoidingView: {
    flex: 1,
    backgroundColor: theme.colors.background,
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
    paddingBottom: DRAWER_CLOSED_HEIGHT + theme.space[3],
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
