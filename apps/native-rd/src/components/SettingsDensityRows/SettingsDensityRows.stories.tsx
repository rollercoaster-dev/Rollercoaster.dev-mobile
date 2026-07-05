import type { Meta, StoryObj } from "@storybook/react";
import React, { useState } from "react";
import { View, Text } from "react-native";
import { ScopedTheme } from "react-native-unistyles";
import { themeOptions } from "../../hooks/useTheme";
import { themes } from "../../themes/compose";
import type { DensityLevel } from "../../utils/density";
import { SettingsDensityRows } from "./SettingsDensityRows";

const meta: Meta<typeof SettingsDensityRows> = {
  title: "Iteration B/Theme & Settings/SettingsDensityRows",
  component: SettingsDensityRows,
};

export default meta;

type Story = StoryObj<typeof SettingsDensityRows>;

// Controlled (D6) — SettingsScreen (#416) owns the state via useDensity(). This
// wrapper supplies it in Storybook so tapping a row moves the ✓ in the gate.
function InteractiveRows({ initial }: { initial: DensityLevel }) {
  const [selected, setSelected] = useState<DensityLevel>(initial);
  return (
    <SettingsDensityRows selectedLevel={selected} onSelect={setSelected} />
  );
}

export const Default: Story = {
  render: () => <InteractiveRows initial="default" />,
};

/**
 * Reviewer visual gate: the three-row radiogroup rendered in every product
 * theme so the section chrome, row borders, and ✓ marker are verifiable across
 * all 7 themes. Each cell wraps the REAL reactive component in
 * `<ScopedTheme name={id}>` — the proven per-cell re-render idiom (see
 * BadgesWall / the Focus family). Without the scope the component would render
 * the active theme in all 7 cells (a "null matrix"); the tinted frame only
 * labels each theme.
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
            <SettingsDensityRows selectedLevel="default" onSelect={() => {}} />
          </ScopedTheme>
        </View>
      ))}
    </View>
  ),
};
