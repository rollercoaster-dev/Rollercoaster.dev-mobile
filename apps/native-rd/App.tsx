import { StatusBar } from "expo-status-bar";
import { View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import {
  NavigationContainer,
  DefaultTheme,
  type Theme,
} from "@react-navigation/native";
import { EvoluAppProvider } from "./src/db";
import { TabNavigator } from "./src/navigation";
import { ToastProvider } from "./src/components/Toast";
import { useFonts } from "./src/hooks/useFonts";
import { useTheme, ThemeProvider, useThemeContext } from "./src/hooks/useTheme";
import { useDensity } from "./src/hooks/useDensity";
import { useAnimationPref } from "./src/hooks/useAnimationPref";
import { useFirstLaunch } from "./src/hooks/useFirstLaunch";
import { WelcomeScreen } from "./src/screens/WelcomeScreen";

const STORYBOOK_ENABLED = process.env.EXPO_PUBLIC_STORYBOOK_ENABLED === "true";

let StorybookUI: React.ComponentType | null = null;
if (STORYBOOK_ENABLED) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  StorybookUI = require("./.storybook").default;
}

/**
 * Inner app that consumes the theme context and re-renders when theme changes
 */
function ThemedApp() {
  const { theme, isDark } = useThemeContext();
  const { isFirstLaunch, markSeen } = useFirstLaunch();
  useDensity(); // Apply saved density to all themes on mount
  useAnimationPref(); // Initialize OS reduceMotion listener

  // Loading: Evolu hasn't read settings from SQLite yet
  if (isFirstLaunch === null) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background }} />
    );
  }

  // First launch — show WelcomeScreen above NavigationContainer
  if (isFirstLaunch) {
    return <WelcomeScreen onGetStarted={markSeen} />;
  }

  const navTheme: Theme = {
    ...DefaultTheme,
    dark: isDark,
    colors: {
      ...DefaultTheme.colors,
      background: theme.colors.background,
      card: theme.colors.backgroundSecondary,
      text: theme.colors.text,
      border: theme.colors.border,
      primary: theme.colors.accentPrimary,
      notification: theme.colors.accentPrimary,
    },
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <NavigationContainer theme={navTheme}>
        <ToastProvider>
          <TabNavigator />
        </ToastProvider>
      </NavigationContainer>
    </View>
  );
}

/**
 * Root App component
 *
 * Set EXPO_PUBLIC_STORYBOOK_ENABLED=true to launch Storybook instead of the app.
 * Unistyles handles theming globally via StyleSheet.configure()
 */
export function App() {
  const { isReady } = useFonts();
  const themeState = useTheme();

  if (!isReady) return null;

  if (StorybookUI) {
    return <StorybookUI />;
  }

  return (
    <ThemeProvider value={themeState}>
      <EvoluAppProvider>
        <SafeAreaProvider>
          <ThemedApp />
        </SafeAreaProvider>
      </EvoluAppProvider>
    </ThemeProvider>
  );
}
