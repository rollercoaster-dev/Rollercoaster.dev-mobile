import React, { Suspense, useMemo, useState } from "react";
import {
  View,
  ScrollView,
  Modal,
  Pressable,
  ActivityIndicator,
  Alert,
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
import { ConfirmDeleteModal } from "../../components/ConfirmDeleteModal";
import { badgeWithGoalQuery, deleteBadge } from "../../db";
import type { BadgeId } from "../../db";
import { PLACEHOLDER_IMAGE_URI } from "../../hooks/useCreateBadge";
import { useBadgeExport } from "../../hooks/useBadgeExport";
import { useAnimationPref } from "../../hooks/useAnimationPref";
import { parseBadgeDesign } from "../../badges/types";
import { EVIDENCE_TYPE_ICONS } from "../../constants/evidenceIcons";
import type { EvidenceTypeValue } from "../../types/evidence";
import { formatDate } from "../../utils/format";
import { reportError } from "../../services/sentry-report";
import { runEvoluMutation } from "../../utils/evoluMutation";
import { Logger } from "../../shims/rd-logger";
import type {
  BadgeDetailScreenProps,
  BadgesStackParamList,
  RootTabParamList,
} from "../../navigation/types";
import { CelebrationHeroHeader } from "./CelebrationHeroHeader";
import { BadgeOverflowMenu } from "./BadgeOverflowMenu";
import { styles } from "./BadgeDetailScreen.styles";

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
 * Minimal header for the states that have no badge data to feed the hero:
 * the Suspense fallback and the badge-not-found case. The celebration hero
 * owns the back affordance everywhere else, so this exists only to keep a
 * way out of the screen while data is loading or missing.
 */
function DetailFallbackHeader({ onBack }: { onBack: () => void }) {
  const { t } = useTranslation(["badgeDetail"]);
  return (
    <HeaderBand>
      <IconButton
        icon={<ArrowLeft size={24} weight="bold" />}
        onPress={onBack}
        tone="chrome"
        accessibilityLabel={t("badgeDetail:fallback.goBack")}
      />
    </HeaderBand>
  );
}

function BadgeDetailContent({ badgeId }: { badgeId: string }) {
  const navigation =
    useNavigation<NativeStackNavigationProp<BadgesStackParamList>>();
  const { t, i18n } = useTranslation(["badgeDetail", "common"]);
  const query = useMemo(
    () => badgeWithGoalQuery(badgeId as BadgeId),
    [badgeId],
  );
  const rows = useQuery(query);
  const badge = rows[0] ?? null;

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showOverflowMenu, setShowOverflowMenu] = useState(false);
  const { shouldAnimate } = useAnimationPref();
  const {
    exportVerifiableBadge,
    exportImage,
    exportJSON,
    isExportingImage,
    isExportingJSON,
  } = useBadgeExport();

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
      // Seed Goals beneath TimelineJourney (see #325) so the Goals list stays
      // reachable via the Goals tab on a cold, never-opened GoalsTab.
      initial: false,
    });
  };

  const handleDelete = () => {
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = () => {
    // Dismiss the modal and navigate back ONLY after a successful soft-delete.
    // deleteBadge never throws on a DB write failure — it returns { ok: false }
    // — so the old catch was dead code and the unconditional close/goBack
    // dismissed the modal onto an unchanged screen even when nothing was
    // deleted. Gate both side effects on the Result.
    const ok = runEvoluMutation(
      () => deleteBadge(badgeId as BadgeId),
      (error) => {
        logger.error("Failed to delete badge", { badgeId, error });
        reportError(error, { area: "badge.storage", kind: "delete" });
        Alert.alert(
          t("badgeDetail:deleteError.title"),
          t("badgeDetail:deleteError.message"),
        );
      },
    );
    if (ok) {
      setShowDeleteModal(false);
      navigation.goBack();
    }
  };

  if (!badge) {
    return (
      <>
        <DetailFallbackHeader onBack={() => navigation.goBack()} />
        <View style={styles.centered}>
          <Text variant="body">{t("badgeDetail:fallback.badgeNotFound")}</Text>
        </View>
      </>
    );
  }

  const imageUri = badge.imageUri as string | null;
  const hasRealImage = Boolean(imageUri && imageUri !== PLACEHOLDER_IMAGE_URI);
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
  // The chip asserts verifiability, so it is gated on an actual stored
  // credential — never on the badge merely existing. Undated credentials get
  // the bare "Verifiable" label rather than an "earned " with nothing after it.
  const isVerified = Boolean(badge.credential);
  const credentialLabel = isVerified
    ? earnedDate
      ? t("badgeDetail:hero.credentialLabel", { date: earnedDate })
      : t("badgeDetail:hero.credentialLabelUndated")
    : null;

  const closeOverflowMenu = () => setShowOverflowMenu(false);

  return (
    <>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <CelebrationHeroHeader
          badgeDesign={design}
          badgeTitle={goalTitle}
          credentialLabel={credentialLabel}
          isVerified={isVerified}
          showConfetti={shouldAnimate}
          onBack={() => navigation.goBack()}
          onOverflow={() => setShowOverflowMenu(true)}
          backAccessibilityLabel={t("badgeDetail:fallback.goBack")}
          overflowAccessibilityLabel={t("badgeDetail:hero.overflowLabel")}
        />

        <View style={styles.body}>
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
              {goalIcon ? (
                <Text style={styles.chipIcon}>{goalIcon}</Text>
              ) : null}
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
                        const icon = ev.type
                          ? EVIDENCE_TYPE_ICONS[ev.type]
                          : "•";
                        const typeLabel = ev.type
                          ? t(`common:evidenceTypes.${ev.type}.label`)
                          : null;
                        // For unknown/missing genres, still announce *some* type
                        // context so the row doesn't read as a bare proper noun.
                        const a11yTypeLabel =
                          typeLabel ??
                          t("badgeDetail:evidenceList.fallbackType");
                        const a11yLabel = t(
                          "badgeDetail:evidenceList.itemA11y",
                          {
                            name: ev.name,
                            type: a11yTypeLabel,
                          },
                        );
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
                onPress={() => exportVerifiableBadge(imageUri, goalTitle)}
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
        </View>
      </ScrollView>

      {/* Positioning is the consumer's job (BadgeOverflowMenu ships content
          only). A transparent Modal — the same overlay primitive
          ConfirmDeleteModal uses — with a fixed top-right offset that
          approximates the prototype's popover under the ⋯ button. Measuring
          the real button position was considered and rejected as not worth
          the plumbing at this size. */}
      <Modal
        visible={showOverflowMenu}
        transparent
        animationType="fade"
        onRequestClose={closeOverflowMenu}
      >
        <Pressable
          style={styles.overflowBackdrop}
          onPress={closeOverflowMenu}
          accessibilityRole="button"
          accessibilityLabel={t("badgeDetail:hero.overflowDismiss")}
          testID="overflow-backdrop"
        />
        <View style={styles.overflowPopover}>
          <BadgeOverflowMenu
            hasCredential={Boolean(badge.credential)}
            shareBadgeLabel={t("badgeDetail:share.overflow.shareBadge")}
            exportCredentialLabel={t(
              "badgeDetail:share.overflow.exportCredential",
            )}
            deleteBadgeLabel={t("badgeDetail:share.overflow.deleteBadge")}
            // TODO(#469): replace with BadgeShareSheet once slice 2/2 lands.
            onShareBadge={() => {
              closeOverflowMenu();
              exportVerifiableBadge(imageUri, goalTitle);
            }}
            onExportCredential={() => {
              closeOverflowMenu();
              exportJSON(badge.credential as string | null, goalTitle);
            }}
            onDelete={() => {
              closeOverflowMenu();
              handleDelete();
            }}
          />
        </View>
      </Modal>

      <ConfirmDeleteModal
        visible={showDeleteModal}
        onCancel={() => setShowDeleteModal(false)}
        onConfirm={handleConfirmDelete}
        title={t("badgeDetail:deleteConfirm.title")}
        message={t("badgeDetail:deleteConfirm.message")}
        confirmLabel={t("badgeDetail:deleteConfirm.delete")}
        cancelLabel={t("badgeDetail:deleteConfirm.cancel")}
      />
    </>
  );
}

export function BadgeDetailScreen({ route }: BadgeDetailScreenProps) {
  const navigation = useNavigation();
  const { badgeId } = route.params;

  return (
    <View style={styles.screen}>
      <ErrorBoundary>
        <Suspense
          fallback={
            <>
              {/* A back affordance stays mounted during data load so the user
                  isn't trapped on a spinner; once content resolves the
                  celebration hero supplies its own. */}
              <DetailFallbackHeader onBack={() => navigation.goBack()} />
              <ActivityIndicator style={styles.loadingIndicator} size="large" />
            </>
          }
        >
          <BadgeDetailContent badgeId={badgeId} />
        </Suspense>
      </ErrorBoundary>
    </View>
  );
}
