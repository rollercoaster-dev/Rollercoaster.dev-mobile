/**
 * PhoneShell — renders story content inside the app's real shell at a fixed
 * phone size, so a composed-screen story shows what App.tsx shows: the header-
 * colored status strip, content offset by the top inset, and the floating
 * FocusPillTabBar driven by a real bottom-tab navigator. Individually framed
 * component stories can't show how parts share the screen (#697).
 *
 * Safe-area values are provided directly rather than through a nested
 * SafeAreaProvider: on web the provider re-measures with CSS env() and would
 * replace the device insets with zeros.
 *
 * `modal` only hides the tab bar. The iOS page sheet's few-point drop below
 * the status bar and its rounded top corners are not modeled, so a modal
 * preview is a few points taller than the device shows.
 */
import React from "react";
import { View } from "react-native";
import {
  NavigationContainer,
  NavigationIndependentTree,
} from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import {
  SafeAreaFrameContext,
  SafeAreaInsetsContext,
} from "react-native-safe-area-context";
import { StyleSheet } from "react-native-unistyles";
import { Text } from "../../components/Text";
import { ToastProvider } from "../../components/Toast";
import { useTheme } from "../../hooks/useTheme";
import { FocusPillTabBar } from "../../navigation/FocusPillTabBar";
import { navigationTheme } from "../../navigation/navigationTheme";
import {
  TopInsetColorProvider,
  useTopInsetColorState,
} from "../../navigation/TopInsetColor";
import type { RootTabParamList } from "../../navigation/types";

export const DEVICES = {
  // iPhone SE (1st gen): the smallest supported screen, no home indicator.
  compact: {
    label: "Compact · 320×568",
    width: 320,
    height: 568,
    insets: { top: 20, right: 0, bottom: 0, left: 0 },
  },
  // iPhone 16: Dynamic Island and home indicator.
  standard: {
    label: "Standard · 393×852",
    width: 393,
    height: 852,
    insets: { top: 59, right: 0, bottom: 34, left: 0 },
  },
} as const;

export type Device = keyof typeof DEVICES;

const Tab = createBottomTabNavigator<RootTabParamList>();

function EmptyTab() {
  return null;
}

// The navigator needs a stable component per screen; a component closed over
// `children` would be a new type each render and remount the screen, losing
// its local state. The content travels through context instead.
const ShellContent = React.createContext<React.ReactNode>(null);

function ContentTab() {
  return <>{React.useContext(ShellContent)}</>;
}

interface PhoneShellProps {
  device: Device;
  /** Tab the shell opens on; the content renders there. */
  tab?: keyof RootTabParamList;
  /**
   * Hide the tab bar for screens presented modally over it (New Goal,
   * CompletionFlow).
   */
  modal?: boolean;
  children: React.ReactNode;
}

export function PhoneShell({
  device,
  tab = "GoalsTab",
  modal = false,
  children,
}: PhoneShellProps) {
  const { width, height, insets } = DEVICES[device];
  const { theme, isDark } = useTheme();
  // Screens can repaint the status strip (useTopInsetColor), as in App.tsx.
  const { topInsetColor, setTopInsetColor } = useTopInsetColorState();

  return (
    <SafeAreaFrameContext.Provider value={{ x: 0, y: 0, width, height }}>
      <SafeAreaInsetsContext.Provider value={insets}>
        <View
          style={[
            styles.device,
            { width, height },
            topInsetColor ? { backgroundColor: topInsetColor } : null,
          ]}
        >
          <View style={[styles.content, { marginTop: insets.top }]}>
            <NavigationIndependentTree>
              <NavigationContainer theme={navigationTheme(theme, isDark)}>
                <TopInsetColorProvider onChange={setTopInsetColor}>
                  <ToastProvider>
                    <ShellContent.Provider value={children}>
                      <Tab.Navigator
                        initialRouteName={tab}
                        screenOptions={{ headerShown: false }}
                        tabBar={(props) =>
                          modal ? null : <FocusPillTabBar {...props} />
                        }
                      >
                        {(
                          ["GoalsTab", "BadgesTab", "SettingsTab"] as const
                        ).map((name) => (
                          <Tab.Screen
                            key={name}
                            name={name}
                            component={name === tab ? ContentTab : EmptyTab}
                          />
                        ))}
                      </Tab.Navigator>
                    </ShellContent.Provider>
                  </ToastProvider>
                </TopInsetColorProvider>
              </NavigationContainer>
            </NavigationIndependentTree>
          </View>
        </View>
      </SafeAreaInsetsContext.Provider>
    </SafeAreaFrameContext.Provider>
  );
}

/** Both device sizes side by side, each labeled. */
export function DeviceRow({
  render,
}: {
  render: (device: Device) => React.ReactNode;
}) {
  return (
    <View style={styles.row}>
      {(Object.keys(DEVICES) as Device[]).map((device) => (
        <View key={device} style={styles.column}>
          <Text variant="label" style={styles.label}>
            {DEVICES[device].label}
          </Text>
          {render(device)}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  device: {
    overflow: "hidden",
    borderWidth: theme.borderWidth.medium,
    borderColor: theme.colors.border,
    backgroundColor: theme.chrome.screenHeaderBg,
  },
  content: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "flex-start",
    gap: theme.space[8],
    padding: theme.space[6],
  },
  column: {
    gap: theme.space[2],
  },
  label: {
    color: theme.colors.textSecondary,
  },
}));
