import React, { Suspense, useMemo, useRef, useState } from "react";
import {
  View,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  type LayoutChangeEvent,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@evolu/react";
import { Text } from "../../components/Text";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { ErrorBoundary } from "../../components/ErrorBoundary";
import { IconButton } from "../../components/IconButton";
import { HeaderBand } from "../../components/ScreenHeader";
import { badgeWithGoalQuery, deleteBadge } from "../../db";
import type { BadgeId } from "../../db";
import { PLACEHOLDER_IMAGE_URI } from "../../hooks/useCreateBadge";
import { useBadgeExport } from "../../hooks/useBadgeExport";
import { BadgeRenderer } from "../../badges/BadgeRenderer";
import { parseBadgeDesign } from "../../badges/types";
import { formatDate } from "../../utils/format";
import type {
  BadgeDetailScreenProps,
  BadgesStackParamList,
} from "../../navigation/types";
import { styles } from "./BadgeDetailScreen.styles";

/**
 * Initial reservation for the floating preview before onLayout fires.
 * The overlay measures itself and updates this — picked generously enough
 * to cover a fully-decorated badge (banner + frame + bottom label) so the
 * scroll content doesn't briefly flash on top of the badge during mount.
 */
const PREVIEW_OVERLAY_INITIAL_HEIGHT = 280;

/**
 * Pulls the achievement criteria narrative out of a stored OB3
 * VerifiableCredential (the "how it was earned" text). Defensive: any parse
 * failure or shape mismatch returns null so the UI just hides the section.
 */
function extractCriteriaNarrative(credential: string | null): string | null {
  if (!credential) return null;
  try {
    const parsed: unknown = JSON.parse(credential);
    const subject = (parsed as { credentialSubject?: unknown })
      ?.credentialSubject;
    const achievement = (subject as { achievement?: unknown })?.achievement;
    const criteria = (achievement as { criteria?: unknown })?.criteria;
    const narrative = (criteria as { narrative?: unknown })?.narrative;
    return typeof narrative === "string" && narrative.length > 0
      ? narrative
      : null;
  } catch {
    return null;
  }
}

/**
 * Header band rendered between the ScrollView and the floating preview so
 * document order matches the visual stack: scroll content (back) → topBar
 * (middle) → preview overlay (front). Relying on document order rather than
 * just `zIndex` keeps the layering robust across RN platforms / versions
 * where parent stacking contexts can override sibling zIndex resolution.
 */
function DetailTopBar({
  onBack,
  onLayout,
}: {
  onBack: () => void;
  onLayout: (e: LayoutChangeEvent) => void;
}) {
  return (
    <View style={styles.topBar} onLayout={onLayout}>
      {/* Title intentionally omitted — the badge floats over the band and
          any header text would peek out behind it. */}
      <HeaderBand>
        <IconButton
          icon={
            <Text variant="headline" style={styles.backIcon}>
              {"\u2190"}
            </Text>
          }
          onPress={onBack}
          tone="chrome"
          accessibilityLabel="Go back"
        />
      </HeaderBand>
    </View>
  );
}

function BadgeDetailContent({
  badgeId,
  onTopBarLayout,
}: {
  badgeId: string;
  onTopBarLayout: (e: LayoutChangeEvent) => void;
}) {
  const navigation =
    useNavigation<NativeStackNavigationProp<BadgesStackParamList>>();
  // Pin the floating preview right below the notch — matches the Designer's
  // max-scroll resting position (top: insets.top) so both screens land on
  // the same vertical anchor.
  const insets = useSafeAreaInsets();
  const query = useMemo(
    () => badgeWithGoalQuery(badgeId as BadgeId),
    [badgeId],
  );
  const rows = useQuery(query);
  const badge = rows[0] ?? null;

  const [imageLoadFailed, setImageLoadFailed] = useState(false);
  const [previewHeight, setPreviewHeight] = useState(
    PREVIEW_OVERLAY_INITIAL_HEIGHT,
  );
  const {
    exportImage,
    exportDesignImage,
    exportJSON,
    isExportingImage,
    isExportingJSON,
  } = useBadgeExport();
  const badgeRendererRef = useRef<View>(null);

  const handleDelete = () => {
    Alert.alert(
      "Delete Badge",
      "This will permanently remove this badge. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            deleteBadge(badgeId as BadgeId);
            navigation.goBack();
          },
        },
      ],
    );
  };

  if (!badge) {
    return (
      <>
        <View style={styles.centered}>
          <Text variant="body">Badge not found</Text>
        </View>
        <DetailTopBar
          onBack={() => navigation.goBack()}
          onLayout={onTopBarLayout}
        />
      </>
    );
  }

  const imageUri = badge.imageUri as string | null;
  const hasRealImage =
    imageUri && imageUri !== PLACEHOLDER_IMAGE_URI && !imageLoadFailed;
  const goalTitle = (badge.goalTitle as string) ?? "Untitled";
  const goalDescription = badge.goalDescription as string | null;
  const goalIcon = badge.goalIcon as string | null;
  const goalColor = badge.goalColor as string | null;
  const earnedDate = formatDate(
    (badge.completedAt ?? badge.createdAt) as string | null,
  );
  const design = parseBadgeDesign(badge.design as string | null);
  const criteriaNarrative = extractCriteriaNarrative(
    badge.credential as string | null,
  );
  const hasIdentityChip = Boolean(goalIcon || goalColor);

  return (
    <>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + previewHeight },
        ]}
      >
        <Text style={styles.title}>{goalTitle}</Text>

        {hasIdentityChip ? (
          <View
            style={styles.identityChip}
            accessible
            accessibilityRole="image"
            accessibilityLabel={
              goalIcon ? `Goal identity: ${goalIcon}` : "Goal color indicator"
            }
          >
            {goalIcon ? <Text style={styles.chipIcon}>{goalIcon}</Text> : null}
            {goalColor ? (
              <View
                style={[styles.chipColorDot, { backgroundColor: goalColor }]}
              />
            ) : null}
          </View>
        ) : null}

        {earnedDate ? (
          <Text style={styles.description}>Earned {earnedDate}</Text>
        ) : null}

        <Button
          label="Customize Badge"
          variant="secondary"
          onPress={() => navigation.navigate("BadgeDesigner", { badgeId })}
        />

        <Card>
          <View style={styles.infoSection}>
            {goalDescription ? (
              <View style={styles.infoBlock}>
                <Text style={styles.sectionLabel}>About</Text>
                <Text style={styles.bodyText}>{goalDescription}</Text>
              </View>
            ) : null}

            {criteriaNarrative ? (
              <View style={styles.infoBlock}>
                <Text style={styles.sectionLabel}>How it was earned</Text>
                <Text style={styles.bodyText}>{criteriaNarrative}</Text>
              </View>
            ) : null}

            <View style={styles.infoBlock}>
              <Text style={styles.sectionLabel}>Details</Text>
              <Text style={styles.bodyText}>
                Created {formatDate(badge.createdAt as string | null)}
              </Text>
            </View>
          </View>
        </Card>

        <Card>
          <View style={styles.infoBlock}>
            <Text style={styles.sectionLabel}>Export</Text>
            <Button
              label="Save Image"
              variant="secondary"
              onPress={() =>
                design
                  ? exportDesignImage(badgeRendererRef)
                  : exportImage(imageUri)
              }
              loading={isExportingImage}
              disabled={!design && !hasRealImage}
            />
            <Button
              label="Export Credential (JSON)"
              variant="secondary"
              onPress={() =>
                exportJSON(badge.credential as string | null, goalTitle)
              }
              loading={isExportingJSON}
              disabled={!badge.credential}
            />
          </View>
        </Card>

        <Button
          label="Delete Badge"
          variant="destructive"
          onPress={handleDelete}
        />
      </ScrollView>

      {/* Document order matters: topBar must render between the ScrollView
          and the previewOverlay so the visual stack (scroll → header →
          floating badge) holds even on platforms where sibling zIndex is
          ignored. */}
      <DetailTopBar
        onBack={() => navigation.goBack()}
        onLayout={onTopBarLayout}
      />

      <View
        style={[styles.previewOverlay, { top: insets.top }]}
        pointerEvents="none"
        onLayout={(e) => {
          const next = e.nativeEvent.layout.height;
          setPreviewHeight((prev) => (prev === next ? prev : next));
        }}
      >
        <View style={styles.previewContainer}>
          {design ? (
            <View
              ref={badgeRendererRef}
              collapsable={false}
              style={styles.badgeCanvas}
            >
              <BadgeRenderer design={design} size={160} />
            </View>
          ) : hasRealImage ? (
            <Image
              source={{ uri: imageUri }}
              style={styles.badgeImage}
              resizeMode="contain"
              accessibilityLabel={`Badge image for ${goalTitle}`}
              onError={() => setImageLoadFailed(true)}
            />
          ) : (
            <View style={styles.badgeImage}>
              <Text style={styles.badgeInitial}>
                {(goalTitle.charAt(0) || "?").toUpperCase()}
              </Text>
            </View>
          )}
        </View>
      </View>
    </>
  );
}

export function BadgeDetailScreen({ route }: BadgeDetailScreenProps) {
  const navigation = useNavigation();
  const { badgeId } = route.params;
  const [topBarHeight, setTopBarHeight] = useState(64);

  const handleTopBarLayout = (e: LayoutChangeEvent) => {
    const next = e.nativeEvent.layout.height;
    setTopBarHeight((prev) => (prev === next ? prev : next));
  };

  return (
    <View style={styles.screen}>
      <ErrorBoundary>
        <Suspense
          fallback={
            <>
              {/* Header stays mounted during data load so the user can still
                  go back; once content resolves, BadgeDetailContent renders
                  its own DetailTopBar between the ScrollView and the
                  preview to preserve the stacking order. */}
              <DetailTopBar
                onBack={() => navigation.goBack()}
                onLayout={handleTopBarLayout}
              />
              <ActivityIndicator
                style={[styles.loadingIndicator, { marginTop: topBarHeight }]}
                size="large"
              />
            </>
          }
        >
          <BadgeDetailContent
            badgeId={badgeId}
            onTopBarLayout={handleTopBarLayout}
          />
        </Suspense>
      </ErrorBoundary>
    </View>
  );
}
