import React, { Suspense, useMemo, useRef, useState } from "react";
import {
  View,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery } from "@evolu/react";
import { useUnistyles } from "react-native-unistyles";
import { Text } from "../../components/Text";
import { IconButton } from "../../components/IconButton";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { ErrorBoundary } from "../../components/ErrorBoundary";
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

function BadgeDetailContent({ badgeId }: { badgeId: string }) {
  const navigation =
    useNavigation<NativeStackNavigationProp<BadgesStackParamList>>();
  const query = useMemo(
    () => badgeWithGoalQuery(badgeId as BadgeId),
    [badgeId],
  );
  const rows = useQuery(query);
  const badge = rows[0] ?? null;

  const [imageLoadFailed, setImageLoadFailed] = useState(false);
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
      <View style={styles.centered}>
        <Text variant="body">Badge not found</Text>
      </View>
    );
  }

  const imageUri = badge.imageUri as string | null;
  const hasRealImage =
    imageUri && imageUri !== PLACEHOLDER_IMAGE_URI && !imageLoadFailed;
  const goalTitle = (badge.goalTitle as string) ?? "Untitled";
  const earnedDate = formatDate(
    (badge.completedAt ?? badge.createdAt) as string | null,
  );
  const design = parseBadgeDesign(badge.design as string | null);

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      {design ? (
        <View ref={badgeRendererRef} collapsable={false}>
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

      <Text style={styles.title}>{goalTitle}</Text>
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
          <Text style={styles.sectionLabel}>Details</Text>
          <Text style={styles.criteriaText}>
            Created {formatDate(badge.createdAt as string | null)}
          </Text>
        </View>
      </Card>

      <Card>
        <View style={styles.infoSection}>
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
  );
}

export function BadgeDetailScreen({ route }: BadgeDetailScreenProps) {
  const navigation = useNavigation();
  const { badgeId } = route.params;
  const { theme } = useUnistyles();

  return (
    <SafeAreaView
      edges={["top"]}
      style={{ flex: 1, backgroundColor: theme.colors.background }}
    >
      <View style={styles.topBar}>
        <IconButton
          icon={<Text variant="headline">{"\u2190"}</Text>}
          onPress={() => navigation.goBack()}
          variant="ghost"
          accessibilityLabel="Go back"
        />
        <Text style={styles.topBarTitle}>Badge</Text>
        <View style={styles.spacer} />
      </View>

      <View style={{ flex: 1 }}>
        <ErrorBoundary>
          <Suspense
            fallback={
              <ActivityIndicator style={styles.loadingIndicator} size="large" />
            }
          >
            <BadgeDetailContent badgeId={badgeId} />
          </Suspense>
        </ErrorBoundary>
      </View>
    </SafeAreaView>
  );
}
