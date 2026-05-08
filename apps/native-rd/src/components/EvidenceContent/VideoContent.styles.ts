import { StyleSheet } from "react-native-unistyles";

export const styles = StyleSheet.create((theme) => ({
  container: {
    flex: 1,
    // eslint-disable-next-line local/no-raw-colors -- fullscreen media canvas, intentionally opaque black
    backgroundColor: "black",
  },
  videoContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  video: {
    width: "100%",
    height: "100%",
  },
  errorText: {
    // eslint-disable-next-line local/no-raw-colors -- white-on-black media overlay chrome
    color: "white",
    fontSize: theme.size.sm,
    fontFamily: theme.fontFamily.body,
    textAlign: "center",
  },
  errorBlock: {
    alignItems: "center",
    gap: theme.space[3],
  },
  retryButton: {
    paddingVertical: theme.space[2],
    paddingHorizontal: theme.space[4],
    // eslint-disable-next-line local/no-raw-colors -- chrome over media canvas
    borderColor: "white",
    borderWidth: theme.borderWidth.medium,
    borderRadius: theme.radius.sm,
  },
  retryLabel: {
    // eslint-disable-next-line local/no-raw-colors -- chrome over media canvas
    color: "white",
    fontSize: theme.size.sm,
    fontWeight: theme.fontWeight.bold,
    fontFamily: theme.fontFamily.body,
  },
}));
