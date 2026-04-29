import React, { useEffect } from "react";
import {
  View,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import { useUnistyles } from "react-native-unistyles";
import { useAnimationPref } from "../../hooks/useAnimationPref";
import { getTimingConfig } from "../../utils/animation";
import type { EvidenceTypeValue } from "../../types/evidence";
import { EvidenceItem } from "../EvidenceItem";
import { FAB } from "../FAB";
import { FABMenu } from "../FABMenu";
import { styles, DRAWER_CLOSED_HEIGHT } from "./EvidenceDrawer.styles";

export interface EvidenceItemData {
  id: string;
  type: EvidenceTypeValue;
  label: string;
}

export interface EvidenceDrawerProps {
  evidence: EvidenceItemData[];
  isGoal?: boolean;
  isOpen: boolean;
  onToggle: () => void;
  onViewEvidence?: (id: string) => void;
  onDeleteEvidence: (id: string) => void;
  isFABMenuOpen?: boolean;
  onAddEvidence?: () => void;
  onSelectEvidenceType?: (type: EvidenceTypeValue) => void;
}

export function EvidenceDrawer({
  evidence,
  isGoal = false,
  isOpen,
  onToggle,
  onViewEvidence,
  onDeleteEvidence,
  isFABMenuOpen = false,
  onAddEvidence,
  onSelectEvidenceType,
}: EvidenceDrawerProps) {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const { theme } = useUnistyles();
  const { animationPref } = useAnimationPref();
  const maxHeight = windowHeight * 0.6;
  const items = evidence ?? [];

  // Animate drawer height and overlay opacity together
  const heightValue = useSharedValue(DRAWER_CLOSED_HEIGHT);
  const overlayOpacity = useSharedValue(0);

  useEffect(() => {
    const config = getTimingConfig(animationPref, "normal");
    heightValue.value = withTiming(
      isOpen ? maxHeight : DRAWER_CLOSED_HEIGHT,
      config,
    );
    overlayOpacity.value = withTiming(isOpen ? 1 : 0, config);
  }, [isOpen, maxHeight, animationPref, heightValue, overlayOpacity]);

  const drawerAnimStyle = useAnimatedStyle(() => ({
    height: heightValue.value,
  }));

  const overlayAnimStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  // Calculate equal-width tiles for 3-column grid
  const COLUMNS = 3;
  const horizontalPadding = theme.space[4] * 2;
  const totalGap = theme.space[2] * (COLUMNS - 1);
  const itemWidth = Math.floor(
    (windowWidth - horizontalPadding - totalGap) / COLUMNS,
  );

  const drawerLabel = isGoal
    ? `Goal evidence: ${items.length} item${items.length !== 1 ? "s" : ""}`
    : `${items.length} evidence item${items.length !== 1 ? "s" : ""}`;

  return (
    <>
      {/* Overlay */}
      <Animated.View
        style={[styles.overlay, overlayAnimStyle]}
        pointerEvents={isOpen ? "auto" : "none"}
      >
        <Pressable
          onPress={onToggle}
          style={styles.overlayPressable}
          accessible={isOpen}
          accessibilityRole="button"
          accessibilityLabel="Close evidence drawer"
        />
      </Animated.View>

      {/* Drawer */}
      <Animated.View
        style={[styles.drawer(isGoal), drawerAnimStyle]}
        accessible
        accessibilityRole="summary"
        accessibilityLabel={isGoal ? "Goal evidence drawer" : "Evidence drawer"}
      >
        {/* Handle bar */}
        <View style={styles.handleArea}>
          <Pressable
            onPress={onToggle}
            style={styles.handleLeft}
            accessible
            accessibilityRole="button"
            accessibilityLabel="Toggle evidence drawer"
          >
            <View style={styles.handleBar(isGoal)} />
            <Text style={styles.handleLabel}>{drawerLabel}</Text>
          </Pressable>
          {onAddEvidence && (
            <FAB isOpen={isFABMenuOpen} onToggle={onAddEvidence} />
          )}
        </View>

        {/* FAB Menu */}
        {onSelectEvidenceType && (
          <View style={styles.fabMenuContainer}>
            <FABMenu
              isOpen={isFABMenuOpen}
              onSelectType={onSelectEvidenceType}
            />
          </View>
        )}

        {/* Content — always rendered, clipped by animated height + overflow: hidden */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.grid}
        >
          {items.length === 0 ? (
            <Text style={styles.emptyText}>No evidence yet — tap + to add</Text>
          ) : (
            items.map((item) => (
              <View key={item.id} style={styles.gridItem(itemWidth)}>
                <EvidenceItem
                  id={item.id}
                  type={item.type}
                  label={item.label}
                  isGoal={isGoal}
                  onPress={onViewEvidence}
                  onLongPress={onDeleteEvidence}
                />
              </View>
            ))
          )}
        </ScrollView>
      </Animated.View>
    </>
  );
}
