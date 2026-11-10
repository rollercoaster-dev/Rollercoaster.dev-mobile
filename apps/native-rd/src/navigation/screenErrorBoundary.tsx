import React, { type ReactNode } from "react";
import { ErrorBoundary } from "../components/ErrorBoundary";

/**
 * `screenLayout` for every navigator in the app: wraps each routed screen in
 * the shared `ErrorBoundary`, so a render throw anywhere in a screen shows the
 * translated Retry card and reports to Sentry (`area: "render"`) instead of
 * crashing the JS runtime.
 *
 * Applied at the navigator rather than inside each screen so a newly
 * registered route is covered without anyone remembering to add it. React
 * Navigation renders the layout inside the route's own `NavigationProvider`
 * (@react-navigation/core `useDescriptors.tsx`, `render()`), so
 * `usePreventRemove` / `beforeRemove` guards in the screen keep working. Jest
 * mocks the navigators, so that guarantee is checked on device, not here.
 * Screens that already wrap their content in an inner `ErrorBoundary` (with a
 * Suspense fallback sized for that screen) keep it — the inner one catches
 * first; this one is the net for everything outside it.
 */
export function screenErrorBoundaryLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <ErrorBoundary>{children}</ErrorBoundary>;
}
