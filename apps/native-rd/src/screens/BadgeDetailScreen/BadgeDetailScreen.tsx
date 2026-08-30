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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useUnistyles } from "react-native-unistyles";
import { useQuery } from "@evolu/react";
import { useTranslation } from "react-i18next";
import { ArrowLeft } from "phosphor-react-native";
import { Text } from "../../components/Text";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { ErrorBoundary } from "../../components/ErrorBoundary";
import { IconButton } from "../../components/IconButton";
import { HeaderBand } from "../../components/ScreenHeader";
import { useTopInsetColor } from "../../navigation/TopInsetColor";
import { ConfirmDeleteModal } from "../../components/ConfirmDeleteModal";
import { badgeWithGoalQuery, deleteBadge } from "../../db";
import type { BadgeId } from "../../db";
import { PLACEHOLDER_IMAGE_URI } from "../../hooks/useCreateBadge";
// Deep import, not the barrel: `badges/index` pulls in credentialBuilder ->
// openbadges-core, which is ESM and unloadable in this screen's Jest runtime.
import { parseStoredCredential } from "../../badges/vcJwt";
import { useBadgeExport } from "../../hooks/useBadgeExport";
import { useAnimationPref } from "../../hooks/useAnimationPref";
import { parseBadgeDesign } from "../../badges/types";
import { ProofSpine } from "../../components/ProofSpine";
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
import { BadgeShareSheet } from "./BadgeShareSheet";
import { styles } from "./BadgeDetailScreen.styles";

/**
 * Distance from the top of the hero band to the bottom of the ⋯ button, so the
 * overflow popover hangs just below its trigger: the band's `paddingTop`
 * (`space[3]` = 12) plus the IconButton's `md` size (44).
 *
 * It has to be added to `insets.top` at render time rather than baked into the
 * stylesheet: RN `Modal` mounts in its own root view measured from the physical
 * screen top, while the hero lives inside the `marginTop: insets.top` container
 * in `App.tsx`. A constant offset alone lands the menu over the nav row — and,
 * on notched devices, up inside the status bar.
 */
const OVERFLOW_POPOVER_TOP_OFFSET = 56;

/**
 * `credentialBuilder` bakes every evidence id into the credential as
 * `urn:ulid:<ulid>`, but EvidenceViewer resolves `initialEvidenceId` against
 * the **live** evidence rows, whose ids are the bare ULID. Passing the
 * prefixed id straight through would silently miss (`findIndex` → -1) and land
 * the viewer on the first item instead of the tapped one.
 */
const EVIDENCE_ID_PREFIX = "urn:ulid:";

const logger = new Logger("BadgeDetailScreen");

/**
 * Pulls the achievement criteria narrative out of a stored OB3
 * VerifiableCredential (the "how it was earned" text), in either stored
 * format. Defensive: any parse failure or shape mismatch returns null so the
 * UI just hides the section.
 */
function extractCriteriaNarrative(credential: string | null): string | null {
  if (!credential) return null;
  try {
    const parsed = parseStoredCredential(credential);
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
 * Shape fed to the proof spine's cards. `type` is null when
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
    const parsed = parseStoredCredential(credential);
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
  const [isShareSheetOpen, setIsShareSheetOpen] = useState(false);
  const { shouldAnimate } = useAnimationPref();
  const insets = useSafeAreaInsets();
  const { theme } = useUnistyles();
  // The celebration band is the first thing under the status bar, so the
  // device top-inset strip App.tsx paints has to be the band's surface — not
  // the purple header chrome, which belongs to screens that actually have a
  // ScreenHeader. Null while the badge is missing: that path renders
  // DetailFallbackHeader, which *is* a header band.
  useTopInsetColor(badge ? theme.chrome.celebrationBg : null);
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
  const earnedDate = formatDate(
    (badge.completedAt ?? badge.createdAt) as string | null,
    i18n.language,
  );
  const design = parseBadgeDesign(badge.design as string | null);
  const criteriaNarrative = extractCriteriaNarrative(
    badge.credential as string | null,
  );
  const evidenceItems = extractEvidenceItems(badge.credential as string | null);
  // The chip asserts verifiability, so it is gated on an actual stored
  // credential — never on the badge merely existing. Undated credentials get
  // the bare "Verifiable" label rather than an "earned " with nothing after it.
  const isVerified = Boolean(badge.credential);
  const credentialLabel = isVerified
    ? earnedDate
      ? t("badgeDetail:hero.credentialLabel", { date: earnedDate })
      : t("badgeDetail:hero.credentialLabelUndated")
    : null;

  // A proof card opens the evidence it stands for, in the same viewer the
  // timeline uses. Cross-tab hop via the root parent, exactly as
  // `handleViewTimeline` does — EvidenceViewer lives in the Goals stack.
  const handleEvidencePress = (evidenceId: string) => {
    if (!goalId) {
      // Soft-deleted goal: the viewer reads live evidence rows for a goal that
      // no longer surfaces, so there is nothing to land on. No-op and log,
      // the same stance "View timeline" takes when its destination is gone.
      logger.warn("Proof card tapped for a badge whose goal is deleted", {
        badgeId,
        evidenceId,
      });
      return;
    }
    const parent = navigation.getParent<NavigationProp<RootTabParamList>>();
    if (!parent) {
      logger.warn("Proof card tapped without a tab navigator parent", {
        badgeId,
        goalId,
      });
      return;
    }
    parent.navigate("GoalsTab", {
      screen: "EvidenceViewer",
      params: {
        goalId,
        initialEvidenceId: evidenceId.startsWith(EVIDENCE_ID_PREFIX)
          ? evidenceId.slice(EVIDENCE_ID_PREFIX.length)
          : evidenceId,
      },
      // Same cold-tab seeding as the timeline hop (#325).
      initial: false,
    });
  };

  const closeOverflowMenu = () => setShowOverflowMenu(false);

  return (
    <>
      {/* Pinned, not scrolled: the badge is the thing the screen is about, so
          it holds its position while the detail below it moves. Its back and ⋯
          controls double as the screen's chrome and must stay reachable. */}
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

      {/* flex:1 so the Share CTA below stays a pinned footer rather than being
          pushed off-screen by tall content. */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.body}>
          {/* The hero's chip already carries the earned date for credentialed
              badges, so this line only fills the gap when there is no chip. */}
          {!isVerified && earnedDate ? (
            <Text style={styles.description}>
              {t("badgeDetail:earned", { date: earnedDate })}
            </Text>
          ) : null}

          {/* The narrative is the badge's own "how it was earned" sentence and
              stands apart from the gallery below it: ProofSpine owns the
              evidence, this owns the story. Older badges carry only this. */}
          {criteriaNarrative ? (
            <View style={styles.infoBlock}>
              <Text style={styles.sectionLabel}>
                {t("badgeDetail:sections.howEarned")}
              </Text>
              <Text style={styles.bodyText}>{criteriaNarrative}</Text>
            </View>
          ) : null}

          {/* Fed from the baked credential, never live DB rows, so the spine
              keeps rendering after the goal/step is edited or soft-deleted —
              and matches what a third-party verifier would see. Mounted
              unconditionally: ProofSpine owns its own honest empty state. */}
          <ProofSpine
            evidence={evidenceItems ?? []}
            onCardPress={handleEvidencePress}
          />

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
              testID="badge-detail-view-timeline"
            />
          ) : null}
        </View>
      </ScrollView>

      {/* Single Share CTA + its export sheet, replacing the old stacked
          3-button Export card. Mounted as a root-level sibling of the
          ScrollView, not inside it: AnimatedSheet is an in-tree absolute
          overlay, so nesting it in scroll content would anchor the sheet to
          the content's bottom instead of the viewport's (same placement rule
          EditGoalView documents). */}
      <BadgeShareSheet
        goalTitle={goalTitle}
        isSheetOpen={isShareSheetOpen}
        onOpenSheet={() => setIsShareSheetOpen(true)}
        onCloseSheet={() => setIsShareSheetOpen(false)}
        onShareVerifiable={() => exportVerifiableBadge(imageUri, goalTitle)}
        onSaveImage={() => exportImage(imageUri)}
        onExportCredential={() =>
          exportJSON(badge.credential as string | null, goalTitle)
        }
        // A real baked image implies a real credential (both are written in the
        // same createBadge call), so this one flag correctly gates the
        // verifiable row too.
        canShareImage={hasRealImage}
        hasCredential={Boolean(badge.credential)}
        isExportingImage={isExportingImage}
        isExportingJSON={isExportingJSON}
        ctaStyle={styles.shareCta}
        ctaLabel={t("badgeDetail:share.cta")}
        // Passed as a template, not interpolated: BadgeShareSheet does the
        // {{goalTitle}} substitution itself (literal split/join, so a title
        // containing `$` patterns can't corrupt the header).
        sheetTitleTemplate={t("badgeDetail:share.sheetTitle")}
        sheetSubtitle={t("badgeDetail:share.sheetSubtitle")}
        closeLabel={t("common:actions.close")}
        recommendedLabel={t("badgeDetail:share.recommended")}
        verifiableLabel={t("badgeDetail:share.verifiable.label")}
        verifiableDetail={t("badgeDetail:share.verifiable.detail")}
        saveImageLabel={t("badgeDetail:share.saveImage.label")}
        saveImageDetail={t("badgeDetail:share.saveImage.detail")}
        exportCredentialLabel={t("badgeDetail:share.exportCredential.label")}
        exportCredentialDetail={t("badgeDetail:share.exportCredential.detail")}
      />

      {/* Positioning is the consumer's job (BadgeOverflowMenu ships content
          only). A transparent Modal — the same overlay primitive
          ConfirmDeleteModal uses — anchored under the ⋯ button by deriving the
          offset from the hero's known geometry rather than measuring the real
          button, which isn't worth the plumbing at this size. */}
      <Modal
        visible={showOverflowMenu}
        transparent
        animationType="fade"
        onRequestClose={closeOverflowMenu}
        accessibilityViewIsModal
      >
        <Pressable
          style={styles.overflowBackdrop}
          onPress={closeOverflowMenu}
          accessibilityRole="button"
          accessibilityLabel={t("badgeDetail:hero.overflowDismiss")}
          testID="overflow-backdrop"
        />
        <View
          style={[
            styles.overflowPopover,
            { top: insets.top + OVERFLOW_POPOVER_TOP_OFFSET },
          ]}
        >
          <BadgeOverflowMenu
            hasCredential={Boolean(badge.credential)}
            shareBadgeLabel={t("badgeDetail:share.overflow.shareBadge")}
            exportCredentialLabel={t(
              "badgeDetail:share.overflow.exportCredential",
            )}
            deleteBadgeLabel={t("badgeDetail:share.overflow.deleteBadge")}
            // Both share entry points land in the same sheet, so the overflow
            // row can't quietly become a second, differently-behaving export.
            onShareBadge={() => {
              closeOverflowMenu();
              setIsShareSheetOpen(true);
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
