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
  /**
   * Inputs the guarded subtree renders from. When any of them changes while
   * the fallback is showing, the boundary resets on its own (the
   * react-error-boundary pattern). Compared by `Object.is`, index by index.
   */
  resetKeys?: readonly unknown[];
  /**
   * Runs before the boundary resets (Try Again, or a `resetKeys` change), so
   * the owner can clear whatever state made the subtree throw. Without a
   * changed input, a deterministic render error throws again on retry.
   */
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

function resetKeysChanged(
  prev: readonly unknown[] = [],
  next: readonly unknown[] = [],
): boolean {
  return (
    prev.length !== next.length ||
    prev.some((key, index) => !Object.is(key, next[index]))
  );
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

  componentDidUpdate(
    prevProps: ErrorBoundaryProps,
    prevState: ErrorBoundaryState,
  ) {
    // `prevState.hasError` skips the update that first caught the error: when
    // a key change is what made the subtree throw, resetting then would just
    // throw again.
    if (
      prevState.hasError &&
      this.state.hasError &&
      resetKeysChanged(prevProps.resetKeys, this.props.resetKeys)
    ) {
      this.handleReset();
    }
  }

  // The fallback replaces the children, so React has already unmounted the
  // subtree; clearing the error mounts it fresh. Local state cannot survive
  // into the retry, but props and app state above the boundary do, which is
  // why recovery needs `onReset` or a `resetKeys` change.
  handleReset = () => {
    this.props.onReset?.();
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
