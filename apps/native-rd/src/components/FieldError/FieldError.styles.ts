import { StyleSheet } from "react-native-unistyles";

export const styles = StyleSheet.create((theme) => ({
  message: {
    borderLeftWidth: theme.borderWidth.medium,
    borderLeftColor: theme.colors.error,
    paddingLeft: theme.space[2],
  },
}));
