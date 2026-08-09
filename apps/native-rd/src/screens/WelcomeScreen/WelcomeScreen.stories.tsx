import React from "react";
import { UnistylesRuntime } from "react-native-unistyles";
import { ThemeProvider, useTheme } from "../../hooks/useTheme";
import { WelcomeScreen } from "./WelcomeScreen";

export default {
  title: "Screens/WelcomeScreen",
  component: WelcomeScreen,
};

/**
 * WelcomeScreen consumes `useThemeContext()` (for the current theme + a
 * persisting setTheme), which throws outside a ThemeProvider. The app supplies
 * one at the root; Storybook does not, so wire a working provider whose
 * setTheme applies via Unistyles. Persistence to Evolu is a no-op here.
 * Mirrors ThemeSwitcher.stories.tsx.
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
  return <ThemeProvider value={value}>{children}</ThemeProvider>;
}

export function Default() {
  return (
    <StoryProviders>
      <WelcomeScreen onGetStarted={() => console.log("Get started")} />
    </StoryProviders>
  );
}
