/**
 * Full-screen icon picker modal for badge design
 *
 * Replaces the cramped inline icon picker with a spacious modal layout:
 * bigger icons (32px in 64x64 cells), wrapping category tabs, search,
 * live preview, and a weight selector pinned at the bottom.
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
  type ListRenderItemInfo,
} from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useUnistyles } from "react-native-unistyles";
import type { IconWeight } from "phosphor-react-native";

import { HeaderBand } from "../components/ScreenHeader";
import { getIconComponent } from "./iconRegistry";
import {
  searchIcons,
  getIconsByCategory,
  iconNameToLabel,
  CATEGORY_ORDER,
  CATEGORY_LABELS,
  CATEGORY_ICONS,
  type IconCategory,
} from "./iconIndex";
import type { BadgeIconWeight } from "./types";
import {
  styles,
  MODAL_ICON_SIZE,
  MODAL_GRID_COLUMNS,
  MODAL_ROW_HEIGHT,
} from "./IconPickerModal.styles";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface IconPickerModalProps {
  visible: boolean;
  selectedIcon: string;
  selectedWeight: BadgeIconWeight;
  onSelectIcon: (iconName: string) => void;
  onSelectWeight: (weight: BadgeIconWeight) => void;
  onClose: () => void;
  accentColor?: string;
  testID?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const WEIGHTS: { value: BadgeIconWeight; label: string; abbrev: string }[] = [
  { value: "thin", label: "Thin", abbrev: "Th" },
  { value: "light", label: "Light", abbrev: "Lt" },
  { value: "regular", label: "Regular", abbrev: "Rg" },
  { value: "bold", label: "Bold", abbrev: "Bd" },
  { value: "fill", label: "Fill", abbrev: "Fl" },
  { value: "duotone", label: "Duotone", abbrev: "Du" },
];

const CATEGORY_TAB_ICON_SIZE = 22;
const PREVIEW_ICON_SIZE = 48;

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface ModalIconCellProps {
  name: string;
  weight: IconWeight;
  isSelected: boolean;
  accentColor: string;
  onPress: (name: string) => void;
  iconColor: string;
  selectedIconColor: string;
}

const ModalIconCell = React.memo(function ModalIconCell({
  name,
  weight,
  isSelected,
  accentColor,
  onPress,
  iconColor,
  selectedIconColor,
}: ModalIconCellProps) {
  const IconComponent = getIconComponent(name);
  if (!IconComponent) return null;

  const label = iconNameToLabel(name);

  return (
    <Pressable
      onPress={() => onPress(name)}
      accessibilityRole="button"
      accessibilityLabel={`${label} icon${isSelected ? ", selected" : ""}`}
      accessibilityState={{ selected: isSelected }}
      accessibilityHint="Double tap to select"
      style={[
        styles.iconCell,
        isSelected && styles.iconCellSelected,
        isSelected && { backgroundColor: accentColor },
      ]}
    >
      <IconComponent
        size={MODAL_ICON_SIZE}
        weight={weight}
        color={isSelected ? selectedIconColor : iconColor}
      />
      <Text
        style={[styles.iconLabel, isSelected && styles.iconLabelSelected]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
});

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function IconPickerModal({
  visible,
  selectedIcon,
  selectedWeight,
  onSelectIcon,
  onSelectWeight,
  onClose,
  accentColor,
  testID = "icon-picker-modal",
}: IconPickerModalProps) {
  const { theme } = useUnistyles();
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<IconCategory | null>(
    null,
  );

  // Reset search/filter state when modal closes so it's fresh on reopen
  useEffect(() => {
    if (!visible) {
      setQuery("");
      setActiveCategory(null);
    }
  }, [visible]);

  const resolvedAccent = accentColor ?? theme.colors.accentPrimary;
  const iconColor = theme.colors.text;
  const selectedIconColor = theme.colors.background;

  // Compute visible icons
  const visibleIcons = useMemo(() => {
    if (query.trim()) {
      return searchIcons(query);
    }
    if (activeCategory) {
      return getIconsByCategory(activeCategory);
    }
    return searchIcons(""); // popular
  }, [query, activeCategory]);

  const handleCategoryPress = useCallback((category: IconCategory) => {
    setQuery("");
    setActiveCategory((prev) => (prev === category ? null : category));
  }, []);

  const handleSearchChange = useCallback((text: string) => {
    setQuery(text);
    if (text.trim()) {
      setActiveCategory(null);
    }
  }, []);

  const handleClearSearch = useCallback(() => {
    setQuery("");
  }, []);

  const selectedLabel = iconNameToLabel(selectedIcon);
  const weightLabel =
    WEIGHTS.find((w) => w.value === selectedWeight)?.label ?? "Regular";

  // Render helpers
  const renderIcon = useCallback(
    ({ item }: ListRenderItemInfo<string>) => (
      <ModalIconCell
        name={item}
        weight={selectedWeight as IconWeight}
        isSelected={item === selectedIcon}
        accentColor={resolvedAccent}
        onPress={onSelectIcon}
        iconColor={iconColor}
        selectedIconColor={selectedIconColor}
      />
    ),
    [
      selectedWeight,
      selectedIcon,
      resolvedAccent,
      onSelectIcon,
      iconColor,
      selectedIconColor,
    ],
  );

  const keyExtractor = useCallback((item: string) => item, []);

  const getItemLayout = useCallback(
    (_data: ArrayLike<string> | null | undefined, index: number) => ({
      length: MODAL_ROW_HEIGHT,
      offset: MODAL_ROW_HEIGHT * Math.floor(index / MODAL_GRID_COLUMNS),
      index,
    }),
    [],
  );

  const SelectedIconComponent = getIconComponent(selectedIcon);
  const XIcon = getIconComponent("X");

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
      accessibilityViewIsModal
    >
      {/* Only mount content when visible to avoid FlatList nesting warnings
          when this Modal is rendered inside a parent ScrollView */}
      {visible && (
        <SafeAreaProvider>
          <View style={styles.modalRoot} testID={testID}>
            <HeaderBand>
              <Pressable
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel="Close icon picker"
                style={styles.closeButton}
              >
                {XIcon ? (
                  <XIcon
                    size={24}
                    color={theme.colors.accentPurpleFg}
                    weight="bold"
                  />
                ) : (
                  <Text style={styles.closeIconFallback}>{"\u2715"}</Text>
                )}
              </Pressable>
              <Text style={styles.headerTitle} accessibilityRole="header">
                Choose Icon
              </Text>
              <View style={styles.headerSpacer} />
            </HeaderBand>

            <View style={styles.contentArea}>
              {/* Preview bar */}
              <View
                style={styles.previewBar}
                accessibilityLiveRegion="polite"
                accessibilityLabel={`Selected: ${selectedLabel}, ${weightLabel}`}
              >
                <View
                  style={[
                    styles.previewIconContainer,
                    { backgroundColor: resolvedAccent },
                  ]}
                >
                  {SelectedIconComponent && (
                    <SelectedIconComponent
                      size={PREVIEW_ICON_SIZE}
                      weight={selectedWeight as IconWeight}
                      color={selectedIconColor}
                    />
                  )}
                </View>
                <Text style={styles.previewLabel}>
                  {selectedLabel} — {weightLabel}
                </Text>
              </View>

              {/* Search */}
              <View style={styles.searchContainer}>
                <TextInput
                  testID={`${testID}-search`}
                  accessibilityRole="search"
                  accessibilityLabel="Search icons"
                  placeholder="Search icons..."
                  placeholderTextColor={theme.colors.textSecondary}
                  value={query}
                  onChangeText={handleSearchChange}
                  style={styles.searchInput}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="search"
                />
                <Text style={styles.searchCount}>
                  {visibleIcons.length} icons
                </Text>
                {query.length > 0 && (
                  <Pressable
                    onPress={handleClearSearch}
                    accessibilityRole="button"
                    accessibilityLabel="Clear search"
                    style={styles.clearButton}
                  >
                    <Text style={styles.clearButtonText}>{"\u2715"}</Text>
                  </Pressable>
                )}
              </View>

              {/* Category tabs */}
              <View
                style={styles.categoryContainer}
                accessibilityRole="tablist"
                accessibilityLabel="Icon categories"
              >
                {CATEGORY_ORDER.map((category) => {
                  const isActive = activeCategory === category && !query.trim();
                  const catIconName = CATEGORY_ICONS[category];
                  const CatIcon = getIconComponent(catIconName);
                  return (
                    <Pressable
                      key={category}
                      onPress={() => handleCategoryPress(category)}
                      accessibilityRole="tab"
                      accessibilityLabel={`${CATEGORY_LABELS[category]} category${isActive ? ", active" : ""}`}
                      accessibilityState={{ selected: isActive }}
                      style={[
                        styles.categoryTab,
                        isActive && styles.categoryTabActive,
                        isActive && { backgroundColor: resolvedAccent },
                      ]}
                    >
                      {CatIcon && (
                        <CatIcon
                          size={CATEGORY_TAB_ICON_SIZE}
                          weight={isActive ? "fill" : "regular"}
                          color={isActive ? selectedIconColor : iconColor}
                        />
                      )}
                    </Pressable>
                  );
                })}
              </View>

              {/* Icon grid */}
              <FlatList
                style={{ flex: 1 }}
                data={visibleIcons}
                keyExtractor={keyExtractor}
                renderItem={renderIcon}
                numColumns={MODAL_GRID_COLUMNS}
                contentContainerStyle={styles.gridContent}
                columnWrapperStyle={styles.gridColumnWrapper}
                initialNumToRender={20}
                maxToRenderPerBatch={30}
                windowSize={5}
                getItemLayout={getItemLayout}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>No icons found</Text>
                  </View>
                }
              />

              {/* Weight bar (fixed bottom) */}
              <View
                style={styles.weightBar}
                accessibilityRole="radiogroup"
                accessibilityLabel="Icon weight"
              >
                {WEIGHTS.map((w, i) => {
                  const isActive = w.value === selectedWeight;
                  return (
                    <Pressable
                      key={w.value}
                      onPress={() => onSelectWeight(w.value)}
                      accessibilityRole="radio"
                      accessibilityLabel={`${w.label} weight`}
                      accessibilityState={{ checked: isActive }}
                      style={[
                        styles.weightSegment,
                        i === WEIGHTS.length - 1 && styles.weightSegmentLast,
                        isActive && { backgroundColor: resolvedAccent },
                      ]}
                    >
                      <Text
                        style={[
                          styles.weightLabel,
                          isActive && styles.weightLabelActive,
                        ]}
                      >
                        {w.abbrev}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>
        </SafeAreaProvider>
      )}
    </Modal>
  );
}
