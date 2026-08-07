import { StyleSheet } from "react-native-unistyles";

// Host shell only — every pixel inside the frame belongs to NewGoalWizard,
// which brings its own header band, progress bar, step bodies and footer. No
// SafeAreaView: App.tsx already applies `marginTop: insets.top` around the
// whole NavigationContainer, and a native-stack `presentation: "modal"` screen
// renders on that same surface tree (D9).
export const styles = StyleSheet.create((theme) => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
}));
