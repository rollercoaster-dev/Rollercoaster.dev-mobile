import { StyleSheet } from "react-native-unistyles";

export const styles = StyleSheet.create((theme) => ({
  container: {
    flex: 1,
    padding: theme.space[4],
  },
  content: {
    flex: 1,
    justifyContent: "center",
    gap: theme.space[6],
  },
  header: {
    gap: theme.space[2],
    alignItems: "center",
  },
  appName: {
    textAlign: "center",
  },
  tagline: {
    textAlign: "center",
    color: theme.colors.textSecondary,
  },
  themeSection: {
    gap: theme.space[3],
  },
  intro: {
    paddingHorizontal: theme.space[2],
  },
  introText: {
    textAlign: "center",
    color: theme.colors.textSecondary,
  },
  footer: {
    paddingTop: theme.space[4],
  },
}));
