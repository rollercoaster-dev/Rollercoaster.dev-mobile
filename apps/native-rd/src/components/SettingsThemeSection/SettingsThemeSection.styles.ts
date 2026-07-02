import { StyleSheet } from "react-native-unistyles";

export const styles = StyleSheet.create((theme) => ({
  // SettingsSection's rows container has no built-in padding (that lives inside
  // SettingsRow, which this section doesn't use), so the rail + card wrapper
  // supplies its own inset and the vertical gap between rail and preview.
  content: {
    padding: theme.space[4],
    gap: theme.space[3],
  },
}));
