import { useMemo } from "react";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { GestureHandlerRootView } from "react-native-gesture-handler";
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
import { useThemePersistence } from "./src/hooks/useThemePersistence";
import { useDensity } from "./src/hooks/useDensity";
import { useAnimationPref } from "./src/hooks/useAnimationPref";
import { useFirstLaunch } from "./src/hooks/useFirstLaunch";
import { WelcomeScreen } from "./src/screens/WelcomeScreen";
import { getContrastRatio } from "./src/utils/accessibility";

const STORYBOOK_ENABLED = process.env.EXPO_PUBLIC_STORYBOOK_ENABLED === "true";

let StorybookUI: React.ComponentType | null = null;
if (STORYBOOK_ENABLED) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  StorybookUI = require("./.storybook").default;
}

/**
 * Inner app that consumes the theme context and re-renders when theme changes.
 *
 * Wraps children in a nested ThemeProvider whose setTheme persists to Evolu
 * (via useThemePersistence). The outer provider in App() exists before
 * EvoluAppProvider mounts and has only the Unistyles-only setTheme — this
 * override applies once we're inside EvoluAppProvider's scope.
 */
function ThemedApp() {
  const themeContext = useThemeContext();
  const { theme, isDark } = themeContext;
  const { isFirstLaunch, markSeen } = useFirstLaunch();
  const { setTheme: persistingSetTheme } = useThemePersistence();
  const insets = useSafeAreaInsets();
  useDensity(); // Apply saved density to all themes on mount
  useAnimationPref(); // Initialize OS reduceMotion listener

  const persistingThemeContext = useMemo(
    () => ({ ...themeContext, setTheme: persistingSetTheme }),
    [themeContext, persistingSetTheme],
  );

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

  let body: React.ReactNode;
  if (isFirstLaunch === null) {
    // Loading: Evolu hasn't read settings from SQLite yet
    body = (
      <View style={{ flex: 1, backgroundColor: theme.colors.background }} />
    );
  } else if (isFirstLaunch) {
    // First launch — show WelcomeScreen above NavigationContainer
    body = <WelcomeScreen onGetStarted={markSeen} />;
  } else {
    // Outer view paints the device top-inset strip; the inner view offsets the
    // navigator by that inset and paints the regular background. The exposed
    // strip above the inner view must read as a continuation of the header
    // band, so it uses the same token the band does (chrome.screenHeaderBg).
    // accentPurple only coincided with the header in light-default and diverged
    // in every other theme. Keeping the inset painter strictly behind
    // navigation content lets a screen with its own top inset (e.g. a
    // fullScreen modal) fully cover it.
    //
    // Status-bar icon polarity follows the header foreground so the
    // clock/wifi/battery glyphs read as part of the header on every theme —
    // light glyphs on the near-black high-contrast/low-info headers, dark
    // glyphs on the light default header.
    const headerFgIsLight =
      getContrastRatio(theme.chrome.screenHeaderFg, "#000000") >
      getContrastRatio(theme.chrome.screenHeaderFg, "#ffffff");
    body = (
      <View style={{ flex: 1, backgroundColor: theme.chrome.screenHeaderBg }}>
        <StatusBar style={headerFgIsLight ? "light" : "dark"} />
        <View
          style={{
            flex: 1,
            marginTop: insets.top,
            backgroundColor: theme.colors.background,
          }}
        >
          <NavigationContainer theme={navTheme}>
            <ToastProvider>
              <TabNavigator />
            </ToastProvider>
          </NavigationContainer>
        </View>
      </View>
    );
  }

  return <ThemeProvider value={persistingThemeContext}>{body}</ThemeProvider>;
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
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={themeState}>
        <EvoluAppProvider>
          <SafeAreaProvider>
            <KeyboardProvider>
              <ThemedApp />
            </KeyboardProvider>
          </SafeAreaProvider>
        </EvoluAppProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
