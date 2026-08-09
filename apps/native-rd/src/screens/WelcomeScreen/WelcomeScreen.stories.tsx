import React from "react";
import { UnistylesRuntime } from "react-native-unistyles";
import { ThemeProvider, useTheme } from "../../hooks/useTheme";
import { ToastProvider } from "../../components/Toast";
import { WelcomeScreen } from "./WelcomeScreen";

export default {
  title: "Screens/WelcomeScreen",
  component: WelcomeScreen,
};

/**
 * WelcomeScreen consumes `useThemeContext()` (for the current theme + a
 * persisting setTheme) and `useToast()` (to report a failed persist); both
 * throw outside their provider. The app supplies both — the ThemeProvider at
 * the root, the ToastProvider around the first-launch branch — but Storybook
 * has neither, so wire a working ThemeProvider whose setTheme applies via
 * Unistyles plus a ToastProvider. Persistence to Evolu is a no-op here:
 * setTheme returns true, so no error toast fires. Mirrors
 * ThemeSwitcher.stories.tsx.
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
      <WelcomeScreen onGetStarted={() => console.log("Get started")} />
    </StoryProviders>
  );
}
