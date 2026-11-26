import { StyleSheet } from "react-native-unistyles";

export const styles = StyleSheet.create({
  sampleTextCol: {
    flex: 1,
  },
  cardStacked: {
    flexDirection: "column",
    alignItems: "flex-start",
  },
  // flex: 1 (basis 0) collapses the column's height when stacked; flex: 0
  // keeps its content height (flexGrow/flexBasis did not, on Android).
  sampleTextColStacked: {
    flex: 0,
    alignSelf: "stretch",
  },
});
