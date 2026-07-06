import { StyleSheet } from "react-native-unistyles";

export const styles = StyleSheet.create((theme) => ({
  band: {
    flex: 1,
    flexDirection: "column",
    // Full-bleed celebration band — reuses the existing #419 celebration tokens
    // that already back Badge Detail's hero header (D5).
    backgroundColor: theme.chrome.celebrationBg,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: theme.space[6],
  },
  eyebrow: {
    color: theme.chrome.celebrationFg,
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginBottom: theme.space[5],
  },
  badge: {
    marginBottom: theme.space[6],
  },
  goalTitle: {
    color: theme.chrome.celebrationFg,
    textAlign: "center",
    marginBottom: theme.space[1],
  },
  earnedDate: {
    color: theme.chrome.celebrationFg,
  },
  footer: {
    paddingHorizontal: theme.space[5],
    paddingBottom: theme.space[6],
    paddingTop: theme.space[2],
  },
  backLink: {
    alignSelf: "center",
    marginTop: theme.space[3],
  },
  backLinkText: {
    color: theme.chrome.celebrationFg,
    fontWeight: theme.fontWeight.semibold,
    textDecorationLine: "underline",
  },
}));
