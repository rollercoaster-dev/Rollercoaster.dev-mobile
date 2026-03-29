// Must configure unistyles before any component imports
import { StyleSheet } from "react-native-unistyles";
import { themes } from "../src/themes";

StyleSheet.configure({
  themes,
  settings: {
    initialTheme: "light-default",
  },
});

import type { Preview } from "@storybook/react";
import React from "react";
import { ScrollView } from "react-native";
import { UnistylesRuntime } from "react-native-unistyles";
import { themeNames, type ThemeName } from "../src/themes";

const FONT_FACE_CSS = `
@font-face { font-family: 'Anybody'; font-weight: 400; font-display: swap; src: url('/fonts/anybody-400.woff2') format('woff2'); }
@font-face { font-family: 'Anybody'; font-weight: 700; font-display: swap; src: url('/fonts/anybody-700.woff2') format('woff2'); }
@font-face { font-family: 'Anybody'; font-weight: 900; font-display: swap; src: url('/fonts/anybody-900.woff2') format('woff2'); }
@font-face { font-family: 'DM Mono'; font-weight: 400; font-display: swap; src: url('/fonts/dm-mono-400.woff2') format('woff2'); }
@font-face { font-family: 'DM Mono'; font-weight: 500; font-display: swap; src: url('/fonts/dm-mono-500.woff2') format('woff2'); }
@font-face { font-family: 'Instrument Sans'; font-weight: 400; font-display: swap; src: url('/fonts/instrument-sans-400.woff2') format('woff2'); }
@font-face { font-family: 'Instrument Sans'; font-weight: 500; font-display: swap; src: url('/fonts/instrument-sans-500.woff2') format('woff2'); }
@font-face { font-family: 'Instrument Sans'; font-weight: 600; font-display: swap; src: url('/fonts/instrument-sans-600.woff2') format('woff2'); }
@font-face { font-family: 'Instrument Sans'; font-weight: 700; font-display: swap; src: url('/fonts/instrument-sans-700.woff2') format('woff2'); }
@font-face { font-family: 'Atkinson Hyperlegible'; font-weight: 400; font-display: swap; src: url('/fonts/AtkinsonHyperlegible-Regular.ttf') format('truetype'); }
@font-face { font-family: 'Atkinson Hyperlegible'; font-weight: 700; font-display: swap; src: url('/fonts/AtkinsonHyperlegible-Bold.ttf') format('truetype'); }
@font-face { font-family: 'OpenDyslexic'; font-weight: 400; font-display: swap; src: url('/fonts/OpenDyslexic-Regular.otf') format('opentype'); }
@font-face { font-family: 'OpenDyslexic'; font-weight: 700; font-display: swap; src: url('/fonts/OpenDyslexic-Bold.otf') format('opentype'); }
@font-face { font-family: 'Lexend'; font-weight: 400; font-display: swap; src: url('/fonts/Lexend-Regular.woff2') format('woff2'); }
@font-face { font-family: 'Lexend'; font-weight: 500; font-display: swap; src: url('/fonts/Lexend-Medium.woff2') format('woff2'); }
@font-face { font-family: 'Lexend'; font-weight: 600; font-display: swap; src: url('/fonts/Lexend-SemiBold.woff2') format('woff2'); }
@font-face { font-family: 'Lexend'; font-weight: 700; font-display: swap; src: url('/fonts/Lexend-Bold.woff2') format('woff2'); }
`;

if (
  typeof document !== "undefined" &&
  !document.getElementById("storybook-web-fonts")
) {
  const style = document.createElement("style");
  style.id = "storybook-web-fonts";
  style.textContent = FONT_FACE_CSS;
  document.head.appendChild(style);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const themeDecorator = (Story: React.ComponentType, context: any) => {
  const selectedTheme = context.globals?.theme as ThemeName | undefined;

  React.useEffect(() => {
    if (selectedTheme && themeNames.includes(selectedTheme)) {
      UnistylesRuntime.setTheme(selectedTheme);
    }
  }, [selectedTheme]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Story />
    </ScrollView>
  );
};

const styles = StyleSheet.create((theme) => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: theme.space[4],
    paddingBottom: theme.space[16],
  },
}));

const preview: Preview = {
  decorators: [themeDecorator],
  globalTypes: {
    theme: {
      name: "Theme",
      description: "Select a theme combination",
      toolbar: {
        icon: "paintbrush",
        items: themeNames.map((name) => ({ value: name, title: name })),
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: {
    theme: "light-default",
  },
};

export default preview;
