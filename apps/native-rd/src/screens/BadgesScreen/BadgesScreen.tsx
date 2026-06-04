import React, { Suspense } from "react";
import { View, FlatList, ActivityIndicator } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { useTabScreenContentInset } from "../../navigation/useTabScreenContentInset";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery } from "@evolu/react";
import { ErrorBoundary } from "../../components/ErrorBoundary";
import { ScreenHeader } from "../../components/ScreenHeader";
import { BadgeCard } from "../../components/BadgeCard";
import { EmptyState } from "../../components/EmptyState";
import { parseBadgeDesign } from "../../badges/types";
import { badgesWithGoalsQuery } from "../../db";
import { formatDate } from "../../utils/format";
import type {
  BadgesStackParamList,
  RootTabParamList,
} from "../../navigation/types";
import { styles } from "./BadgesScreen.styles";

type BadgeRow = typeof badgesWithGoalsQuery.Row;
type Nav = NativeStackNavigationProp<BadgesStackParamList>;

function BadgeList() {
  const navigation = useNavigation<Nav>();
  const tabInset = useTabScreenContentInset();
  const rows = useQuery(badgesWithGoalsQuery);
  const { t, i18n } = useTranslation("badges");

  if (rows.length === 0) {
    return (
      <EmptyState
        title={t("empty.title")}
        body={t("empty.body")}
        action={{
          label: t("empty.action"),
          onPress: () => {
            const parent =
              navigation.getParent<
                NativeStackNavigationProp<RootTabParamList>
              >();
            parent?.navigate("GoalsTab", { screen: "Goals" });
          },
        }}
      />
    );
  }

  return (
    <FlatList
      data={rows}
      keyExtractor={(item) => item.id}
      style={{ flex: 1 }}
      contentContainerStyle={[
        styles.scrollContent,
        styles.listContent,
        tabInset,
      ]}
      scrollIndicatorInsets={{ right: 1 }}
      renderItem={({ item }: { item: BadgeRow }) => (
        <BadgeCard
          title={(item.goalTitle as string) ?? t("card.untitledFallback")}
          description={(item.goalDescription as string | null) ?? undefined}
          earnedDate={formatDate(
            (item.completedAt ?? item.createdAt) as string | null,
            i18n.language,
          )}
          design={parseBadgeDesign(item.design as string | null)}
          onPress={() =>
            navigation.navigate("BadgeDetail", { badgeId: item.id })
          }
        />
      )}
    />
  );
}

export function BadgesScreen() {
  const { t } = useTranslation("badges");
  return (
    <View style={styles.screen}>
      <ScreenHeader title={t("header")} />
      <ErrorBoundary>
        <Suspense
          fallback={
            <ActivityIndicator style={styles.loadingIndicator} size="large" />
          }
        >
          <BadgeList />
        </Suspense>
      </ErrorBoundary>
    </View>
  );
}
