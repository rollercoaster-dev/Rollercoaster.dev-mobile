import type { Meta, StoryObj } from "@storybook/react";
import React from "react";
import { View, Text } from "react-native";
import { themeOptions } from "../../hooks/useTheme";
import { themes } from "../../themes/compose";
import { ThemeSampleCard } from "./ThemeSampleCard";

const meta: Meta<typeof ThemeSampleCard> = {
  title: "ThemeSampleCard",
  component: ThemeSampleCard,
};

export default meta;

type Story = StoryObj<typeof ThemeSampleCard>;

export const Default: Story = {
  render: () => <ThemeSampleCard themeId="light-default" />,
};

/**
 * Reviewer visual gate for the shadow-honesty matrix: every product theme's
 * card rendered on its own background so the per-theme shadow, border, and font
 * are verifiable by eye. Night Ride shows a vertical 6px drop; Bold Ink, Still
 * Water, and Loud & Clear show no shadow; Warm Studio shows a soft blurred
 * shadow with Lexend; Clean Signal shows the hard 2px offset.
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
          <ThemeSampleCard themeId={id} />
        </View>
      ))}
    </View>
  ),
};
