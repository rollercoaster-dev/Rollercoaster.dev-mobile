import React, { Suspense, useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  TextInput,
  View,
} from "react-native";
import { captureBadge, getCaptureDimensions } from "../../badges/captureBadge";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useUnistyles } from "react-native-unistyles";
import { useQuery } from "@evolu/react";
import { useTranslation } from "react-i18next";

import { Text } from "../../components/Text";
import { Button } from "../../components/Button";
import { CollapsibleSection } from "../../components/CollapsibleSection";
import { ErrorBoundary } from "../../components/ErrorBoundary";
import { ScreenSubHeader } from "../../components/ScreenHeader";
import {
  BadgeRenderer,
  getRendererLayoutOptions,
  type BadgeRendererHandle,
} from "../../badges/BadgeRenderer";
import { BOTTOM_LABEL_INPUT_MAX_CHARS } from "../../badges/text/BottomLabel";
import { ShapeSelector } from "../../badges/ShapeSelector";
import { ColorPicker, ACCENT_COLORS } from "../../badges/ColorPicker";
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
  GoalsBadgeDesignerScreenProps,
  GoalsStackParamList,
} from "../../navigation/types";
import { styles } from "./BadgeDesignerScreen.styles";

const logger = new Logger("BadgeDesignerScreen");

const DEFAULT_BANNER = { text: "", position: BannerPosition.top } as const;

type AccordionSectionId =
  | "shape"
  | "frame"
  | "center"
  | "colors"
  | "inscriptions";

// Sized for the worst-case preview (banner + frame + bottom label). Sections
// scroll under the overlay; `pointerEvents="none"` lets taps pass through.
const PREVIEW_OVERLAY_HEIGHT = 280;

/**
 * Hardcoded rather than read via `useBottomTabBarHeight` from
 * `@react-navigation/bottom-tabs`: that import pulls in ESM that needs
 * extra Babel-transform whitelisting in the Jest config for marginal gain.
 */
const TAB_BAR_HEIGHT = 56;

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
  saveLabel,
  saveTestID,
  saveDisabled,
  saveLoading,
  extraFooter,
  previewRef,
}: DesignEditorProps) {
  const { theme } = useUnistyles();
  const { t } = useTranslation("badgeDesigner");
  const resolvedSaveLabel = saveLabel ?? t("actions.save");

  const insets = useSafeAreaInsets();
  const tabBarHeight = TAB_BAR_HEIGHT + insets.bottom;

  const handleShapeChange = (shape: BadgeShape) => {
    if (shape === currentDesign.shape) return;
    const maxTop = getPathTextMaxChars(shape, "top");
    const maxBottom = getPathTextMaxChars(shape, "bottom");
    onDesignChange({
      ...currentDesign,
      shape,
      pathText: currentDesign.pathText?.slice(0, maxTop),
      pathTextBottom: currentDesign.pathTextBottom?.slice(0, maxBottom),
    });
  };

  const handleColorChange = (color: string) =>
    onDesignChange({ ...currentDesign, color });

  const handleIconChange = (iconName: string) =>
    onDesignChange({ ...currentDesign, iconName });

  const handleWeightChange = (iconWeight: BadgeIconWeight) =>
    onDesignChange({ ...currentDesign, iconWeight });

  const handleFrameChange = (frame: BadgeFrame) => {
    if (frame === BadgeFrame.none) {
      onDesignChange({ ...currentDesign, frame, frameParams: undefined });
      return;
    }
    // Fall back to the design's existing frameParams during the hydration
    // window so a re-selected frame doesn't regress to a params-less state
    // and silently render no ring.
    onDesignChange({
      ...currentDesign,
      frame,
      frameParams: derivedFrameParams ?? currentDesign.frameParams,
    });
  };

  const handleCenterModeChange = (centerMode: BadgeCenterMode) =>
    onDesignChange({ ...currentDesign, centerMode });

  const handleMonogramChange = (monogram: string) =>
    onDesignChange({ ...currentDesign, monogram });

  const handleBottomLabelChange = (bottomLabel: string) =>
    onDesignChange({ ...currentDesign, bottomLabel });

  const handlePathTextToggle = (enabled: boolean) => {
    if (enabled) {
      onDesignChange({
        ...currentDesign,
        pathText: "",
        pathTextPosition: PathTextPosition.top,
      });
      return;
    }
    onDesignChange({
      ...currentDesign,
      pathText: undefined,
      pathTextPosition: undefined,
      pathTextBottom: undefined,
    });
  };

  const handlePathTextChange = (pathText: string) =>
    onDesignChange({ ...currentDesign, pathText });

  const handlePathTextBottomChange = (pathTextBottom: string) =>
    onDesignChange({ ...currentDesign, pathTextBottom });

  const handlePathTextPositionChange = (pathTextPosition: PathTextPosition) =>
    onDesignChange({ ...currentDesign, pathTextPosition });

  const handleBannerToggle = (enabled: boolean) =>
    onDesignChange({
      ...currentDesign,
      banner: enabled ? { ...DEFAULT_BANNER } : undefined,
    });

  const handleBannerTextChange = (text: string) =>
    onDesignChange({
      ...currentDesign,
      banner: { ...(currentDesign.banner ?? DEFAULT_BANNER), text },
    });

  const handleBannerPositionChange = (position: BannerPosition) =>
    onDesignChange({
      ...currentDesign,
      banner: { ...(currentDesign.banner ?? DEFAULT_BANNER), position },
    });

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

  const previewLabel = t("preview.a11y", {
    color: currentDesign.color,
    shape: currentDesign.shape,
    frame,
    icon: currentDesign.iconName,
  });

  // Single-open: opening any section replaces the current one; pressing the
  // open header collapses it, leaving every section closed.
  const [expandedSection, setExpandedSection] =
    useState<AccordionSectionId | null>("shape");
  const openSection = (id: AccordionSectionId) => (next: boolean) => {
    setExpandedSection(next ? id : null);
  };

  const colorId = ACCENT_COLORS.find((c) => c.hex === currentDesign.color)?.id;
  const colorSummary =
    currentDesign.color === goalColor
      ? t("color.options.goal")
      : colorId
        ? t(`color.options.${colorId}` as const)
        : currentDesign.color;

  const shapeSummary = t(`shape.options.${currentDesign.shape}` as const);
  const frameSummary = t(`frame.options.${frame}` as const);

  // Monogram branch deliberately does NOT interpolate the user-entered value:
  // accordion headers stay deterministic category-only summaries, no free-text
  // echo. Same key used whether monogram is empty or filled.
  const centerSummary =
    centerMode === BadgeCenterMode.icon
      ? t("accordion.summary.centerIcon", { icon: currentDesign.iconName })
      : t("accordion.summary.centerMonogramEmpty");

  // Enumerate enabled inscription kinds without echoing user content.
  const inscriptionParts: string[] = [];
  if (bottomLabel)
    inscriptionParts.push(t("accordion.summary.inscriptionsLabel"));
  if (pathTextEnabled)
    inscriptionParts.push(t("accordion.summary.inscriptionsPath"));
  if (bannerEnabled)
    inscriptionParts.push(t("accordion.summary.inscriptionsBanner"));
  const inscriptionsSummary = inscriptionParts.length
    ? inscriptionParts.join(" · ")
    : t("accordion.summary.inscriptionsNone");

  const expandA11y = t("accordion.expandA11y");
  const collapseA11y = t("accordion.collapseA11y");

  return (
    <View style={styles.editorRoot}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: PREVIEW_OVERLAY_HEIGHT,
            paddingBottom: tabBarHeight + 16,
          },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <CollapsibleSection
          title={t("accordion.sections.shape")}
          variant="card"
          summary={shapeSummary}
          expanded={expandedSection === "shape"}
          onExpandedChange={openSection("shape")}
          expandLabel={expandA11y}
          collapseLabel={collapseA11y}
        >
          <ShapeSelector
            selectedShape={currentDesign.shape}
            onSelectShape={handleShapeChange}
            accentColor={currentDesign.color}
          />
        </CollapsibleSection>

        <CollapsibleSection
          title={t("accordion.sections.frame")}
          variant="card"
          summary={frameSummary}
          expanded={expandedSection === "frame"}
          onExpandedChange={openSection("frame")}
          expandLabel={expandA11y}
          collapseLabel={collapseA11y}
        >
          <FrameSelector
            selectedFrame={frame}
            onSelectFrame={handleFrameChange}
            accentColor={currentDesign.color}
          />
        </CollapsibleSection>

        <CollapsibleSection
          title={t("accordion.sections.center")}
          variant="card"
          summary={centerSummary}
          expanded={expandedSection === "center"}
          onExpandedChange={openSection("center")}
          expandLabel={expandA11y}
          collapseLabel={collapseA11y}
        >
          <View style={styles.sectionStack}>
            <CenterModeSelector
              selectedMode={centerMode}
              monogram={monogram}
              onSelectMode={handleCenterModeChange}
              onChangeMonogram={handleMonogramChange}
              accentColor={currentDesign.color}
            />
            {centerMode === BadgeCenterMode.icon && (
              <IconPicker
                selectedIcon={currentDesign.iconName}
                selectedWeight={currentDesign.iconWeight}
                onSelectIcon={handleIconChange}
                onSelectWeight={handleWeightChange}
                accentColor={currentDesign.color}
              />
            )}
          </View>
        </CollapsibleSection>

        <CollapsibleSection
          title={t("accordion.sections.colors")}
          variant="card"
          summary={colorSummary}
          expanded={expandedSection === "colors"}
          onExpandedChange={openSection("colors")}
          expandLabel={expandA11y}
          collapseLabel={collapseA11y}
        >
          <ColorPicker
            selectedColor={currentDesign.color}
            onSelectColor={handleColorChange}
            goalColor={goalColor ?? undefined}
          />
        </CollapsibleSection>

        <CollapsibleSection
          title={t("accordion.sections.inscriptions")}
          variant="card"
          summary={inscriptionsSummary}
          expanded={expandedSection === "inscriptions"}
          onExpandedChange={openSection("inscriptions")}
          expandLabel={expandA11y}
          collapseLabel={collapseA11y}
        >
          <View style={styles.sectionStack}>
            <TextInput
              accessibilityLabel={t("bottomLabel.a11y")}
              value={bottomLabel}
              onChangeText={handleBottomLabelChange}
              maxLength={BOTTOM_LABEL_INPUT_MAX_CHARS}
              placeholder={t("bottomLabel.placeholder")}
              placeholderTextColor={theme.colors.textSecondary}
              style={styles.bottomLabelInput}
            />
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
        </CollapsibleSection>

        <View style={styles.footer}>
          <Button
            label={resolvedSaveLabel}
            onPress={onSave}
            testID={saveTestID}
            disabled={saveDisabled}
            loading={saveLoading}
          />
          {extraFooter}
        </View>
      </ScrollView>

      <View style={styles.topBar}>
        <ScreenSubHeader label={t("title")} onBack={onBack} />
      </View>

      {/* Static badge preview pinned to the top of the content area (which
          already sits below the safe-area inset via App.tsx's offset), drawn
          over the header band. No scroll-linked motion. */}
      <View style={[styles.previewOverlay, { top: 0 }]} pointerEvents="none">
        <View
          style={styles.previewContainer}
          accessibilityRole="image"
          accessibilityLabel={previewLabel}
        >
          <View collapsable={false} style={styles.badgeCanvas}>
            <BadgeRenderer ref={previewRef} design={currentDesign} size={160} />
          </View>
        </View>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Badge editing content — used by both BadgesStack and GoalsStack redesign
// ---------------------------------------------------------------------------

function BadgeDesignerContentBadge({ badgeId }: { badgeId: string }) {
  const navigation = useNavigation();
  const { theme } = useUnistyles();
  const { t } = useTranslation("badgeDesigner");
  const query = useMemo(
    () => badgeWithGoalQuery(badgeId as BadgeId),
    [badgeId],
  );
  const rows = useQuery(query);
  const badge = rows[0] ?? null;

  const initialDesign = useMemo(() => {
    if (!badge) return null;
    const goalTitle = (badge.goalTitle as string) ?? t("fallback.goalTitle");
    const goalColor = badge.goalColor as string | null;
    return (
      parseBadgeDesign(badge.design as string | null) ??
      createDefaultBadgeDesign(goalTitle, goalColor)
    );
  }, [badge, t]);

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
          t("errors.saveFailedTitle"),
          t("errors.captureFailedMessage"),
        );
        setIsSaving(false);
        return;
      }
    }

    try {
      updateBadge(badgeId as BadgeId, { design: designJson });
    } catch (err) {
      logger.error("Failed to save badge design", { badgeId, error: err });
      Alert.alert(t("errors.saveFailedTitle"), t("errors.saveFailedMessage"));
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
  }, [
    badgeId,
    currentDesign,
    goalIdForCapture,
    isSaving,
    navigation,
    t,
    theme,
  ]);

  if (!badge || !currentDesign) {
    return (
      <View style={styles.centered}>
        <Text variant="body">{t("fallback.badgeNotFound")}</Text>
        <Button
          label={t("actions.goBack")}
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
  const { t } = useTranslation("badgeDesigner");
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
    const title = (goal?.title as string) ?? t("fallback.goalTitle");
    const color = (goal?.color as string | null) ?? null;
    return createDefaultBadgeDesign(title, color);
  }, [goal, goalId, t]);

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
        Alert.alert(t("errors.saveFailedTitle"), t("errors.saveFailedMessage"));
        setIsSaving(false);
      }
    },
    [goalId, isSaving, navigation, returnVia, t, theme],
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
      saveLabel={t("actions.useThisDesign")}
      saveTestID="use-this-design"
      saveLoading={isSaving}
      previewRef={previewRef}
      extraFooter={
        <Button
          label={t("actions.skipDefault")}
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

export function BadgeDesignerScreen({
  route,
}: BadgeDesignerScreenProps | GoalsBadgeDesignerScreenProps) {
  const navigation = useNavigation();
  const { t } = useTranslation("badgeDesigner");
  const params = route.params;

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
        <Text variant="body">{t("fallback.invalidParams")}</Text>
        <Button
          label={t("actions.goBack")}
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
