import React, { Component, type ErrorInfo, type ReactNode } from "react";
import { reportRenderError } from "../../services/sentry-report";
import { ErrorBoundaryFallback } from "./ErrorBoundaryFallback";

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

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Dev only: in production the Sentry report below already carries it.
    if (__DEV__) console.error("ErrorBoundary caught:", error);
    reportRenderError(error, errorInfo.componentStack);
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

      return (
        <ErrorBoundaryFallback variant={variant} onRetry={this.handleReset} />
      );
    }

    return children;
  }
}
