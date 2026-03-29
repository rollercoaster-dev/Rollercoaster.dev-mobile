import { StyleSheet } from "react-native-unistyles";
import type { space } from "../../themes/tokens";

export const styles = StyleSheet.create((theme) => ({
  divider: (spacing: keyof typeof space = "3") => ({
    height: theme.borderWidth.medium,
    backgroundColor: theme.colors.border,
    marginVertical: theme.space[spacing],
  }),
}));
