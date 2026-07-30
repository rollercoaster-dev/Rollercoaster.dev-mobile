import { StyleSheet } from "react-native-unistyles";
import { PILL_LIFT } from "../../navigation/FocusPillTabBar";

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
  cardSection: {
    flex: 1,
    // Breathing room between the progress strip and the card's top edge — the
    // strip is otherwise flush, leaving the card cramped up top.
    paddingTop: theme.space[4],
    paddingHorizontal: theme.space[4],
    // The card pins its footer to this section's bottom edge, so the section owns
    // the clearance for the part of the tab pill that sticks up above its own slot
    // (`PILL_LIFT`) — without it the pill buries the footer's helper line. Not
    // `useTabScreenContentInset()`: that doubles the lift and adds the safe-area
    // inset for content scrolling *under* the bar, stranding ~100pt of dead space
    // beneath a pinned footer.
    paddingBottom: PILL_LIFT + theme.space[3],
  },
  // The parked state's scroll body (D9). `flexGrow` lets a short list center in
  // the section the way the card's own short states do, while a long one still
  // scrolls. Tab-pill clearance already comes from `cardSection`, this ScrollView's
  // parent — the padding here is just breathing room under the last row.
  parkedScrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingBottom: theme.space[3],
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
