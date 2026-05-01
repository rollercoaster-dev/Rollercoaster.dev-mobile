import { StyleSheet } from "react-native-unistyles";
import { shadowStyle } from "../../styles/shadows";

export const styles = StyleSheet.create((theme) => ({
  button: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.accentPrimary,
    borderWidth: theme.borderWidth.medium,
    borderColor: theme.colors.text,
    alignItems: "center",
    justifyContent: "center",
    ...shadowStyle(theme, "modalElevation"),
  },
  pressed: {
    transform: [{ translateX: 2 }, { translateY: 2 }],
    shadowOffset: { width: 0, height: 0 },
  },
  icon: {
    fontSize: 20,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.background,
    lineHeight: 22,
  },
  iconOpen: {
    transform: [{ rotate: "45deg" }],
  },
}));
