/**
 * Pure scrubbing functions for the Sentry privacy posture (#971).
 *
 * Lives in its own file so unit tests can import these without pulling the
 * Sentry SDK at runtime (the SDK ships ESM that Jest's default config can't
 * load). This file only uses `import type`, which Babel erases.
 *
 * What we do here:
 * - `scrubEvent`: remove user identity, request metadata, and arbitrary extras
 * - `scrubEvent`: redact `/Users/<name>/` paths from exception MESSAGE text
 *   (the SDK's default `createReactNativeRewriteFrames` already rewrites
 *   stack-frame filenames more aggressively, to `app:///main.jsbundle`)
 * - `scrubEvent`: reduce request URLs to host-only
 * - `scrubEvent`: re-scrub final event breadcrumbs because native/device
 *   breadcrumbs can be merged after `beforeBreadcrumb`
 * - `beforeBreadcrumbFilter`: drop console / AsyncStorage / SecureStore
 *   breadcrumbs, strip nav `data`, reduce xhr/fetch URLs to host-only
 *
 * What the SDK already does for us (don't duplicate):
 * - Stack-frame filename rewriting (RewriteFrames default integration)
 * - IP suppression (`sendDefaultPii: false` sets `infer_ip: 'never'`)
 * - Offline-noise drop — done via `ignoreErrors` in `Sentry.init`, not here
 *
 * Verified end-to-end via docs/launch/privacy-verification.md.
 */
import type { ErrorEvent, Breadcrumb } from "@sentry/react-native";

// `/Users/joe/code/...` — leaks if a Mac path makes it into an exception
// message string. Stack-frame filenames are handled separately by the SDK.
const LOCAL_PATH_PATTERN = /\/Users\/[^/\s)]+/g;

const REDACTED_PATH = "/<redacted>";

function toHostOnly(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return url;
  }
}

export function scrubEvent(event: ErrorEvent): ErrorEvent {
  delete event.user;
  delete event.extra;

  if (event.exception?.values) {
    for (const exc of event.exception.values) {
      if (exc.value) {
        exc.value = exc.value.replace(LOCAL_PATH_PATTERN, REDACTED_PATH);
      }
    }
  }

  if (event.request?.url) {
    event.request.url = toHostOnly(event.request.url);
  }
  if (event.request) {
    delete event.request.headers;
    delete event.request.cookies;
    delete event.request.data;
    delete event.request.query_string;
  }

  if (event.breadcrumbs) {
    event.breadcrumbs = event.breadcrumbs.flatMap((breadcrumb) => {
      const filtered = beforeBreadcrumbFilter(breadcrumb);
      return filtered ? [filtered] : [];
    });
  }

  return event;
}

export function beforeBreadcrumbFilter(
  breadcrumb: Breadcrumb,
): Breadcrumb | null {
  // `enableLogs: false` only disables Sentry's structured Logs product, not
  // the console *breadcrumbs* captured by the default breadcrumbsIntegration.
  // Drop them explicitly.
  if (breadcrumb.category === "console") return null;

  // Storage I/O breadcrumbs aren't emitted by current default integrations on
  // RN, but if a future integration adds them we'd want them dropped — keys
  // (and sometimes values) leak. Cheap defence.
  if (
    breadcrumb.category === "AsyncStorage" ||
    breadcrumb.category === "secureStore" ||
    breadcrumb.category === "expo-secure-store"
  ) {
    return null;
  }

  // Strip navigation breadcrumb data wholesale — the params object frequently
  // carries user content (goal titles, evidence IDs). Better to drop than guess
  // which keys are safe.
  if (breadcrumb.category === "navigation" && breadcrumb.data) {
    return { ...breadcrumb, data: undefined };
  }

  // Reduce fetch/xhr URLs to host-only. The default breadcrumbs integration
  // captures xhr URLs with query params even when `sendDefaultPii: false`.
  if (
    (breadcrumb.category === "fetch" ||
      breadcrumb.category === "xhr" ||
      breadcrumb.type === "http") &&
    breadcrumb.data &&
    typeof breadcrumb.data.url === "string"
  ) {
    return {
      ...breadcrumb,
      data: { ...breadcrumb.data, url: toHostOnly(breadcrumb.data.url) },
    };
  }

  return breadcrumb;
}
