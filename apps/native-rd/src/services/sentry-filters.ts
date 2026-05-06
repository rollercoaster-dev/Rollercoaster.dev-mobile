/**
 * Pure scrubbing functions for the Sentry privacy posture (#971).
 *
 * Lives in its own file so unit tests can import these without pulling the
 * Sentry SDK at runtime (the SDK ships ESM that Jest's default config can't
 * load). This file only uses `import type`, which Babel erases.
 *
 * What we do here:
 * - `scrubEvent`: remove user identity, request metadata, and arbitrary extras
 * - `scrubEvent`: redact email addresses and `/Users/<name>/` paths from
 *   exception MESSAGE text
 *   (the SDK's default `createReactNativeRewriteFrames` already rewrites
 *   stack-frame filenames more aggressively, to `app:///main.jsbundle`)
 * - `scrubEvent`: reduce request URLs to host-only
 * - `scrubEvent`: re-scrub final event breadcrumbs because native/device
 *   breadcrumbs can be merged after `beforeBreadcrumb`
 * - `beforeBreadcrumbFilter`: drop console / AsyncStorage / SecureStore
 *   breadcrumbs, strip nav `data`, rebuild xhr/fetch/http/request breadcrumb
 *   `data` from a small allow-list
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
const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;

const REDACTED_PATH = "/<redacted>";
const REDACTED_EMAIL = "[redacted-email]";

const HTTP_BREADCRUMB_CATEGORIES = new Set(["fetch", "xhr", "http", "request"]);
const SAFE_HTTP_METHODS = new Set([
  "DELETE",
  "GET",
  "HEAD",
  "OPTIONS",
  "PATCH",
  "POST",
  "PUT",
]);

function toHostOnly(url: string): string {
  return toHostOnlyOrUndefined(url) ?? url;
}

function toHostOnlyOrUndefined(url: string): string | undefined {
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return undefined;
  }
}

function scrubExceptionValue(value: string): string {
  return value
    .replace(EMAIL_PATTERN, REDACTED_EMAIL)
    .replace(LOCAL_PATH_PATTERN, REDACTED_PATH);
}

function isHttpBreadcrumb(breadcrumb: Breadcrumb): boolean {
  return (
    breadcrumb.type === "http" ||
    (breadcrumb.category !== undefined &&
      HTTP_BREADCRUMB_CATEGORIES.has(breadcrumb.category))
  );
}

function scrubHttpBreadcrumbData(
  data: Breadcrumb["data"],
): Breadcrumb["data"] | undefined {
  if (!data) return undefined;

  const scrubbed: Record<string, string | number> = {};

  if (typeof data.url === "string") {
    const hostOnlyUrl = toHostOnlyOrUndefined(data.url);
    if (hostOnlyUrl) {
      scrubbed.url = hostOnlyUrl;
    }
  }

  if (typeof data.method === "string") {
    const method = data.method.toUpperCase();
    if (SAFE_HTTP_METHODS.has(method)) {
      scrubbed.method = method;
    }
  }

  if (
    typeof data.status_code === "number" &&
    Number.isInteger(data.status_code)
  ) {
    scrubbed.status_code = data.status_code;
  }

  return Object.keys(scrubbed).length > 0 ? scrubbed : undefined;
}

export function scrubEvent(event: ErrorEvent): ErrorEvent {
  delete event.user;
  delete event.extra;

  if (event.exception?.values) {
    for (const exc of event.exception.values) {
      if (exc.value) {
        exc.value = scrubExceptionValue(exc.value);
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

  // Touch breadcrumbs can disclose screen interaction patterns. We disable
  // rage taps in `index.ts`, but drop these categories here too because
  // native/device breadcrumbs may still be merged onto final events.
  if (
    breadcrumb.category === "touch" ||
    breadcrumb.category === "ui.multiClick"
  ) {
    return null;
  }

  // Rebuild HTTP-like breadcrumb data from a tiny allow-list. This drops
  // headers, cookies, body/data payloads, query strings, and arbitrary SDK or
  // integration fields. Message is also removed because it can duplicate URLs.
  if (isHttpBreadcrumb(breadcrumb)) {
    return {
      ...breadcrumb,
      message: undefined,
      data: scrubHttpBreadcrumbData(breadcrumb.data),
    };
  }

  return breadcrumb;
}
