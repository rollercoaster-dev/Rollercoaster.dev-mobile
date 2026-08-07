import React, { Suspense } from "react";
import { View, ActivityIndicator } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { useTabScreenContentInset } from "../../navigation/useTabScreenContentInset";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery } from "@evolu/react";
import { ErrorBoundary } from "../../components/ErrorBoundary";
import { ScreenHeader } from "../../components/ScreenHeader";
import { parseBadgeDesign } from "../../badges/types";
import { badgesWithGoalsQuery } from "../../db";
import type {
  BadgesStackParamList,
  RootTabParamList,
} from "../../navigation/types";
import { useTopInsetColor } from "../../navigation/TopInsetColor";
import { BadgesWall } from "./BadgesWall";
import type { BadgesWallGalleryItem, BadgesWallSpotlight } from "./BadgesWall";
import { WALL_SURFACE } from "./BadgesWall.styles";
import { styles } from "./BadgesScreen.styles";

type BadgeRow = typeof badgesWithGoalsQuery.Row;
type Nav = NativeStackNavigationProp<BadgesStackParamList>;

/**
 * Thin container for the Badges tab (#405): query → props → {@link BadgesWall}.
 * No layout or visuals of its own beyond the empty-state ScreenHeader — the
 * populated wall is full-bleed and owns its count header.
 */
function BadgesWallContainer({
  contentInset,
}: {
  contentInset: { paddingBottom: number };
}) {
  const navigation = useNavigation<Nav>();
  const rows = useQuery(badgesWithGoalsQuery);
  const { t } = useTranslation(["badges"]);

  const titleOf = (row: BadgeRow) =>
    (row.goalTitle as string | null) ?? t("badges:card.untitledFallback");

  const count = rows.length;
  const spotlightRow = rows[0] ?? null;
  const spotlight: BadgesWallSpotlight | null = spotlightRow
    ? {
        id: spotlightRow.id,
        design: parseBadgeDesign(spotlightRow.design as string | null),
        goalTitle: titleOf(spotlightRow),
        // Raw ISO string — BadgesWall formats it with the active locale.
        earnedAt: (spotlightRow.completedAt ?? spotlightRow.createdAt) as
          | string
          | null,
      }
    : null;
  const gallery: BadgesWallGalleryItem[] = rows.slice(1).map((row) => ({
    id: row.id,
    title: titleOf(row),
    design: parseBadgeDesign(row.design as string | null),
  }));

  // Populated, the wall is full-bleed with no ScreenHeader — so it also takes
  // over the device top-inset strip, which App.tsx otherwise paints in the
  // header color. Without this the dark surface sits under an orphaned purple
  // band. The empty branch keeps its ScreenHeader, so the strip stays default.
  useTopInsetColor(count > 0 ? WALL_SURFACE : null);

  const wall = (
    <BadgesWall
      count={count}
      spotlight={spotlight}
      gallery={gallery}
      contentInset={contentInset}
      onOpenBadge={(badgeId) => navigation.navigate("BadgeDetail", { badgeId })}
      onSeeGoals={() => {
        // Goals lives on a sibling tab, so the jump goes through the tab
        // navigator — the Badges stack has no "GoalsTab" route.
        const parent =
          navigation.getParent<NativeStackNavigationProp<RootTabParamList>>();
        parent?.navigate("GoalsTab", { screen: "Goals" });
      }}
    />
  );

  // Populated: the wall is full-bleed with its own count header — no purple
  // ScreenHeader above it. Empty: a plain "Badges" header frames the ghost card.
  if (count > 0) return wall;
  return (
    <>
      <ScreenHeader title={t("badges:header")} />
      {wall}
    </>
  );
}

export function BadgesScreen() {
  const tabInset = useTabScreenContentInset();

  return (
    <View style={styles.screen}>
      <ErrorBoundary>
        <Suspense
          fallback={
            <ActivityIndicator style={styles.loadingIndicator} size="large" />
          }
        >
          <BadgesWallContainer contentInset={tabInset} />
        </Suspense>
      </ErrorBoundary>
    </View>
  );
}
