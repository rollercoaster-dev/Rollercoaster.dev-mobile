import type { Meta, StoryObj } from "@storybook/react";
import React from "react";
import { View } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Text } from "../components/Text";
import { FocusPillTabBar } from "./FocusPillTabBar";

const meta: Meta<typeof FocusPillTabBar> = {
  title: "Navigation/FocusPillTabBar",
  component: FocusPillTabBar,
  decorators: [
    (Story) => (
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 0, height: 0 },
          insets: { top: 0, left: 0, right: 0, bottom: 0 },
        }}
      >
        <Story />
      </SafeAreaProvider>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof FocusPillTabBar>;

function buildProps(activeIndex: number) {
  const routes = [
    { key: "GoalsTab-1", name: "GoalsTab" as const, params: undefined },
    { key: "BadgesTab-1", name: "BadgesTab" as const, params: undefined },
    { key: "SettingsTab-1", name: "SettingsTab" as const, params: undefined },
  ];
  // The component reads only a small slice of BottomTabBarProps. Stories
  // don't have a real navigator so we cast a minimal mock.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return {
    state: {
      index: activeIndex,
      key: "tab",
      routes,
      routeNames: routes.map((r) => r.name),
      type: "tab",
      stale: false,
      history: [],
    },
    navigation: {
      dispatch: () => {},
      emit: () => ({ defaultPrevented: false }),
      navigate: () => {},
    },
    descriptors: {},
    insets: { top: 0, right: 0, bottom: 0, left: 0 },
  } as any;
}

function Stage({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <View style={stageStyles.stage}>
      <Text variant="label" style={stageStyles.label}>
        {label}
      </Text>
      <View style={stageStyles.frame}>{children}</View>
    </View>
  );
}

export const AllStates: Story = {
  render: () => (
    <View style={stageStyles.column}>
      <Stage label="Goals active — FAB visible">
        <FocusPillTabBar {...buildProps(0)} />
      </Stage>
      <Stage label="Badges active — FAB visible">
        <FocusPillTabBar {...buildProps(1)} />
      </Stage>
      <Stage label="Settings active — FAB hidden">
        <FocusPillTabBar {...buildProps(2)} />
      </Stage>
    </View>
  ),
};

export const GoalsActive: Story = {
  render: () => (
    <Stage label="Goals active">
      <FocusPillTabBar {...buildProps(0)} />
    </Stage>
  ),
};

export const BadgesActive: Story = {
  render: () => (
    <Stage label="Badges active">
      <FocusPillTabBar {...buildProps(1)} />
    </Stage>
  ),
};

export const SettingsActive: Story = {
  render: () => (
    <Stage label="Settings active (FAB hidden)">
      <FocusPillTabBar {...buildProps(2)} />
    </Stage>
  ),
};

const stageStyles = StyleSheet.create((theme) => ({
  column: {
    gap: theme.space[6],
  },
  stage: {
    gap: theme.space[2],
  },
  label: {
    color: theme.colors.textMuted,
    textTransform: "uppercase" as const,
    fontSize: theme.size.xs,
    letterSpacing: theme.letterSpacing.wide,
  },
  frame: {
    backgroundColor: theme.colors.background,
    borderColor: theme.colors.border,
    borderWidth: theme.borderWidth.thin,
    borderRadius: theme.radius.md,
    overflow: "hidden" as const,
    paddingTop: theme.space[8],
  },
}));
