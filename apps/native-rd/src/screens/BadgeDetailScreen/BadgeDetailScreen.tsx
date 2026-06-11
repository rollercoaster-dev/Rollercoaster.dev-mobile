import React, { Suspense, useMemo, useRef, useState } from "react";
import {
  View,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  type LayoutChangeEvent,
} from "react-native";
import { useNavigation, type NavigationProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery } from "@evolu/react";
import { useTranslation } from "react-i18next";
import { ArrowLeft } from "phosphor-react-native";
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
import {
  BadgeRenderer,
  type BadgeRendererHandle,
} from "../../badges/BadgeRenderer";
import { parseBadgeDesign } from "../../badges/types";
import { EVIDENCE_TYPE_ICONS } from "../../constants/evidenceIcons";
import type { EvidenceTypeValue } from "../../types/evidence";
import { formatDate } from "../../utils/format";
import { Logger } from "../../shims/rd-logger";
import type {
  BadgeDetailScreenProps,
  BadgesStackParamList,
  RootTabParamList,
} from "../../navigation/types";
import { styles } from "./BadgeDetailScreen.styles";

/**
 * Initial reservation for the floating preview before onLayout fires.
 * The overlay measures itself and updates this — picked generously enough
 * to cover a fully-decorated badge (banner + frame + bottom label) so the
 * scroll content doesn't briefly flash on top of the badge during mount.
 */
const PREVIEW_OVERLAY_INITIAL_HEIGHT = 280;

const logger = new Logger("BadgeDetailScreen");

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
 * Shape rendered by the "how it was earned" evidence list. `type` is null when
 * the credential's `genre` field is missing or unrecognised — the row still
 * renders, but with a neutral bullet and no type label, so older or
 * cross-version credentials degrade gracefully.
 */
type CredentialEvidence = {
  id: string;
  name: string;
  type: EvidenceTypeValue | null;
};

// Mirrors EvidenceType in db/schema.ts. Kept as a literal set rather than
// re-derived from the runtime enum so this module stays decoupled from the
// db layer (the test suite mocks `../../db` and adding a member there for
// just this check would couple test scaffolding to schema changes).
const KNOWN_EVIDENCE_TYPES: ReadonlySet<EvidenceTypeValue> = new Set([
  "photo",
  "video",
  "text",
  "voice_memo",
  "link",
  "file",
]);

function isKnownEvidenceType(value: string | null): value is EvidenceTypeValue {
  return (
    value !== null && (KNOWN_EVIDENCE_TYPES as ReadonlySet<string>).has(value)
  );
}

/**
 * Reads the OB3 VC's top-level `evidence` array (serializer.ts:261 places it
 * at the root, not under `credentialSubject`) and returns the per-step list
 * the user submitted. Source of truth is the baked credential, not the live
 * DB, so the section keeps working if the goal/step is later edited or
 * deleted — and matches what a third party verifying the badge would see.
 * Defensive: any parse / shape mismatch yields null so the section hides.
 */
function extractEvidenceItems(
  credential: string | null,
): CredentialEvidence[] | null {
  if (!credential) return null;
  try {
    const parsed: unknown = JSON.parse(credential);
    const rawList = (parsed as { evidence?: unknown })?.evidence;
    if (!Array.isArray(rawList) || rawList.length === 0) return null;

    const items: CredentialEvidence[] = [];
    for (const raw of rawList) {
      if (!raw || typeof raw !== "object") continue;
      const entry = raw as {
        id?: unknown;
        name?: unknown;
        genre?: unknown;
      };
      const id = typeof entry.id === "string" ? entry.id : null;
      const name = typeof entry.name === "string" ? entry.name : null;
      if (!id || !name) continue;
      const genre = typeof entry.genre === "string" ? entry.genre : null;
      const type = isKnownEvidenceType(genre) ? genre : null;
      items.push({ id, name, type });
    }
    return items.length > 0 ? items : null;
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
  const { t } = useTranslation(["badgeDetail"]);
  return (
    <View style={styles.topBar} onLayout={onLayout}>
      {/* Title intentionally omitted — the badge floats over the band and
          any header text would peek out behind it. */}
      <HeaderBand>
        <IconButton
          icon={<ArrowLeft size={24} weight="bold" />}
          onPress={onBack}
          tone="chrome"
          accessibilityLabel={t("badgeDetail:fallback.goBack")}
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
  const { t, i18n } = useTranslation(["badgeDetail", "common"]);
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
    exportVerifiableBadge,
    exportImage,
    exportJSON,
    isExportingImage,
    isExportingJSON,
  } = useBadgeExport();
  const badgeRendererRef = useRef<BadgeRendererHandle | null>(null);

  // The journey/timeline screen lives in the Goals stack (it's the same
  // view a user sees while still working toward the goal). Hop tabs via the
  // root parent — mirrors the empty-state navigation in BadgesScreen.
  const handleViewTimeline = (targetGoalId: string) => {
    const parent = navigation.getParent<NavigationProp<RootTabParamList>>();
    if (!parent) {
      // If BadgeDetailScreen is ever hosted outside the bottom-tab navigator
      // (deep link, modal stack, Storybook) the tab parent is missing and a
      // silent no-op would leave the user tapping a dead button.
      logger.warn("View timeline tapped without a tab navigator parent", {
        badgeId,
        goalId: targetGoalId,
      });
      return;
    }
    parent.navigate("GoalsTab", {
      screen: "TimelineJourney",
      params: { goalId: targetGoalId, originBadgeId: badgeId },
    });
  };

  const handleDelete = () => {
    Alert.alert(
      t("badgeDetail:deleteConfirm.title"),
      t("badgeDetail:deleteConfirm.message"),
      [
        { text: t("badgeDetail:deleteConfirm.cancel"), style: "cancel" },
        {
          text: t("badgeDetail:deleteConfirm.delete"),
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
          <Text variant="body">{t("badgeDetail:fallback.badgeNotFound")}</Text>
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
  // Nullable because badgeWithGoalQuery LEFT-JOINs on `goal.isDeleted IS
  // NULL`: soft-deleted goals surface as a null join, masking goalId even
  // though badges.goalId itself is non-null in the schema.
  const goalId = badge.goalId as string | null;
  const goalTitle =
    (badge.goalTitle as string) ?? t("badgeDetail:fallback.untitled");
  const goalDescription = badge.goalDescription as string | null;
  const goalIcon = badge.goalIcon as string | null;
  const goalColor = badge.goalColor as string | null;
  const earnedDate = formatDate(
    (badge.completedAt ?? badge.createdAt) as string | null,
    i18n.language,
  );
  const design = parseBadgeDesign(badge.design as string | null);
  const criteriaNarrative = extractCriteriaNarrative(
    badge.credential as string | null,
  );
  const evidenceItems = extractEvidenceItems(badge.credential as string | null);
  const hasIdentityChip = Boolean(goalIcon || goalColor);

  return (
    <>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: previewHeight },
        ]}
      >
        <Text style={styles.title}>{goalTitle}</Text>

        {hasIdentityChip ? (
          <View
            style={styles.identityChip}
            accessible
            accessibilityRole="image"
            accessibilityLabel={
              goalIcon
                ? t("badgeDetail:identityA11y.icon", { icon: goalIcon })
                : t("badgeDetail:identityA11y.color")
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
          <Text style={styles.description}>
            {t("badgeDetail:earned", { date: earnedDate })}
          </Text>
        ) : null}

        <Card>
          <View style={styles.infoSection}>
            {goalDescription ? (
              <View style={styles.infoBlock}>
                <Text style={styles.sectionLabel}>
                  {t("badgeDetail:sections.about")}
                </Text>
                <Text style={styles.bodyText}>{goalDescription}</Text>
              </View>
            ) : null}

            {criteriaNarrative || evidenceItems ? (
              <View style={styles.infoBlock}>
                <Text style={styles.sectionLabel}>
                  {t("badgeDetail:sections.howEarned")}
                </Text>
                {criteriaNarrative ? (
                  <Text style={styles.bodyText}>{criteriaNarrative}</Text>
                ) : null}
                {evidenceItems ? (
                  // No `accessible` here — would flatten descendants into a
                  // single a11y node and prevent screen-reader users from
                  // focusing individual rows. The list label is exposed via
                  // accessibilityLabel + role="list" without merging.
                  <View
                    style={styles.evidenceList}
                    accessibilityRole="list"
                    accessibilityLabel={t(
                      "badgeDetail:evidenceList.a11yLabel",
                      {
                        count: evidenceItems.length,
                      },
                    )}
                  >
                    {evidenceItems.map((ev) => {
                      const icon = ev.type ? EVIDENCE_TYPE_ICONS[ev.type] : "•";
                      const typeLabel = ev.type
                        ? t(`common:evidenceTypes.${ev.type}.label`)
                        : null;
                      // For unknown/missing genres, still announce *some* type
                      // context so the row doesn't read as a bare proper noun.
                      const a11yTypeLabel =
                        typeLabel ?? t("badgeDetail:evidenceList.fallbackType");
                      const a11yLabel = t("badgeDetail:evidenceList.itemA11y", {
                        name: ev.name,
                        type: a11yTypeLabel,
                      });
                      return (
                        <View
                          key={ev.id}
                          style={styles.evidenceRow}
                          accessible
                          accessibilityLabel={a11yLabel}
                        >
                          <Text
                            style={styles.evidenceIcon}
                            accessibilityElementsHidden
                            importantForAccessibility="no"
                          >
                            {icon}
                          </Text>
                          <View style={styles.evidenceText}>
                            <Text style={styles.bodyText}>{ev.name}</Text>
                            {typeLabel ? (
                              <Text
                                variant="caption"
                                style={styles.evidenceTypeLabel}
                              >
                                {typeLabel}
                              </Text>
                            ) : null}
                          </View>
                        </View>
                      );
                    })}
                  </View>
                ) : null}
              </View>
            ) : null}

            <View style={styles.infoBlock}>
              <Text style={styles.sectionLabel}>
                {t("badgeDetail:sections.details")}
              </Text>
              <Text style={styles.bodyText}>
                {t("badgeDetail:createdAt", {
                  date: formatDate(
                    badge.createdAt as string | null,
                    i18n.language,
                  ),
                })}
              </Text>
            </View>
          </View>
        </Card>

        {goalId ? (
          <Button
            label={t("badgeDetail:actions.viewTimeline")}
            variant="secondary"
            onPress={() => handleViewTimeline(goalId)}
          />
        ) : null}

        <Card>
          <View style={styles.infoBlock}>
            <Text style={styles.sectionLabel}>
              {t("badgeDetail:sections.export")}
            </Text>
            {/* Primary: byte-preserving export of the baked PNG (carries the
                OB 3.0 iTXt credential). On Android this bypasses the share
                sheet entirely via SAF, so messengers can't transcode and
                strip the credential. */}
            <Button
              label={t("badgeDetail:actions.exportVerifiable")}
              variant="primary"
              onPress={() => exportVerifiableBadge(imageUri)}
              loading={isExportingImage}
              disabled={!hasRealImage}
            />
            <Button
              label={t("badgeDetail:actions.exportCredential")}
              variant="secondary"
              onPress={() =>
                exportJSON(badge.credential as string | null, goalTitle)
              }
              loading={isExportingJSON}
              disabled={!badge.credential}
            />
            {/* Honest "lossy" path: messenger photo flows may re-encode the
                PNG and drop the iTXt chunk. Kept available for users who
                only want to share the visual; the caption below explains
                the trade-off. */}
            <Button
              label={t("badgeDetail:actions.saveAsImage")}
              variant="secondary"
              onPress={() => exportImage(imageUri)}
              loading={isExportingImage}
              disabled={!hasRealImage}
              accessibilityHint={t("badgeDetail:actions.saveAsImageHint")}
            />
            <Text variant="caption" style={styles.exportCaption}>
              {t("badgeDetail:exportCaption")}
            </Text>
          </View>
        </Card>

        <Button
          label={t("badgeDetail:actions.delete")}
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
        style={[styles.previewOverlay, { top: 0 }]}
        pointerEvents="none"
        onLayout={(e) => {
          const next = e.nativeEvent.layout.height;
          setPreviewHeight((prev) => (prev === next ? prev : next));
        }}
      >
        <View style={styles.previewContainer}>
          {design ? (
            <View collapsable={false} style={styles.badgeCanvas}>
              <BadgeRenderer
                ref={badgeRendererRef}
                design={design}
                size={160}
              />
            </View>
          ) : hasRealImage ? (
            <Image
              source={{ uri: imageUri }}
              style={styles.badgeImage}
              resizeMode="contain"
              accessibilityLabel={t("badgeDetail:image.a11y", {
                title: goalTitle,
              })}
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
