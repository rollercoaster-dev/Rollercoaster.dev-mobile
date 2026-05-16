import React, { Suspense, useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  TextInput,
  View,
} from "react-native";
import { captureBadge, getCaptureDimensions } from "../../badges/captureBadge";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useUnistyles } from "react-native-unistyles";
import { useQuery } from "@evolu/react";

import { Text } from "../../components/Text";
import { Button } from "../../components/Button";
import { ErrorBoundary } from "../../components/ErrorBoundary";
import { ScreenSubHeader } from "../../components/ScreenHeader";
import {
  BadgeRenderer,
  getRendererLayoutOptions,
  type BadgeRendererHandle,
} from "../../badges/BadgeRenderer";
import { BOTTOM_LABEL_INPUT_MAX_CHARS } from "../../badges/text/BottomLabel";
import { ShapeSelector } from "../../badges/ShapeSelector";
import { ColorPicker } from "../../badges/ColorPicker";
import { IconPicker } from "../../badges/IconPicker";
import { FrameSelector } from "../../badges/FrameSelector";
import { useFrameParamsForGoal } from "../../badges/frames";
import { CenterModeSelector } from "../../badges/CenterModeSelector";
import { PathTextEditor } from "../../badges/PathTextEditor";
import { getPathTextMaxChars } from "../../badges/text/pathTextLimits";
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
  FrameDataParams,
} from "../../badges/types";
import {
  badgeWithGoalQuery,
  goalsQuery,
  updateBadge,
  updateGoal,
} from "../../db";
import type { BadgeId, GoalId } from "../../db";
import { pendingDesignStore } from "../../stores/pendingDesignStore";
import { Logger } from "../../shims/rd-logger";
import { reportError } from "../../services/sentry-report";
import type {
  BadgeDesignerScreenProps,
  GoalsStackParamList,
} from "../../navigation/types";
import { styles } from "./BadgeDesignerScreen.styles";

const logger = new Logger("BadgeDesignerScreen");

const DEFAULT_BANNER = { text: "", position: BannerPosition.top } as const;

/** Reserved space below topBar for the floating preview overlay at rest. */
const PREVIEW_OVERLAY_HEIGHT = 200;

/**
 * Hardcoded rather than read via `useBottomTabBarHeight` from
 * `@react-navigation/bottom-tabs`: that import pulls in ESM that needs
 * extra Babel-transform whitelisting in the Jest config for marginal gain.
 */
const TAB_BAR_HEIGHT = 56;

// ---------------------------------------------------------------------------
// Shared design editor UI (stateless — receives design + callbacks)
// ---------------------------------------------------------------------------

interface DesignEditorProps {
  currentDesign: BadgeDesign;
  goalColor?: string | null;
  goalTitle?: string;
  derivedFrameParams: FrameDataParams | null;
  onDesignChange: (design: BadgeDesign) => void;
  onSave: () => void;
  onBack: () => void;
  saveLabel?: string;
  saveTestID?: string;
  saveDisabled?: boolean;
  saveLoading?: boolean;
  extraFooter?: React.ReactNode;
  /** Ref attached to the BadgeRenderer — callers capture a PNG via its handle. */
  previewRef?: React.RefObject<BadgeRendererHandle | null>;
}

function DesignEditor({
  currentDesign,
  goalColor,
  goalTitle,
  derivedFrameParams,
  onDesignChange,
  onSave,
  onBack,
  saveLabel = "Save Design",
  saveTestID,
  saveDisabled,
  saveLoading,
  extraFooter,
  previewRef,
}: DesignEditorProps) {
  const { theme } = useUnistyles();

  const scrollY = useRef(new Animated.Value(0)).current;
  const [topBarHeight, setTopBarHeight] = useState(64);
  const insets = useSafeAreaInsets();
  const tabBarHeight = TAB_BAR_HEIGHT + insets.bottom;

  // --- Existing handlers ---
  const handleShapeChange = useCallback(
    (shape: BadgeShape) => {
      if (shape === currentDesign.shape) return;
      const maxTop = getPathTextMaxChars(shape, "top");
      const maxBottom = getPathTextMaxChars(shape, "bottom");
      onDesignChange({
        ...currentDesign,
        shape,
        pathText: currentDesign.pathText?.slice(0, maxTop),
        pathTextBottom: currentDesign.pathTextBottom?.slice(0, maxBottom),
      });
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
      if (frame === BadgeFrame.none) {
        onDesignChange({ ...currentDesign, frame, frameParams: undefined });
      } else {
        // Fall back to the design's existing frameParams during the
        // hydration window so a re-selected frame doesn't regress to a
        // params-less state and silently render no ring.
        onDesignChange({
          ...currentDesign,
          frame,
          frameParams: derivedFrameParams ?? currentDesign.frameParams,
        });
      }
    },
    [currentDesign, derivedFrameParams, onDesignChange],
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

  const handleBottomLabelChange = useCallback(
    (bottomLabel: string) => {
      onDesignChange({ ...currentDesign, bottomLabel });
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
  const bottomLabel = currentDesign.bottomLabel ?? "";
  const pathTextEnabled =
    currentDesign.pathText !== undefined ||
    currentDesign.pathTextPosition !== undefined;
  const pathText = currentDesign.pathText ?? "";
  const pathTextPosition =
    currentDesign.pathTextPosition ?? PathTextPosition.top;
  const pathTextBottom = currentDesign.pathTextBottom ?? "";
  const bannerEnabled = currentDesign.banner != null;
  const bannerText = currentDesign.banner?.text ?? "";
  const bannerPosition = currentDesign.banner?.position ?? BannerPosition.top;

  const previewLabel = `Badge preview: ${currentDesign.color} ${currentDesign.shape} ${frame} frame with ${currentDesign.iconName} icon`;

  return (
    <View style={styles.editorRoot}>
      <Animated.ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: topBarHeight + PREVIEW_OVERLAY_HEIGHT,
            paddingBottom: tabBarHeight + 16,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true },
        )}
        scrollEventThrottle={16}
      >
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
          <Text style={styles.sectionLabel}>Bottom Label</Text>
          <TextInput
            accessibilityRole="text"
            accessibilityLabel="Bottom label"
            value={bottomLabel}
            onChangeText={handleBottomLabelChange}
            maxLength={BOTTOM_LABEL_INPUT_MAX_CHARS}
            placeholder="Optional label"
            placeholderTextColor={theme.colors.textSecondary}
            style={styles.bottomLabelInput}
          />
        </View>

        <View style={styles.sectionContainer}>
          <Text style={styles.sectionLabel}>Path Text</Text>
          <PathTextEditor
            enabled={pathTextEnabled}
            text={pathText}
            textBottom={pathTextBottom}
            position={pathTextPosition}
            shape={currentDesign.shape}
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
      </Animated.ScrollView>

      <View
        style={styles.topBar}
        onLayout={(e) => {
          const next = e.nativeEvent.layout.height;
          setTopBarHeight((prev) => (prev === next ? prev : next));
        }}
      >
        <ScreenSubHeader label="Design Badge" onBack={onBack} />
      </View>

      <Animated.View
        style={[
          styles.previewOverlay,
          {
            top: topBarHeight,
            transform: [
              {
                // Stop the upward slide at the bottom edge of the safe-area
                // inset so the preview never crosses into the notch / dynamic
                // island. `topBarHeight` (from onLayout) includes
                // `paddingTop: insets.top` from HeaderBand, hence the subtract.
                translateY: scrollY.interpolate({
                  inputRange: [0, topBarHeight],
                  outputRange: [0, -Math.max(0, topBarHeight - insets.top)],
                  extrapolate: "clamp",
                }),
              },
            ],
          },
        ]}
        pointerEvents="none"
      >
        <View
          style={styles.previewContainer}
          accessibilityRole="image"
          accessibilityLabel={previewLabel}
        >
          <View collapsable={false} style={styles.badgeCanvas}>
            <BadgeRenderer ref={previewRef} design={currentDesign} size={160} />
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Badge editing content — used by both BadgesStack and GoalsStack redesign
// ---------------------------------------------------------------------------

function BadgeDesignerContentBadge({ badgeId }: { badgeId: string }) {
  const navigation = useNavigation();
  const { theme } = useUnistyles();
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
  const goalIdForCapture = (badge?.goalId as string | null | undefined) ?? null;
  const previewRef = useRef<BadgeRendererHandle | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const derivedFrameParams = useFrameParamsForGoal(
    (badge?.goalId as GoalId | null | undefined) ?? null,
    (badge?.createdAt as string | null | undefined) ?? null,
    (badge?.completedAt as string | null | undefined) ?? null,
  );

  const handleSave = useCallback(async () => {
    if (!currentDesign || isSaving) return;
    setIsSaving(true);
    const designJson = JSON.stringify(currentDesign);

    // Capture first, then persist. If updateBadge ran first and capture
    // failed, the badge row would point at the old PNG with a new design —
    // an out-of-sync state that survives the user backing out of the alert.
    let pngBase64: string | null = null;
    if (goalIdForCapture) {
      try {
        const pngBuffer = await captureBadge(
          previewRef,
          getCaptureDimensions(
            currentDesign,
            undefined,
            getRendererLayoutOptions(theme),
          ),
        );
        pngBase64 = pngBuffer.toString("base64");
      } catch (captureErr) {
        logger.error("Redesign-save capture failed", {
          badgeId,
          error: captureErr,
        });
        reportError(captureErr, { area: "badge.create", kind: "bake" });
        Alert.alert(
          "Save Failed",
          "Could not capture your design preview. Please try again.",
        );
        setIsSaving(false);
        return;
      }
    }

    try {
      updateBadge(badgeId as BadgeId, { design: designJson });
    } catch (err) {
      logger.error("Failed to save badge design", { badgeId, error: err });
      Alert.alert(
        "Save Failed",
        "Could not save your badge design. Please try again.",
      );
      setIsSaving(false);
      return;
    }

    if (goalIdForCapture && pngBase64) {
      pendingDesignStore.set(goalIdForCapture, {
        designJson,
        pngBase64,
      });
    }

    navigation.goBack();
  }, [badgeId, currentDesign, goalIdForCapture, isSaving, navigation, theme]);

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
      derivedFrameParams={derivedFrameParams}
      onDesignChange={setDesign}
      onSave={handleSave}
      onBack={() => navigation.goBack()}
      previewRef={previewRef}
      saveLoading={isSaving}
      saveDisabled={isSaving}
    />
  );
}

// ---------------------------------------------------------------------------
// GoalsStack: new-goal mode — no badge exists yet, design saved to store
// ---------------------------------------------------------------------------

function BadgeDesignerContentNewGoal({
  goalId,
  returnVia,
}: {
  goalId: string;
  returnVia?: "back";
}) {
  const navigation =
    useNavigation<NativeStackNavigationProp<GoalsStackParamList>>();
  const { theme } = useUnistyles();
  const goals = useQuery(goalsQuery);
  const goal = goals.find((g) => g.id === goalId) ?? null;

  // Three-tier precedence so a Redesign-First return — warm session OR after
  // cold start — opens with the user's configured design, not the default:
  //   1. pendingDesignStore (warm session)
  //   2. goal.design (persisted; survives cold start + Evolu sync)
  //   3. createDefaultBadgeDesign (true fallback)
  const initialDesign = useMemo(() => {
    const pending = pendingDesignStore.get(goalId);
    if (pending) {
      const parsed = parseBadgeDesign(pending.designJson);
      if (parsed) return parsed;
    }
    const persisted = parseBadgeDesign((goal?.design as string | null) ?? null);
    if (persisted) return persisted;
    const title = (goal?.title as string) ?? "Untitled";
    const color = (goal?.color as string | null) ?? null;
    return createDefaultBadgeDesign(title, color);
  }, [goal, goalId]);

  const [design, setDesign] = useState<BadgeDesign | null>(null);
  const currentDesign = design ?? initialDesign;

  const goalColor = (goal?.color as string | null) ?? null;

  const derivedFrameParams = useFrameParamsForGoal(
    goalId as GoalId,
    (goal?.createdAt as string | null | undefined) ?? null,
    null,
  );

  const previewRef = useRef<BadgeRendererHandle | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const saveAndNavigate = useCallback(
    async (designToSave: BadgeDesign) => {
      if (isSaving) return;
      setIsSaving(true);
      try {
        const designJson = JSON.stringify(designToSave);
        const pngBuffer = await captureBadge(
          previewRef,
          getCaptureDimensions(
            designToSave,
            undefined,
            getRendererLayoutOptions(theme),
          ),
        );
        // Persist to goal row first so a navigation that interrupts the
        // pendingDesignStore write still leaves the configured design on
        // disk — the source of truth across cold starts and device sync.
        updateGoal(goalId as GoalId, { design: designJson });
        pendingDesignStore.set(goalId, {
          designJson,
          pngBase64: pngBuffer.toString("base64"),
        });
        if (returnVia === "back") {
          navigation.goBack();
        } else {
          navigation.replace("EditMode", { goalId });
        }
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
    [goalId, isSaving, navigation, returnVia, theme],
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
      derivedFrameParams={derivedFrameParams}
      onDesignChange={setDesign}
      onSave={handleSave}
      onBack={() => navigation.goBack()}
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
  | { mode: "new-goal"; goalId: string; returnVia?: "back" }
  | { mode: "redesign"; badgeId: string };

export function BadgeDesignerScreen({
  route,
}: BadgeDesignerScreenProps | { route: { params: ScreenParams } }) {
  const navigation = useNavigation();
  const { theme } = useUnistyles();
  const params = route.params as ScreenParams;

  let content: React.ReactNode;
  if ("mode" in params && params.mode === "new-goal") {
    content = (
      <BadgeDesignerContentNewGoal
        goalId={params.goalId}
        returnVia={params.returnVia}
      />
    );
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
    <View style={styles.screen}>
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
  );
}
