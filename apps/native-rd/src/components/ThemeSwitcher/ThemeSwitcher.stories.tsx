import React from "react";
import { View } from "react-native";
import { UnistylesRuntime } from "react-native-unistyles";
import { ThemeProvider, useTheme } from "../../hooks/useTheme";
import { ToastProvider } from "../Toast";
import { ThemeSwitcher } from "./ThemeSwitcher";

export default {
  title: "Components/ThemeSwitcher",
  component: ThemeSwitcher,
};

/**
 * ThemeSwitcher consumes `useThemeContext()` (for the current theme + a
 * persisting setTheme) and `useToast()` (to report a failed persist). In the
 * app both providers sit above it; Storybook has neither, so supply a working
 * ThemeProvider whose setTheme applies via Unistyles and a ToastProvider so the
 * component renders. Persistence to Evolu is a no-op here — setTheme returns
 * true so no error toast fires.
 */
function StoryProviders({ children }: { children: React.ReactNode }) {
  const base = useTheme();
  const value = {
    ...base,
    setTheme: (name: (typeof base)["themeName"]) => {
      UnistylesRuntime.setTheme(name);
      return true;
    },
  };
  return (
    <ThemeProvider value={value}>
      <ToastProvider>{children}</ToastProvider>
    </ThemeProvider>
  );
}

export function Default() {
  return (
    <StoryProviders>
      <View style={{ padding: 16 }}>
        <ThemeSwitcher />
      </View>
    </StoryProviders>
  );
}
