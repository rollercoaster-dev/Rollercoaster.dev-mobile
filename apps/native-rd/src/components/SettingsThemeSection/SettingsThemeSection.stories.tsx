import type { Meta, StoryObj } from "@storybook/react";
import React, { useState } from "react";
import { View, Text } from "react-native";
import { ScopedTheme } from "react-native-unistyles";
import { themeOptions } from "../../hooks/useTheme";
import { themes, type ThemeName } from "../../themes/compose";
import { SettingsThemeSection } from "./SettingsThemeSection";

const meta: Meta<typeof SettingsThemeSection> = {
  title: "Iteration B/Theme & Settings/SettingsThemeSection",
  component: SettingsThemeSection,
};

export default meta;

type Story = StoryObj<typeof SettingsThemeSection>;

// The section is controlled (D1) — SettingsScreen (#416) owns the state. This
// wrapper supplies it in Storybook so tapping a swatch updates the live sample
// card, matching the Welcome rail's interaction exactly.
function InteractiveSection({ initial }: { initial: ThemeName }) {
  const [selected, setSelected] = useState<ThemeName>(initial);
  return (
    <SettingsThemeSection selectedThemeId={selected} onSelect={setSelected} />
  );
}

export const Default: Story = {
  render: () => <InteractiveSection initial="light-default" />,
};

/**
 * Reviewer visual gate: every product theme selected in turn, on its own
 * background, so the rail's per-swatch colors AND the live sample card are
 * verifiable by eye across all 7 themes. Each cell wraps the section in
 * `<ScopedTheme name={id}>` so the SettingsSection chrome (header, row borders)
 * re-themes too — not just the prop-driven ThemeSampleCard inside it. Without
 * the scope the chrome stayed on the active toolbar theme in every cell.
 */
export const AllThemesMatrix: Story = {
  render: () => (
    <View style={{ gap: 16 }}>
      {themeOptions.map(({ id }) => (
        <View
          key={id}
          style={{
            gap: 6,
            padding: 12,
            borderRadius: 8,
            backgroundColor: themes[id].colors.backgroundSecondary,
          }}
        >
          <Text
            style={{
              fontSize: 12,
              fontWeight: "700",
              color: themes[id].colors.text,
            }}
          >
            {id}
          </Text>
          <ScopedTheme name={id}>
            <SettingsThemeSection selectedThemeId={id} onSelect={() => {}} />
          </ScopedTheme>
        </View>
      ))}
    </View>
  ),
};
