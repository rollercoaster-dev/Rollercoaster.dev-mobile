import React, { Suspense } from "react";
import { View, FlatList, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery } from "@evolu/react";
import { Text } from "../../components/Text";
import { ErrorBoundary } from "../../components/ErrorBoundary";
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
  const rows = useQuery(badgesWithGoalsQuery);

  if (rows.length === 0) {
    return (
      <EmptyState
        title="No badges yet"
        body="Complete goals to earn badges. Your collection will grow here."
        action={{
          label: "Go to Goals",
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
      contentContainerStyle={[styles.scrollContent, styles.listContent]}
      scrollIndicatorInsets={{ right: 1 }}
      renderItem={({ item }: { item: BadgeRow }) => (
        <BadgeCard
          title={(item.goalTitle as string) ?? "Untitled"}
          earnedDate={formatDate(
            (item.completedAt ?? item.createdAt) as string | null,
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
  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <View style={styles.header}>
        <Text variant="display" style={styles.headerTitle}>
          Badges
        </Text>
      </View>
      <View style={styles.container}>
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
    </SafeAreaView>
  );
}
