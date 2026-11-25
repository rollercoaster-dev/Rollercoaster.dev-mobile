import { StyleSheet } from "react-native-unistyles";

export const styles = StyleSheet.create((theme) => ({
  note: {
    marginTop: theme.space[2],
    paddingHorizontal: theme.space[4],
    color: theme.colors.textMuted,
  },
}));
