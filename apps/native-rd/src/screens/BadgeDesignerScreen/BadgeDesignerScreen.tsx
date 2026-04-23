import React, { Suspense, useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  TextInput,
  View,
} from "react-native";
import { captureBadge } from "../../badges/captureBadge";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useUnistyles } from "react-native-unistyles";
import { useQuery } from "@evolu/react";

import { Text } from "../../components/Text";
import { IconButton } from "../../components/IconButton";
import { Button } from "../../components/Button";
import { ErrorBoundary } from "../../components/ErrorBoundary";
import { BadgeRenderer } from "../../badges/BadgeRenderer";
import { ShapeSelector } from "../../badges/ShapeSelector";
import { ColorPicker } from "../../badges/ColorPicker";
import { IconPicker } from "../../badges/IconPicker";
import { FrameSelector } from "../../badges/FrameSelector";
import { CenterModeSelector } from "../../badges/CenterModeSelector";
import { PathTextEditor } from "../../badges/PathTextEditor";
import { BannerEditor } from "../../badges/BannerEditor";
import {
  parseBadgeDesign,
  createDefaultBadgeDesign,
  BadgeFrame,
  BadgeCenterMode,
  PathTextPosition,
  BannerPosition,
} from "../../badges/types";
import type {
  BadgeDesign,
  BadgeShape,
  BadgeIconWeight,
} from "../../badges/types";
import { badgeWithGoalQuery, goalsQuery, updateBadge } from "../../db";
import type { BadgeId } from "../../db";
import { pendingDesignStore } from "../../stores/pendingDesignStore";
import { Logger } from "../../shims/rd-logger";
import type {
  BadgeDesignerScreenProps,
  GoalsStackParamList,
} from "../../navigation/types";
import { styles } from "./BadgeDesignerScreen.styles";

const logger = new Logger("BadgeDesignerScreen");

const DEFAULT_BANNER = { text: "", position: BannerPosition.center } as const;

// ---------------------------------------------------------------------------
// Shared design editor UI (stateless — receives design + callbacks)
// ---------------------------------------------------------------------------

interface DesignEditorProps {
  currentDesign: BadgeDesign;
  goalColor?: string | null;
  goalTitle?: string;
  onDesignChange: (design: BadgeDesign) => void;
  onSave: () => void;
  saveLabel?: string;
  saveTestID?: string;
  saveDisabled?: boolean;
  saveLoading?: boolean;
  extraFooter?: React.ReactNode;
  /** Ref attached to the preview View — callers capture a PNG from it. */
  previewRef?: React.RefObject<View | null>;
}

function DesignEditor({
  currentDesign,
  goalColor,
  goalTitle,
  onDesignChange,
  onSave,
  saveLabel = "Save Design",
  saveTestID,
  saveDisabled,
  saveLoading,
  extraFooter,
  previewRef,
}: DesignEditorProps) {
  const { theme } = useUnistyles();

  // --- Existing handlers ---
  const handleShapeChange = useCallback(
    (shape: BadgeShape) => {
      onDesignChange({ ...currentDesign, shape });
    },
    [currentDesign, onDesignChange],
  );

  const handleColorChange = useCallback(
    (color: string) => {
      onDesignChange({ ...currentDesign, color });
    },
    [currentDesign, onDesignChange],
  );

  const handleIconChange = useCallback(
    (iconName: string) => {
      onDesignChange({ ...currentDesign, iconName });
    },
    [currentDesign, onDesignChange],
  );

  const handleWeightChange = useCallback(
    (iconWeight: BadgeIconWeight) => {
      onDesignChange({ ...currentDesign, iconWeight });
    },
    [currentDesign, onDesignChange],
  );

  // --- Frame + Center handlers ---
  const handleFrameChange = useCallback(
    (frame: BadgeFrame) => {
      onDesignChange({ ...currentDesign, frame });
    },
    [currentDesign, onDesignChange],
  );

  const handleCenterModeChange = useCallback(
    (centerMode: BadgeCenterMode) => {
      onDesignChange({ ...currentDesign, centerMode });
    },
    [currentDesign, onDesignChange],
  );

  const handleMonogramChange = useCallback(
    (monogram: string) => {
      onDesignChange({ ...currentDesign, monogram });
    },
    [currentDesign, onDesignChange],
  );

  const handleCenterLabelChange = useCallback(
    (centerLabel: string) => {
      onDesignChange({ ...currentDesign, centerLabel });
    },
    [currentDesign, onDesignChange],
  );

  // --- Path text handlers ---
  const handlePathTextToggle = useCallback(
    (enabled: boolean) => {
      if (enabled) {
        onDesignChange({
          ...currentDesign,
          pathText: "",
          pathTextPosition: PathTextPosition.top,
        });
      } else {
        onDesignChange({
          ...currentDesign,
          pathText: undefined,
          pathTextPosition: undefined,
          pathTextBottom: undefined,
        });
      }
    },
    [currentDesign, onDesignChange],
  );

  const handlePathTextChange = useCallback(
    (pathText: string) => {
      onDesignChange({ ...currentDesign, pathText });
    },
    [currentDesign, onDesignChange],
  );

  const handlePathTextBottomChange = useCallback(
    (pathTextBottom: string) => {
      onDesignChange({ ...currentDesign, pathTextBottom });
    },
    [currentDesign, onDesignChange],
  );

  const handlePathTextPositionChange = useCallback(
    (pathTextPosition: PathTextPosition) => {
      onDesignChange({ ...currentDesign, pathTextPosition });
    },
    [currentDesign, onDesignChange],
  );

  // --- Banner handlers ---
  const handleBannerToggle = useCallback(
    (enabled: boolean) => {
      if (enabled) {
        onDesignChange({ ...currentDesign, banner: { ...DEFAULT_BANNER } });
      } else {
        onDesignChange({ ...currentDesign, banner: undefined });
      }
    },
    [currentDesign, onDesignChange],
  );

  const handleBannerTextChange = useCallback(
    (text: string) => {
      onDesignChange({
        ...currentDesign,
        banner: { ...(currentDesign.banner ?? DEFAULT_BANNER), text },
      });
    },
    [currentDesign, onDesignChange],
  );

  const handleBannerPositionChange = useCallback(
    (position: BannerPosition) => {
      onDesignChange({
        ...currentDesign,
        banner: { ...(currentDesign.banner ?? DEFAULT_BANNER), position },
      });
    },
    [currentDesign, onDesignChange],
  );

  // --- Derived UI state ---
  const frame = currentDesign.frame ?? BadgeFrame.none;
  const centerMode = currentDesign.centerMode ?? BadgeCenterMode.icon;
  const monogram = currentDesign.monogram ?? "";
  const centerLabel = currentDesign.centerLabel ?? "";
  const pathTextEnabled =
    currentDesign.pathText !== undefined ||
    currentDesign.pathTextPosition !== undefined;
  const pathText = currentDesign.pathText ?? "";
  const pathTextPosition =
    currentDesign.pathTextPosition ?? PathTextPosition.top;
  const pathTextBottom = currentDesign.pathTextBottom ?? "";
  const bannerEnabled = currentDesign.banner != null;
  const bannerText = currentDesign.banner?.text ?? "";
  const bannerPosition =
    currentDesign.banner?.position ?? BannerPosition.center;

  const previewLabel = `Badge preview: ${currentDesign.color} ${currentDesign.shape} ${frame} frame with ${currentDesign.iconName} icon`;

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      <View
        ref={previewRef}
        collapsable={false}
        style={styles.previewContainer}
        accessibilityRole="image"
        accessibilityLabel={previewLabel}
      >
        <BadgeRenderer design={currentDesign} size={160} />
      </View>

      <View style={styles.sectionContainer}>
        <Text style={styles.sectionLabel}>Shape</Text>
        <ShapeSelector
          selectedShape={currentDesign.shape}
          onSelectShape={handleShapeChange}
          accentColor={currentDesign.color}
        />
      </View>

      <View style={styles.sectionContainer}>
        <Text style={styles.sectionLabel}>Color</Text>
        <ColorPicker
          selectedColor={currentDesign.color}
          onSelectColor={handleColorChange}
          goalColor={goalColor ?? undefined}
        />
      </View>

      <View style={styles.sectionContainer}>
        <Text style={styles.sectionLabel}>Frame</Text>
        <FrameSelector
          selectedFrame={frame}
          onSelectFrame={handleFrameChange}
          accentColor={currentDesign.color}
        />
      </View>

      <View style={styles.sectionContainer}>
        <Text style={styles.sectionLabel}>Center</Text>
        <CenterModeSelector
          selectedMode={centerMode}
          monogram={monogram}
          onSelectMode={handleCenterModeChange}
          onChangeMonogram={handleMonogramChange}
          accentColor={currentDesign.color}
        />
      </View>

      {centerMode === BadgeCenterMode.icon && (
        <View style={styles.iconSection}>
          <Text style={styles.sectionLabel}>Icon</Text>
          <IconPicker
            selectedIcon={currentDesign.iconName}
            selectedWeight={currentDesign.iconWeight}
            onSelectIcon={handleIconChange}
            onSelectWeight={handleWeightChange}
            accentColor={currentDesign.color}
          />
        </View>
      )}

      <View style={styles.sectionContainer}>
        <Text style={styles.sectionLabel}>Center Label</Text>
        <TextInput
          accessibilityLabel="Center label"
          value={centerLabel}
          onChangeText={handleCenterLabelChange}
          maxLength={10}
          placeholder="Optional label"
          placeholderTextColor={theme.colors.textSecondary}
          style={styles.centerLabelInput}
        />
      </View>

      <View style={styles.sectionContainer}>
        <Text style={styles.sectionLabel}>Path Text</Text>
        <PathTextEditor
          enabled={pathTextEnabled}
          text={pathText}
          textBottom={pathTextBottom}
          position={pathTextPosition}
          goalTitle={goalTitle ?? currentDesign.title}
          onToggle={handlePathTextToggle}
          onChangeText={handlePathTextChange}
          onChangeTextBottom={handlePathTextBottomChange}
          onChangePosition={handlePathTextPositionChange}
          accentColor={currentDesign.color}
        />
      </View>

      <View style={styles.sectionContainer}>
        <Text style={styles.sectionLabel}>Banner</Text>
        <BannerEditor
          enabled={bannerEnabled}
          text={bannerText}
          position={bannerPosition}
          onToggle={handleBannerToggle}
          onChangeText={handleBannerTextChange}
          onChangePosition={handleBannerPositionChange}
          accentColor={currentDesign.color}
        />
      </View>

      <View style={styles.footer}>
        <Button
          label={saveLabel}
          onPress={onSave}
          testID={saveTestID}
          disabled={saveDisabled}
          loading={saveLoading}
        />
        {extraFooter}
      </View>
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// Badge editing content — used by both BadgesStack and GoalsStack redesign
// ---------------------------------------------------------------------------

function BadgeDesignerContentBadge({ badgeId }: { badgeId: string }) {
  const navigation = useNavigation();
  const query = useMemo(
    () => badgeWithGoalQuery(badgeId as BadgeId),
    [badgeId],
  );
  const rows = useQuery(query);
  const badge = rows[0] ?? null;

  const initialDesign = useMemo(() => {
    if (!badge) return null;
    const goalTitle = (badge.goalTitle as string) ?? "Untitled";
    const goalColor = badge.goalColor as string | null;
    return (
      parseBadgeDesign(badge.design as string | null) ??
      createDefaultBadgeDesign(goalTitle, goalColor)
    );
  }, [badge]);

  const [design, setDesign] = useState<BadgeDesign | null>(null);
  const currentDesign = design ?? initialDesign;
  const goalColor = badge?.goalColor as string | null | undefined;

  const handleSave = useCallback(() => {
    if (!currentDesign) return;
    try {
      updateBadge(badgeId as BadgeId, {
        design: JSON.stringify(currentDesign),
      });
    } catch (err) {
      logger.error("Failed to save badge design", { badgeId, error: err });
      Alert.alert(
        "Save Failed",
        "Could not save your badge design. Please try again.",
      );
      return;
    }
    navigation.goBack();
  }, [badgeId, currentDesign, navigation]);

  if (!badge || !currentDesign) {
    return (
      <View style={styles.centered}>
        <Text variant="body">Badge not found</Text>
        <Button
          label="Go Back"
          variant="secondary"
          onPress={() => navigation.goBack()}
        />
      </View>
    );
  }

  const badgeGoalTitle =
    (badge.goalTitle as string | null | undefined) ?? undefined;

  return (
    <DesignEditor
      currentDesign={currentDesign}
      goalColor={goalColor}
      goalTitle={badgeGoalTitle}
      onDesignChange={setDesign}
      onSave={handleSave}
    />
  );
}

// ---------------------------------------------------------------------------
// GoalsStack: new-goal mode — no badge exists yet, design saved to store
// ---------------------------------------------------------------------------

function BadgeDesignerContentNewGoal({ goalId }: { goalId: string }) {
  const navigation =
    useNavigation<NativeStackNavigationProp<GoalsStackParamList>>();
  const goals = useQuery(goalsQuery);
  const goal = goals.find((g) => g.id === goalId) ?? null;

  const initialDesign = useMemo(() => {
    const title = (goal?.title as string) ?? "Untitled";
    const color = (goal?.color as string | null) ?? null;
    return createDefaultBadgeDesign(title, color);
  }, [goal]);

  const [design, setDesign] = useState<BadgeDesign | null>(null);
  const currentDesign = design ?? initialDesign;

  const goalColor = (goal?.color as string | null) ?? null;

  const previewRef = useRef<View | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const saveAndNavigate = useCallback(
    async (designToSave: BadgeDesign) => {
      if (isSaving) return;
      setIsSaving(true);
      try {
        const pngBuffer = await captureBadge(previewRef, {
          width: 512,
          height: 512,
        });
        pendingDesignStore.set(goalId, {
          designJson: JSON.stringify(designToSave),
          pngBase64: pngBuffer.toString("base64"),
        });
        navigation.replace("EditMode", { goalId });
      } catch (err) {
        logger.error("Failed to save design and navigate", {
          goalId,
          error: err,
        });
        Alert.alert(
          "Save Failed",
          "Could not save your badge design. Please try again.",
        );
        setIsSaving(false);
      }
    },
    [goalId, isSaving, navigation],
  );

  const handleSave = useCallback(() => {
    void saveAndNavigate(currentDesign);
  }, [currentDesign, saveAndNavigate]);

  const handleSkip = useCallback(() => {
    void saveAndNavigate(initialDesign);
  }, [initialDesign, saveAndNavigate]);

  if (!goal) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const newGoalTitle = goal.title ?? undefined;

  return (
    <DesignEditor
      currentDesign={currentDesign}
      goalColor={goalColor}
      goalTitle={newGoalTitle}
      onDesignChange={setDesign}
      onSave={handleSave}
      saveLabel="Use This Design"
      saveTestID="use-this-design"
      saveLoading={isSaving}
      previewRef={previewRef}
      extraFooter={
        <Button
          label="Skip — Use Default"
          variant="secondary"
          onPress={handleSkip}
          testID="skip-default-design"
          disabled={isSaving}
        />
      }
    />
  );
}

// ---------------------------------------------------------------------------
// Screen wrapper — detects mode from route params
// ---------------------------------------------------------------------------

type ScreenParams =
  | { badgeId: string; mode?: undefined }
  | { mode: "new-goal"; goalId: string }
  | { mode: "redesign"; badgeId: string };

export function BadgeDesignerScreen({
  route,
}: BadgeDesignerScreenProps | { route: { params: ScreenParams } }) {
  const navigation = useNavigation();
  const { theme } = useUnistyles();
  const params = route.params as ScreenParams;

  let content: React.ReactNode;
  if ("mode" in params && params.mode === "new-goal") {
    content = <BadgeDesignerContentNewGoal goalId={params.goalId} />;
  } else if ("badgeId" in params && params.badgeId) {
    content = <BadgeDesignerContentBadge badgeId={params.badgeId} />;
  } else {
    logger.error("BadgeDesignerScreen: unrecognized params", { params });
    content = (
      <View style={styles.centered}>
        <Text variant="body">Invalid badge designer parameters</Text>
        <Button
          label="Go Back"
          variant="secondary"
          onPress={() => navigation.goBack()}
        />
      </View>
    );
  }

  return (
    <SafeAreaView
      edges={["top"]}
      style={{ flex: 1, backgroundColor: theme.colors.accentYellow }}
    >
      <View style={styles.topBar}>
        <IconButton
          icon={<Text variant="headline">{"\u2190"}</Text>}
          onPress={() => navigation.goBack()}
          variant="ghost"
          accessibilityLabel="Go back"
        />
        <Text style={styles.topBarTitle}>Design Badge</Text>
        <View style={styles.spacer} />
      </View>

      <View style={styles.contentArea}>
        <ErrorBoundary>
          <Suspense
            fallback={
              <ActivityIndicator style={styles.loadingIndicator} size="large" />
            }
          >
            {content}
          </Suspense>
        </ErrorBoundary>
      </View>
    </SafeAreaView>
  );
}
