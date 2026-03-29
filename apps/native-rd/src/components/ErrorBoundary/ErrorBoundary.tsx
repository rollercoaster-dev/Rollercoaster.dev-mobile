import React, { Component, type ReactNode } from "react";
import { View } from "react-native";
import { Text } from "../Text";
import { Button } from "../Button";
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

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Future: send to error tracking service
    console.error("ErrorBoundary caught:", error, info.componentStack);
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
          accessibilityLabel="Error: something went wrong"
        >
          <View style={styles.card}>
            <Text variant="title" style={styles.title}>
              Something went wrong
            </Text>
            <Text variant="body" style={styles.message}>
              {error.message || "An unexpected error occurred."}
            </Text>
            <View style={styles.action}>
              <Button
                label="Try Again"
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
