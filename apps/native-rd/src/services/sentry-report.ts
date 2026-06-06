/**
 * Reporting surface for the Sentry privacy posture (#971).
 *
 * One named import boundary for caught errors that we choose to swallow but
 * still want to know about. The `area`/`kind` discriminated union is a
 * controlled vocabulary — there is intentionally no free-text parameter, no
 * `meta` bag, and no `setContext` call, because those are the foothold paths
 * that leak user content into Sentry events.
 *
 * The `__DEV__` gate in `./sentry.ts` means `Sentry.captureException` is a
 * no-op in dev builds, so this helper is fire-and-forget at every call site.
 *
 * Design notes:
 * - `setTag` writes to `event.tags`, which is keyed and value-typed (string).
 *   The closed enums below mean both key and value are pre-vetted.
 * - We do NOT write to `event.contexts` or `event.extra`. Even though
 *   `sentry-filters.ts` now strips non-allowlisted contexts and extras as a
 *   backstop, the API itself should not expose paths that need scrubbing.
 *
 * See `apps/native-rd/docs/launch/sentry-usage-concept.md` §3.1.
 */
import * as Sentry from "@sentry/react-native";

import type { EvidenceTypeValue } from "../types/evidence";

/**
 * Closed enum of (area, kind) pairs that may report to Sentry.
 *
 * Adding a new area or kind is a deliberate, reviewable diff. Free-text strings
 * are unrepresentable in this type, which is the privacy guarantee.
 */
export type ReportContext =
  | { area: "badge.create"; kind?: "build" | "sign" | "bake" | "store" }
  | { area: "badge.parse"; kind: "design-json" | "color-field" }
  | { area: "badge.storage"; kind?: "read" | "write" | "delete" }
  | { area: "key.generate" }
  | { area: "key.verify" }
  | { area: "evidence.capture"; kind: EvidenceTypeValue }
  | { area: "evidence.view"; kind?: EvidenceTypeValue }
  | { area: "evidence.cleanup" }
  | { area: "goal.mutate"; kind: "create" | "update" | "delete" | "complete" }
  | {
      area: "step.mutate";
      kind: "create" | "update" | "delete" | "reorder" | "toggle";
    }
  | {
      area: "focus.mode";
      kind?: "enter" | "exit" | "step-toggle" | "evidence-restore";
    }
  | { area: "completion.flow" }
  | { area: "audio.record"; kind?: "start" | "stop" | "permission" | "cleanup" }
  | { area: "audio.playback" }
  | { area: "navigation" }
  | { area: "db.write" }
  | { area: "render" };

// No-op in dev — `initSentry()` returns early before any client is installed,
// so callers can fire-and-forget without a `__DEV__` guard at every site.
export function reportError(error: unknown, ctx: ReportContext): void {
  Sentry.withScope((scope) => {
    scope.setTag("area", ctx.area);
    if ("kind" in ctx && ctx.kind) {
      scope.setTag("kind", ctx.kind);
    }
    Sentry.captureException(error);
  });
}

/**
 * Logger → Sentry bridge: explicit per-scope allowlist.
 *
 * The rd-logger JS shim invokes this for every `logger.error(...)` whose args
 * include an `Error` instance. Unknown scopes silently no-op — the inverse of
 * the usual default. To enable Sentry for a logger scope, add it here AFTER
 * auditing that the call sites' `Error.message` values are safe (the
 * `beforeSend` filter in `sentry-filters.ts` redacts emails and `/Users/<name>`
 * paths, but anything else in the message text is forwarded).
 *
 * Critical paths instrumented via direct `reportError(...)` calls (e.g.
 * useCreateBadge, useUserKey) deliberately do NOT appear here, to avoid
 * double-reporting the same error.
 */
const SCOPE_TO_AREA: Record<string, ReportContext> = {
  useFocusModePrefs: { area: "focus.mode" },
  evidenceCleanup: { area: "evidence.cleanup" },
  // db.queries spans 5 entity types; stack frame distinguishes which function.
  "db.queries": { area: "db.write" },
  // evidenceViewers omits kind — spans both link and file open paths.
  evidenceViewers: { area: "evidence.view" },
  VideoContent: { area: "evidence.view", kind: "video" },
  PhotoContent: { area: "evidence.view", kind: "photo" },
  LinkContent: { area: "evidence.view", kind: "link" },
  FileContent: { area: "evidence.view", kind: "file" },
};

// `map` parameter exists as a test seam — production callers always omit it.
// Adding scopes still requires editing SCOPE_TO_AREA above; no runtime
// registration API is exposed.
export function reportLoggerError(
  scope: string,
  err: Error,
  map: Record<string, ReportContext> = SCOPE_TO_AREA,
): void {
  const ctx = map[scope];
  if (!ctx) return;
  reportError(err, ctx);
}

/**
 * Closed-enum breadcrumb input.
 *
 * Same privacy guarantee as ReportContext: there is no free-text parameter,
 * and the only `data` field is `evidence.kind` (itself a closed enum). The
 * scrubber in sentry-filters.ts is a backstop, but the API itself is
 * unreachable from app code without producing safe values.
 */
// No "uncomplete" message — reverse-status mutations map to "update" (goal)
// or "toggle" (step) since both directions of the flip share one breadcrumb.
export type BreadcrumbInput =
  | { category: "goal"; message: "create" | "update" | "delete" | "complete" }
  | {
      category: "step";
      message: "create" | "update" | "delete" | "reorder" | "toggle";
    }
  | {
      category: "evidence";
      message: "start" | "save" | "discard";
      kind: EvidenceTypeValue;
    }
  | { category: "badge"; message: "build" | "sign" | "bake" | "store" }
  | { category: "key"; message: "generate" | "verify" }
  | { category: "focus"; message: "enter" | "exit" };

// Hides Sentry.addBreadcrumb so call sites cannot pass arbitrary data — the
// closed BreadcrumbInput is the privacy guarantee.
export function breadcrumb(b: BreadcrumbInput): void {
  const data = b.category === "evidence" ? { kind: b.kind } : undefined;
  Sentry.addBreadcrumb({
    category: b.category,
    message: b.message,
    level: "info",
    data,
  });
}
