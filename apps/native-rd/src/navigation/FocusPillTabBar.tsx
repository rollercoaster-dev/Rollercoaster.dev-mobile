import React, { useEffect, useMemo } from "react";
import {
  LayoutAnimation,
  type LayoutAnimationConfig,
  Pressable,
  Text as RNText,
  View,
} from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { CommonActions } from "@react-navigation/native";
import { GearSix, Medal, Target } from "phosphor-react-native";
import { useTranslation } from "react-i18next";
import { shadowStyle } from "../styles/shadows";
import { borderWidth } from "../themes/tokens";
import { useAnimationPref } from "../hooks/useAnimationPref";
import type { RootTabParamList } from "./types";

type RouteName = keyof RootTabParamList;

const ICON_SIZE = 24;
const ICON_WEIGHT = "bold" as const;
const MORPH_DURATION = 220;
export const PILL_HEIGHT = 64;

/** Distance the pill's outer edge sits above the tab bar slot — the bar
 * uses this as a negative top margin so its top half breaks above the
 * slot. Consumers (e.g. EvidenceDrawer, screen content padding) need the
 * same value to clear the lifted half. */
export const PILL_LIFT = PILL_HEIGHT / 2 + borderWidth.medium;

const morphConfig: LayoutAnimationConfig = {
  duration: MORPH_DURATION,
  create: {
    type: LayoutAnimation.Types.easeInEaseOut,
    property: LayoutAnimation.Properties.opacity,
  },
  update: { type: LayoutAnimation.Types.easeInEaseOut },
  delete: {
    type: LayoutAnimation.Types.easeInEaseOut,
    property: LayoutAnimation.Properties.opacity,
  },
};

function TabIcon({ name, color }: { name: RouteName; color: string }) {
  if (name === "GoalsTab")
    return <Target color={color} size={ICON_SIZE} weight={ICON_WEIGHT} />;
  if (name === "BadgesTab")
    return <Medal color={color} size={ICON_SIZE} weight={ICON_WEIGHT} />;
  return <GearSix color={color} size={ICON_SIZE} weight={ICON_WEIGHT} />;
}

interface TabButtonProps {
  name: RouteName;
  label: string;
  isActive: boolean;
  activeColor: string;
  inactiveColor: string;
  onPress: () => void;
}

function TabButton({
  name,
  label,
  isActive,
  activeColor,
  inactiveColor,
  onPress,
}: TabButtonProps) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected: isActive }}
      testID={`tab-${name}`}
      onPress={onPress}
      style={[styles.tab, isActive ? styles.tabActive : styles.tabCollapsed]}
    >
      <TabIcon name={name} color={isActive ? activeColor : inactiveColor} />
      {isActive ? (
        <RNText
          numberOfLines={1}
          style={[styles.label, { color: activeColor }]}
        >
          {label}
        </RNText>
      ) : null}
    </Pressable>
  );
}

export function FocusPillTabBar({ state, navigation }: BottomTabBarProps) {
  const { theme } = useUnistyles();
  const insets = useSafeAreaInsets();
  const { shouldAnimate } = useAnimationPref();
  const { t } = useTranslation();

  const tabLabels = useMemo<Record<RouteName, string>>(
    () => ({
      GoalsTab: t("navigation.tabs.goals"),
      BadgesTab: t("navigation.tabs.badges"),
      SettingsTab: t("navigation.tabs.settings"),
    }),
    [t],
  );

  const activeColor = theme.chrome.brandAccentFg;
  const inactiveColor = theme.colors.textSecondary;
  useEffect(() => {
    if (shouldAnimate) LayoutAnimation.configureNext(morphConfig);
  }, [state.index, shouldAnimate]);

  const findRoute = (name: RouteName) => {
    const idx = state.routes.findIndex((r) => r.name === name);
    if (idx === -1) return null;
    return { route: state.routes[idx], index: idx };
  };

  const navigateTo = (entry: ReturnType<typeof findRoute>) => {
    if (!entry) return;
    const isActive = state.index === entry.index;
    const event = navigation.emit({
      type: "tabPress",
      target: entry.route.key,
      canPreventDefault: true,
    });
    if (!isActive && !event.defaultPrevented) {
      if (shouldAnimate) LayoutAnimation.configureNext(morphConfig);
      navigation.dispatch({
        ...CommonActions.navigate(entry.route.name, entry.route.params),
        target: state.key,
      });
    }
  };

  const renderTab = (entry: ReturnType<typeof findRoute>, name: RouteName) => {
    if (!entry) return null;
    return (
      <TabButton
        name={name}
        label={tabLabels[name]}
        isActive={state.index === entry.index}
        activeColor={activeColor}
        inactiveColor={inactiveColor}
        onPress={() => navigateTo(entry)}
      />
    );
  };

  const goals = findRoute("GoalsTab");
  const badges = findRoute("BadgesTab");
  const settings = findRoute("SettingsTab");

  return (
    <View
      style={[
        styles.container,
        {
          paddingBottom: Math.max(insets.bottom, 4),
          paddingLeft: Math.max(insets.left, 0) + 16,
          paddingRight: Math.max(insets.right, 0) + 16,
        },
      ]}
    >
      <View style={styles.bar}>
        <View style={styles.pill}>
          <View style={styles.leftGroup}>{renderTab(goals, "GoalsTab")}</View>
          <View style={styles.rightGroup}>
            {renderTab(badges, "BadgesTab")}
          </View>
        </View>

        {settings ? (
          <View style={styles.settingsPill}>
            {renderTab(settings, "SettingsTab")}
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create((theme) => {
  const pillBase = {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    height: PILL_HEIGHT,
    paddingHorizontal: 8,
    borderRadius: 999,
    borderColor: theme.colors.border,
    borderWidth: theme.borderWidth.medium,
    backgroundColor: theme.colors.background,
    ...shadowStyle(theme, "cardElevation"),
  };
  return {
    container: {
      backgroundColor: theme.chrome.brandAccentBg,
      borderTopWidth: theme.borderWidth.medium,
      borderTopColor: theme.chrome.brandAccentBorder,
      overflow: "visible" as const,
    },
    bar: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 3,
      marginTop: -PILL_LIFT,
    },
    pill: { ...pillBase, flex: 1 },
    settingsPill: pillBase,
    leftGroup: {
      flex: 1,
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 6,
    },
    rightGroup: {
      flex: 1,
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "flex-end" as const,
    },
    tab: {
      height: 48,
      borderRadius: 999,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      flexDirection: "row" as const,
    },
    tabCollapsed: {
      width: 48,
    },
    tabActive: {
      backgroundColor: theme.chrome.brandAccentBg,
      borderColor: theme.chrome.brandAccentBorder,
      borderWidth: theme.borderWidth.medium,
      paddingHorizontal: 16,
      gap: 8,
    },
    label: {
      fontFamily: theme.fontFamily.body,
      fontWeight: theme.fontWeight.bold,
      fontSize: theme.size.sm,
      letterSpacing: theme.letterSpacing.tight,
    },
  };
});
