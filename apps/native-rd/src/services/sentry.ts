/**
 * Sentry crash reporting — privacy-safe init.
 *
 * Single audit surface for the Sentry privacy posture (#971). Scrubbing
 * filters live in `./sentry-filters` so unit tests can exercise them without
 * pulling the Sentry SDK at runtime.
 *
 * Verified against docs/launch/privacy-verification.md before any TestFlight push.
 *
 * Init is gated on `!__DEV__` so dev builds don't ship events. TestFlight + EAS
 * preview builds are not __DEV__, so Sentry runs there as expected.
 */
import * as Sentry from "@sentry/react-native";

import { beforeBreadcrumbFilter, scrubEvent } from "./sentry-filters";

const SENTRY_DSN =
  "https://a296e6e9847c9f61d5b1ddc94c3dd324@o4511332263460864.ingest.de.sentry.io/4511332271194192";

// Offline noise that doesn't help debugging and burns Sentry quota.
// Sentry's DEFAULT_IGNORE_ERRORS covers browser-specific noise (ResizeObserver,
// GTM, etc.); none of these patterns. Filtered via the canonical `ignoreErrors`
// option, which routes through the default `inboundFiltersIntegration`.
const OFFLINE_ERROR_PATTERNS: RegExp[] = [
  /network ?error/i,
  /abort\s?error/i,
  /network request failed/i,
];

export function initSentry(): void {
  if (__DEV__) return;

  // Set per-EAS-profile in eas.json's build.<profile>.env block. Expo only
  // inlines EXPO_PUBLIC_* into the JS bundle, so reading EAS_BUILD_PROFILE
  // directly would be undefined at runtime.
  const environment = process.env.EXPO_PUBLIC_SENTRY_ENVIRONMENT ?? "unknown";

  Sentry.init({
    dsn: SENTRY_DSN,
    environment,

    // Privacy posture (#971). `sendDefaultPii: false` also tells the relay
    // `infer_ip: 'never'`, so client IPs are never attached server-side.
    sendDefaultPii: false,
    tracesSampleRate: 0,
    tracePropagationTargets: [],
    enableAutoSessionTracking: false,
    enableAutoPerformanceTracing: false,
    enableAppStartTracking: false,
    enableNativeFramesTracking: false,
    enableStallTracking: false,
    enableUserInteractionTracing: false,
    enableCaptureFailedRequests: false,
    attachScreenshot: false,
    attachViewHierarchy: false,
    attachAllThreads: false,
    attachThreads: false,
    attachStacktrace: true,
    enableLogs: false,

    ignoreErrors: OFFLINE_ERROR_PATTERNS,

    // We don't add custom integrations. The SDK's default set runs as-is —
    // RewriteFrames, breadcrumbs, dedupe, native release, device context,
    // Expo context, etc. — which is what we want for crash capture. We
    // explicitly do NOT add `mobileReplayIntegration` (records UI),
    // `feedbackIntegration` (#972, deliberate later), or any auto-PII features.

    beforeSend: scrubEvent,
    beforeBreadcrumb: beforeBreadcrumbFilter,
  });
}

export const wrap: typeof Sentry.wrap = (RootComponent, options) => {
  if (__DEV__) return RootComponent;

  return Sentry.wrap(RootComponent, options);
};
