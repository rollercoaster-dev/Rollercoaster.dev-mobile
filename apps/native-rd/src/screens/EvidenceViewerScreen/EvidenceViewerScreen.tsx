import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { AccessibilityInfo, ActivityIndicator, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { ScreenSubHeader } from "../../components/ScreenHeader";
import { ErrorBoundary } from "../../components/ErrorBoundary";
import { Text } from "../../components/Text";
import { EvidenceContent } from "../../components/EvidenceContent";
import { ViewerThumbnailStrip } from "../../components/ViewerThumbnailStrip";
import { useAllEvidenceForGoal } from "../../hooks/useAllEvidenceForGoal";
import type { GoalId } from "../../db";
import type { EvidenceViewerScreenProps } from "../../navigation/types";
import { styles } from "./EvidenceViewerScreen.styles";

// Hardcoded; useBottomTabBarHeight requires extra Jest ESM transform config.
const TAB_BAR_HEIGHT = 12;

function ViewerContent({
  goalId,
  initialEvidenceId,
}: {
  goalId: string;
  initialEvidenceId: string;
}) {
  const evidence = useAllEvidenceForGoal(goalId as GoalId);

  const initialIndex = useMemo(() => {
    const idx = evidence.findIndex((e) => e.id === initialEvidenceId);
    return idx >= 0 ? idx : 0;
  }, [evidence, initialEvidenceId]);

  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const previousLength = useRef(evidence.length);

  // Clamp + announce when evidence is deleted while viewing. Without the
  // announcement the user is silently shifted to a different item.
  useEffect(() => {
    const prev = previousLength.current;
    previousLength.current = evidence.length;
    if (
      evidence.length < prev &&
      activeIndex >= evidence.length &&
      evidence.length > 0
    ) {
      setActiveIndex(evidence.length - 1);
      AccessibilityInfo.announceForAccessibility(
        "Evidence was removed. Showing the next available item.",
      );
    } else if (evidence.length < prev && evidence.length === 0) {
      AccessibilityInfo.announceForAccessibility("All evidence was removed.");
    } else if (activeIndex >= evidence.length && evidence.length > 0) {
      setActiveIndex(evidence.length - 1);
    }
  }, [evidence.length, activeIndex]);

  if (evidence.length === 0) {
    return (
      <View style={styles.centered}>
        <Text variant="body">No evidence to view.</Text>
      </View>
    );
  }

  const active = evidence[activeIndex] ?? evidence[0];

  return (
    <View style={styles.container}>
      {evidence.length > 1 ? (
        <View style={styles.counterBar}>
          <Text style={styles.counter} accessibilityLiveRegion="polite">
            {activeIndex + 1} / {evidence.length}
          </Text>
        </View>
      ) : null}
      <View style={styles.body}>
        <EvidenceContent evidence={active} />
      </View>
      <ViewerThumbnailStrip
        evidence={evidence}
        activeIndex={activeIndex}
        onSelect={setActiveIndex}
      />
    </View>
  );
}

export function EvidenceViewerScreen({ route }: EvidenceViewerScreenProps) {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { goalId, initialEvidenceId } = route.params;

  return (
    <View
      style={[styles.screen, { paddingBottom: TAB_BAR_HEIGHT + insets.bottom }]}
    >
      <ScreenSubHeader label="Evidence" onBack={() => navigation.goBack()} />
      <ErrorBoundary>
        <Suspense
          fallback={
            <ActivityIndicator style={styles.loadingIndicator} size="large" />
          }
        >
          <ViewerContent
            goalId={goalId}
            initialEvidenceId={initialEvidenceId}
          />
        </Suspense>
      </ErrorBoundary>
    </View>
  );
}
