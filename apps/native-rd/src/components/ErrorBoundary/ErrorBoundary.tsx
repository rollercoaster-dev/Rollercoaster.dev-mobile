import React, { Component, type ReactNode } from "react";
import { ScrollView, View } from "react-native";
import { Text } from "../Text";
import { Button } from "../Button";
import { reportError } from "../../services/sentry-report";
import { i18n } from "../../i18n";
import { styles } from "./ErrorBoundary.styles";

/**
 * Where the boundary sits, which decides how the default fallback lays out:
 * - `screen` (default): fills its parent, transparent — the screen behind it
 *   already paints the background.
 * - `root`: the last-resort boundary above every provider. Paints its own
 *   background because nothing behind it does. The fallback reads only the
 *   Unistyles runtime (configured at module load in `unistyles.ts`, not by a
 *   React provider) and the `i18n` singleton (initialised in `index.ts`), so
 *   it still renders when `ThemeProvider`, Evolu or navigation is what threw.
 * - `compact`: sized to its content, for chrome slots such as the tab bar
 *   where a full-height card would push the screen content away.
 */
export type ErrorBoundaryVariant = "screen" | "root" | "compact";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
  variant?: ErrorBoundaryVariant;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    reportError(error, { area: "render" });
    console.error("ErrorBoundary caught:", error);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    const { hasError, error } = this.state;
    const { children, fallback, variant = "screen" } = this.props;

    if (hasError && error) {
      if (fallback) {
        return fallback(error, this.handleReset);
      }

      const card = (
        <View style={styles.card}>
          <Text variant="title" style={styles.title}>
            {i18n.t("common:errorBoundary.title")}
          </Text>
          <Text variant="body" style={styles.message}>
            {i18n.t("common:errorBoundary.message")}
          </Text>
          <View style={styles.action}>
            <Button
              label={i18n.t("common:errorBoundary.retry")}
              onPress={this.handleReset}
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
          style={
            variant === "compact" ? styles.compactContainer : styles.container
          }
        >
          {card}
        </View>
      );
    }

    return children;
  }
}
