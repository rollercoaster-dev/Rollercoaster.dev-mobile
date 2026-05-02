import { StyleSheet } from "react-native-unistyles";

export const styles = StyleSheet.create((theme) => ({
  overlay: {
    flex: 1,
    // eslint-disable-next-line local/no-raw-colors -- fullscreen media overlay, intentionally opaque black
    backgroundColor: "black",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingHorizontal: theme.space[4],
    paddingVertical: theme.space[2],
  },
  closeText: {
    fontSize: 18,
    // eslint-disable-next-line local/no-raw-colors -- white-on-black media overlay chrome
    color: "white",
    fontWeight: theme.fontWeight.bold,
  },
}));
