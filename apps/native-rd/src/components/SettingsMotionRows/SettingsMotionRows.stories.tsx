import type { Meta, StoryObj } from "@storybook/react";
import React, { useState } from "react";
import { View, Text } from "react-native";
import { ScopedTheme } from "react-native-unistyles";
import { themeOptions } from "../../hooks/useTheme";
import { themes } from "../../themes/compose";
import type { AnimationPref } from "../../hooks/useAnimationPref";
import { SettingsMotionRows } from "./SettingsMotionRows";

const meta: Meta<typeof SettingsMotionRows> = {
  title: "Iteration B/Theme & Settings/SettingsMotionRows",
  component: SettingsMotionRows,
};

export default meta;

type Story = StoryObj<typeof SettingsMotionRows>;

function InteractiveRows() {
  const [selected, setSelected] = useState<AnimationPref>("full");
  return (
    <SettingsMotionRows
      selectedPref={selected}
      override={null}
      onSelect={setSelected}
    />
  );
}

export const Default: Story = {
  render: () => <InteractiveRows />,
};

export const ThemeKeepsMotionOff: Story = {
  render: () => (
    <SettingsMotionRows
      selectedPref="full"
      override="theme"
      onSelect={() => {}}
    />
  ),
};

export const DeviceKeepsMotionOff: Story = {
  render: () => (
    <SettingsMotionRows
      selectedPref="reduced"
      override="os"
      onSelect={() => {}}
    />
  ),
};

/** Reviewer visual gate: the picker and its note in all 7 product themes. */
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
            <SettingsMotionRows
              selectedPref="full"
              override="os"
              onSelect={() => {}}
            />
          </ScopedTheme>
        </View>
      ))}
    </View>
  ),
};
