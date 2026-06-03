import React, { Component, type ReactNode } from "react";
import { View } from "react-native";
import { Text } from "../Text";
import { Button } from "../Button";
import { reportError } from "../../services/sentry-report";
import { i18n } from "../../i18n";
import { styles } from "./ErrorBoundary.styles";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
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
    const { children, fallback } = this.props;

    if (hasError && error) {
      if (fallback) {
        return fallback(error, this.handleReset);
      }

      return (
        <View
          style={styles.container}
          accessibilityRole="alert"
          accessibilityLabel={i18n.t("common:errorBoundary.a11yAlert")}
        >
          <View style={styles.card}>
            <Text variant="title" style={styles.title}>
              {i18n.t("common:errorBoundary.title")}
            </Text>
            <Text variant="body" style={styles.message}>
              {error.message || i18n.t("common:errorBoundary.message")}
            </Text>
            <View style={styles.action}>
              <Button
                label={i18n.t("common:errorBoundary.retry")}
                onPress={this.handleReset}
                variant="secondary"
              />
            </View>
          </View>
        </View>
      );
    }

    return children;
  }
}
