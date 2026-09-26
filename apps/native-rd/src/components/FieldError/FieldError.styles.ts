import { StyleSheet } from "react-native-unistyles";

export const styles = StyleSheet.create((theme) => ({
  message: {
    fontSize: theme.size.sm,
    fontFamily: theme.fontFamily.body,
    color: theme.colors.text,
    borderLeftWidth: theme.borderWidth.medium,
    borderLeftColor: theme.colors.error,
    paddingLeft: theme.space[2],
  },
}));
