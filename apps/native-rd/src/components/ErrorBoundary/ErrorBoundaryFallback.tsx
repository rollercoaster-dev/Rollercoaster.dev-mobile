import React, { useEffect, useRef } from "react";
import { ScrollView, View, type Text as RNText } from "react-native";
import { Text } from "../Text";
import { Button } from "../Button";
import { i18n } from "../../i18n";
import { focusAccessibilityRef } from "../../utils/accessibilityFocus";
import { styles } from "./ErrorBoundary.styles";
import type { ErrorBoundaryVariant } from "./ErrorBoundary";

interface ErrorBoundaryFallbackProps {
  variant: ErrorBoundaryVariant;
  onRetry: () => void;
}

/**
 * The default fallback the boundary shows in place of a subtree that threw.
 *
 * On mount it moves VoiceOver/TalkBack focus to the title. `role="alert"`
 * alone isn't enough: VoiceOver doesn't reliably move to a newly rendered
 * alert, so a screen-reader user could keep swiping through a screen that
 * no longer exists. Focus goes to the title rather than the container
 * because the container can't be a single accessibility element without
 * hiding Try Again from the reader. Moving focus reads the title, so there
 * is no separate announcement (it would read the same words twice).
 */
export function ErrorBoundaryFallback({
  variant,
  onRetry,
}: ErrorBoundaryFallbackProps) {
  const titleRef = useRef<RNText>(null);

  useEffect(() => focusAccessibilityRef(titleRef), []);

  const card = (
    <View style={styles.card}>
      <Text
        ref={titleRef}
        variant="title"
        style={styles.title}
        testID={`error-boundary-title-${variant}`}
      >
        {i18n.t("common:errorBoundary.title")}
      </Text>
      <Text variant="body" style={styles.message}>
        {i18n.t("common:errorBoundary.message")}
      </Text>
      <View style={styles.action}>
        <Button
          label={i18n.t("common:errorBoundary.retry")}
          onPress={onRetry}
          variant="secondary"
        />
      </View>
    </View>
  );

  const a11y = {
    testID: `error-boundary-fallback-${variant}`,
    accessibilityRole: "alert" as const,
    accessibilityLabel: i18n.t("common:errorBoundary.a11yAlert"),
  };

  // The root fallback owns the whole screen, so it scrolls: at large type
  // the card can outgrow the viewport and Retry must stay reachable.
  if (variant === "root") {
    return (
      <ScrollView
        {...a11y}
        style={styles.rootContainer}
        contentContainerStyle={styles.rootContent}
      >
        {card}
      </ScrollView>
    );
  }

  return (
    <View
      {...a11y}
      style={variant === "compact" ? styles.compactContainer : styles.container}
    >
      {card}
    </View>
  );
}
