# Sentry Usage Concept

**Purpose:** Define how `native-rd` actually _uses_ Sentry once it is initialized. The setup is wired (`sentry-setup.md`), the privacy posture is locked (`privacy-verification.md`), the triage flow is written (`crash-triage-runbook.md`). What's missing is the in-code concept: **where in the app do we report, what do we attach, and what do we deliberately not touch.**

This document is the playbook. It is forward-looking — most of what's described here is _not yet implemented_.

**Status:** Concept / RFC. Foundational pieces shipped (Sentry.init, scrubber, `reportError` API, ErrorBoundary wiring, direct critical-path reports). Bridge allowlist and breadcrumb call sites landed on branch `feat/issue-1021-sentry-bridge-and-breadcrumbs` (2026-05-12). Remaining: EAS preview privacy verification run before TestFlight; see plan `docs/plans/2026-05-12-sentry-usage-finish.md`.
**Owner:** Joe
**Created:** 2026-05-06
**Revised:** 2026-05-06 — tightened API after review: closed enums for `kind` / breadcrumb data, scrubber must cover `event.contexts`, Logger bridge rewritten for the JS shim, ErrorBoundary plan now extends the existing component, `environment` plan corrected for Expo bundling.
**Revised:** 2026-05-12 — added `db.write` and `evidence.view` ReportContext members to cover scopes the original example list didn't anticipate (db/queries.ts spans 5 entity types; evidence view/load failures are distinct from capture and cleanup). See `docs/plans/2026-05-12-sentry-usage-finish.md` for the per-scope audit.
**Related:** `sentry-setup.md`, `privacy-verification.md`, `crash-triage-runbook.md`, `app-store-launch-plan.md`

---

## 1. Current state — short summary

Sentry SDK is initialized, privacy-scrubbed, sourcemap-uploaded, and crash-capturing **automatically**. There are **zero** manual `Sentry.*` calls anywhere in `src/`. Today the project relies entirely on the SDK's default integrations: unhandled JS exceptions, unhandled promise rejections, native iOS crashes.

What that misses:

- Caught errors logged via `console.error` or our `Logger` — 14+ sites in capture screens, edit screen, focus mode (audit details below).
- Errors logged via `logger.error()` in critical paths — `useCreateBadge` (badge signing), `useUserKey` (key generation), 20+ sites in `db/queries.ts`.
- React render errors caught by the existing `src/components/ErrorBoundary/ErrorBoundary.tsx` (used per-screen) — its `componentDidCatch` at line 27 currently calls `console.error` with a "Future: send to error tracking service" TODO. The hook is there; the wiring isn't.
- Best-effort recovery paths in audio recording, evidence cleanup, file I/O — they swallow errors with `setError()` UI and never report.

The audit's representative gap list is in §6 below.

---

## 2. Guiding principles (non-negotiable)

These follow directly from `sentry-setup.md`. Every section below is a consequence of these.

1. **Crash and error reporting only.** Not analytics, not user behaviour, not performance tracing. If a piece of instrumentation isn't helping us _fix_ a bug, it doesn't belong.
2. **No user content, ever.** Goal titles, step descriptions, evidence text, file names, route params, user IDs — none of these go in `captureException` arguments, `setTag` values, `setContext` payloads, breadcrumb messages, or anywhere reachable by Sentry.
3. **Categorical, not identifying.** When we attach context, we attach _shape_ (`evidence_kind: "video"`), not _content_ (`goal_title: "Run a 10k"`). A reader of a Sentry event must not be able to identify the user or reconstruct their data.
4. **Same scrubbers always run.** The `beforeSend` / `beforeBreadcrumb` filters in `sentry-filters.ts` are the last line of defence. Anything we add must still pass through them. If we ever bypass them, the privacy posture is broken.
5. **Don't duplicate the SDK.** The SDK already captures unhandled exceptions and native crashes. Manual `captureException` is for caught errors that we _chose_ to swallow but want to know about.
6. **Production gates already exist.** `__DEV__` gates `initSentry()`. Manual calls inherit that — they're no-ops in dev. We don't need extra `if (__DEV__)` guards in app code.

---

## 3. The reporting surface — what we add

A small, named API. Three pieces.

### 3.1 A `reportError(error, context)` helper

Single function, single import boundary. Lives next to the SDK config.

**File:** `src/services/sentry-report.ts` (new)

**Shape — closed enums everywhere:**

```ts
import * as Sentry from "@sentry/react-native";

// One enum entry per (area, kind) pair. No free-text strings reach Sentry.
type ReportContext =
  | { area: "badge.create"; kind?: "build" | "sign" | "bake" | "store" }
  | { area: "badge.storage"; kind?: "read" | "write" | "delete" }
  | { area: "key.generate" }
  | { area: "key.verify" }
  | {
      area: "evidence.capture";
      kind: "photo" | "video" | "audio" | "file" | "link" | "text";
    }
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
  | { area: "navigation" }
  | { area: "db.write" } // db/queries.ts — spans 5 entity types
  | { area: "evidence.view"; kind?: EvidenceTypeValue } // view/load side, distinct from capture/cleanup
  | { area: "render" };

export function reportError(error: unknown, ctx: ReportContext): void {
  // No-op in dev (Sentry init returned early), so this is fire-and-forget.
  Sentry.withScope((scope) => {
    scope.setTag("area", ctx.area);
    if ("kind" in ctx && ctx.kind) scope.setTag("kind", ctx.kind);
    Sentry.captureException(error);
  });
}
```

**No `meta` parameter.** The earlier draft offered `meta?: Record<string, string | number | boolean>` and routed it through `setContext`. That was unsafe: `setContext` writes to `event.contexts`, which is **not** scrubbed by `sentry-filters.ts:107` (the scrubber deletes `event.user`, `event.extra`, and `event.request` fields, but `event.contexts` passes through untouched). A typed `Record<string, primitive>` does not stop a developer from writing `{ title: goal.title }` — primitives can carry PII. Removing the parameter removes the foothold.

**If we ever genuinely need extra context** (rare; the stack trace plus `area`/`kind` is usually enough): add it as a new enum member with explicit fields, e.g. `{ area: "audio.record"; kind: "start"; permissionDenied: boolean }`. That is type-checked, reviewable in a diff, and impossible to misuse. Do **not** add a generic context bag.

**Scrubber update — required before §6 work lands:**

`src/services/sentry-filters.ts` must also strip non-allowlisted keys from `event.contexts`. Allowlist:

- `app` (Sentry SDK auto-fills version/build — verify these aren't user-shaped)
- `device` (model / OS — categorical)
- `os` (version — categorical)
- `runtime` (Hermes version — categorical)
- `react_native_context` (Sentry-managed)

Anything else (custom contexts written by app code or future SDK integrations) gets deleted. Add a unit test: write `event.contexts.user_data = { title: "leak" }`, run `scrubEvent`, assert the key is gone.

**Why this and not `Sentry.captureException` direct:**

- The `area`/`kind` discriminated union is a controlled vocabulary. It's the same dimension the triage runbook will group on. If every call site invents its own tag, triage becomes archaeology.
- The type system blocks accidentally passing user content — there is no string parameter to write into.
- Tests can mock this single import without mocking `@sentry/react-native`.

### 3.2 A `Logger` → Sentry bridge

**Reality check on the logger.** The app uses a JS shim, not the real `@rollercoaster-dev/rd-logger` (the upstream package depends on Node built-ins like `async_hooks` that don't exist in React Native). The shim lives at `src/shims/rd-logger.js` and is a 22-line `console.*` wrapper. There are no log levels, no event subscribers, no construction hook to register listeners against.

**That changes the plan.** We can't subscribe to a logger event stream because there isn't one. The bridge has to be a direct edit to the shim's `error` method.

**Why the naive version is dangerous.** Existing `logger.error` call sites pass meta that contains user content:

- `src/db/queries.ts:101` — `logger.error("Failed to insert goal", { title: parsedTitle, error })` — leaks the goal title.
- `src/utils/evidenceViewers.tsx:57` — passes a `uri` (file path / asset URI).
- `src/screens/BadgeDesignerScreen/BadgeDesignerScreen.tsx:645` — passes route params.

A bridge that forwards meta into Sentry — even via a "primitives only" filter — would leak all three. The bridge's job is to extract _only_ the `Error` instance and discard the rest.

**Bridge contract (drop-everything-else):**

```js
// src/shims/rd-logger.js — modified
import { reportLoggerError } from "../services/sentry-report";

export class Logger {
  constructor(name) {
    this._name = name || "app";
  }
  error(...args) {
    console.error(`[${this._name}]`, ...args);
    // Find the first Error instance in args (typical shape: msg, { error }).
    const err = findError(args);
    if (err) reportLoggerError(this._name, err);
    // If there's no Error instance, do NOT capture a message — the message
    // string can contain interpolated user content. Console-only is fine.
  }
  // warn/info/debug unchanged — no Sentry routing.
}
```

`reportLoggerError(scope, err)` lives in `sentry-report.ts`:

```ts
// Illustrative; source of truth: src/services/sentry-report.ts.
// useCreateBadge/useUserKey deliberately absent — they call reportError()
// directly; bridge would double-report.
const SCOPE_TO_AREA: Record<string, ReportContext> = {
  useFocusModePrefs: { area: "focus.mode" },
  evidenceCleanup: { area: "evidence.cleanup" },
  "db.queries": { area: "db.write" }, // spans 5 entity types; stack trace distinguishes which function
  evidenceViewers: { area: "evidence.view" }, // link+file open, no kind
  VideoContent: { area: "evidence.view", kind: "video" },
  PhotoContent: { area: "evidence.view", kind: "photo" },
  LinkContent: { area: "evidence.view", kind: "link" },
  FileContent: { area: "evidence.view", kind: "file" },
  // ...explicit list. Unknown scope => no report.
};

export function reportLoggerError(scope: string, err: Error): void {
  const ctx = SCOPE_TO_AREA[scope];
  if (!ctx) return; // unknown scope = silent. Better to miss than to leak.
  reportError(err, ctx);
}
```

**Three rules this enforces:**

1. **Only `Error` instances reach Sentry.** Loose strings, objects with user content, route params — all dropped at the shim boundary. The `Error.message` itself is still scrubbed by `beforeSend` for emails and local paths.
2. **Unknown logger scopes are silent.** If someone adds `new Logger("BadgeRoute")` and `logger.error("user typed " + title, ...)`, nothing goes to Sentry until the scope is explicitly added to the map. This is the inverse of the usual default — opt-in, not opt-out.
3. **No meta forwarding, ever.** The shim discards everything except the first `Error` argument. There is no "primitives only" sieve, because primitives can be PII.

**Why bridge at all** (vs. auditing each `logger.error`): once the explicit-allowlist version is in place, adding a new critical path to coverage is one line in `SCOPE_TO_AREA`, not a code change in the call site. That keeps reporting decisions in one reviewable file.

**Acceptance test:** unit test the bridge with a synthetic `logger.error("title=" + title, { title, error: new Error("boom") })` call, assert the captured event has only the `Error` and no trace of `title` in any field.

### 3.3 Wire the existing `<ErrorBoundary>` to Sentry

**There is already an ErrorBoundary.** `src/components/ErrorBoundary/ErrorBoundary.tsx:17` defines a class component with `getDerivedStateFromError`, `componentDidCatch` (line 27), a fallback UI styled with the design system, and a "Try Again" reset button. Several screens already wrap themselves in it. The original draft of this doc claimed otherwise — that was wrong.

**What's actually missing:** at line 28–29 the boundary's `componentDidCatch` is just:

```ts
componentDidCatch(error: Error, info: React.ErrorInfo) {
  // Future: send to error tracking service
  console.error("ErrorBoundary caught:", error, info.componentStack);
}
```

The hook is in place, the wiring is the TODO.

**The single-line change:**

```ts
componentDidCatch(error: Error, info: React.ErrorInfo) {
  reportError(error, { area: "render" });
  // info.componentStack is symbol info (component names), not user content.
  // We deliberately do not pass it — the JS sourcemap upload + the error's
  // own stack frames give us the same symbolicated picture, and we keep
  // the reportError surface free of free-text strings.
}
```

We do **not** add `componentStack` as context — see §3.1 on why no free-text fields. The error's `stack` already carries the symbolicated chain after sourcemap upload.

**Open question — do we still want a root-level boundary?**

Existing usage is per-screen, which is good UX (a render error in one screen doesn't blank the whole app). But there's no boundary outside `<NavigationContainer>` in `App.tsx:80–99`, so a render error in a Provider, the navigator itself, or an outer layout layer will still tear the app down before reaching any per-screen boundary. **Recommendation:** if we want protection for the navigator and outer app shell, add one more `<ErrorBoundary>` around `<NavigationContainer>` itself, with a "reload the app" fallback. A boundary placed only inside `<NavigationContainer>` protects navigator children, but not the navigator component. Same component, different fallback prop. Defer this until §6.1 ships, then evaluate whether we've actually seen any nav-level render errors in Sentry that justify it.

**Why our own boundary, not Sentry's `<ErrorBoundary>` from `@sentry/react`:** the existing component is already themed and accessible (`accessibilityRole="alert"`, design-token colours, focus-visible "Try Again"). Sentry's component would route through `Sentry.captureException` directly, bypassing our `reportError` taxonomy. Keeping the existing component and pointing its `componentDidCatch` at `reportError` gives us the taxonomy and the design system for the price of one line.

---

## 4. Breadcrumbs — what we add and what we don't

Breadcrumbs are the trail leading up to an event. The SDK adds many automatically; `sentry-filters.ts` strips most of them aggressively.

### 4.1 What the SDK gives us today (after scrubbing)

- HTTP-like breadcrumbs reduced to host + method + status code.
- Navigation breadcrumbs with `data` stripped (route name only).
- Native breadcrumbs (lifecycle, low memory).
- Console / storage / touch / rage-tap breadcrumbs **dropped entirely**.

That is, by design, sparse. It's enough to know "the user navigated, then a crash happened" without knowing which goal they opened.

### 4.2 What manual breadcrumbs we add

A small set, all categorical.

| When                                        | Breadcrumb                                                          | Why                                                          |
| ------------------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------ |
| Goal mutation starts                        | `category: "goal"`, `message: "create" \| "update" \| "delete"`     | If a crash follows, we know which mutation kind preceded it. |
| Step mutation starts                        | `category: "step"`, same shape                                      | Same.                                                        |
| Evidence capture starts                     | `category: "evidence"`, `data: { kind: "photo" \| "video" \| … }`   | Distinguishes which capture path was active.                 |
| Badge creation milestones (build/sign/bake) | `category: "badge"`, `data: { phase: "build" \| "sign" \| "bake" }` | Pinpoints which step of the multi-stage badge flow failed.   |
| Key generation start / verify start         | `category: "key"`, `data: { phase: "generate" \| "verify" }`        | Ed25519 setup is a one-shot critical path.                   |
| Focus mode entered / exited                 | `category: "focus"`, `data: { phase }`                              | Focus mode has its own state machine; useful for triage.     |

**What goes in `data`:** only enums. No goal IDs, no step counts above a small cap, no titles. Treat `data` as type-restricted at the call site.

**What does NOT get a breadcrumb:**

- Anything that fires per-keystroke or per-frame.
- Anything containing user text.
- Successful HTTP responses (the SDK already adds those, and we don't make remote calls anyway).

### 4.3 A `breadcrumb()` helper — closed enums, no free strings

Same reasoning as `reportError`: one named import, one controlled vocabulary, and no free-text parameter that could leak user content into the breadcrumb trail.

**File:** `src/services/sentry-report.ts`

```ts
type BreadcrumbInput =
  | { category: "goal"; message: "create" | "update" | "delete" | "complete" }
  | {
      category: "step";
      message: "create" | "update" | "delete" | "reorder" | "toggle";
    }
  | {
      category: "evidence";
      message: "start" | "save" | "discard";
      kind: "photo" | "video" | "audio" | "file" | "link" | "text";
    }
  | { category: "badge"; message: "build" | "sign" | "bake" | "store" }
  | { category: "key"; message: "generate" | "verify" }
  | { category: "focus"; message: "enter" | "exit" };

export function breadcrumb(b: BreadcrumbInput): void {
  const data = b.category === "evidence" ? { kind: b.kind } : undefined;
  Sentry.addBreadcrumb({
    category: b.category,
    message: b.message,
    level: "info",
    data,
  });
}
```

The discriminated union means there is no `string` parameter to misuse and no generic `data` bag. The only `data` field is `evidence.kind`, itself a closed enum.

**Scrubber backstop.** The current `beforeBreadcrumbFilter` in `sentry-filters.ts` rebuilds HTTP-like breadcrumbs from an allowlist but lets non-HTTP categories through with whatever the SDK produced. Manual breadcrumbs will pass through that gap untouched. Two safeguards:

1. The closed-enum API above means the gap is unreachable from app code — there's no free text to leak.
2. Add a unit test that calls `breadcrumb({ category: "goal", message: "create" })`, runs the resulting Sentry breadcrumb through `beforeBreadcrumbFilter`, and asserts neither `message` nor `data` carries anything outside the allowed enum values. This makes the invariant testable.

---

## 5. Tags, scopes, user identity

### 5.1 Tags we set (global)

Set once during init, in `sentry.ts`, after `Sentry.init`:

- `app.theme.color_mode` — `"light"` / `"dark"`. Useful because some bugs only manifest in one mode.
- `app.theme.variant` — one of the seven a11y variants. Same reason. Set this when the theme changes (subscribe in the theme provider).

These are categorical and non-identifying. They explain "what theme" without explaining "who". Build/environment separation is handled by `environment` (§7.2), not by a custom tag.

### 5.2 Tags we never set

- User IDs of any form, including hashed.
- Account email or anything derivable from it.
- Goal counts, step counts, badge counts past low fixed buckets (no "user has 47 goals" — that's a fingerprint).
- Locale or timezone with too much precision (locale is fine; timezone offset is borderline; do without if we're unsure).

### 5.3 `Sentry.setUser` — never call it

`sendDefaultPii: false` already prevents the SDK from auto-attaching identity. Manually calling `setUser` would re-introduce it. The bridge in §3.2 must not call `setUser`.

If we ever need cohort analysis (e.g. "is this crash hitting one user or many?"), Sentry's automatic, opaque, install-scoped identifier (`installation_id`) gives us that without our adding identity. Verify during `privacy-verification.md` runs that this identifier is not derivable to a person.

### 5.4 `withScope` for one-off context

The `reportError` helper already opens a scope. Direct callers of `Sentry.withScope` should be rare — almost everything should go through `reportError`. The exception is when a non-error event needs context, which we don't currently emit.

---

## 6. Where instrumentation goes — concrete targets

This is the punch list. All file references are from the audit. Each entry says: what to wrap, with what `area` and `kind`.

### 6.1 Critical (do these first)

| File                                             | Lines   | Action                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | `area` / `kind`                       |
| ------------------------------------------------ | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| `src/hooks/useCreateBadge.ts`                    | 286–294 | After `logger.error(...)`, call `reportError(err, { area: "badge.create" })` once. The catch is broad and already covers `bakePNG`, `saveBadgePNG`, `createBadge`, and `completeGoal` — do not also wrap `bakePNG` separately or we'll double-report. If we want sub-area granularity, wrap the inner stages in `try { ... } catch (e) { reportError(e, { area: "badge.create", kind: "bake" \| "store" \| ... }); throw; }` so each stage reports exactly once and the outer catch stops being a backstop. | `badge.create` (with optional `kind`) |
| `src/hooks/useUserKey.ts`                        | 85–102  | Wrap key-verify catch                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | `key.verify`                          |
| `src/hooks/useUserKey.ts`                        | 127–133 | Wrap key-generation catch                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | `key.generate`                        |
| `src/components/ErrorBoundary/ErrorBoundary.tsx` | 27–30   | Replace the `console.error` TODO with `reportError(error, { area: "render" })`                                                                                                                                                                                                                                                                                                                                                                                                                              | `render`                              |
| `App.tsx`                                        | 80–99   | Optional second wrap around `<NavigationContainer>` with the existing `<ErrorBoundary>` (see §3.3) — defer until evidence justifies it                                                                                                                                                                                                                                                                                                                                                                      | `render`                              |

### 6.2 Important (do these next)

| File                                                        | Lines                            | `area` / `kind`                      |
| ----------------------------------------------------------- | -------------------------------- | ------------------------------------ |
| `src/screens/EditModeScreen/EditModeScreen.tsx`             | 91, 111, 151, 165, 190, 203, 217 | `goal.mutate` / `step.mutate`        |
| `src/screens/FocusModeScreen/FocusModeScreen.tsx`           | 275, 360, 457                    | `focus.mode`                         |
| `src/screens/CompletionFlowScreen/CompletionFlowScreen.tsx` | 174                              | `completion.flow`                    |
| `src/screens/CapturePhoto/CapturePhoto.tsx`                 | 41                               | `evidence.capture` / `kind: "photo"` |
| `src/screens/CaptureVideoScreen/CaptureVideoScreen.tsx`     | 100, 215                         | `evidence.capture` / `kind: "video"` |
| `src/screens/CaptureFile/CaptureFile.tsx`                   | 91                               | `evidence.capture` / `kind: "file"`  |
| `src/screens/CaptureLinkScreen/CaptureLinkScreen.tsx`       | 62                               | `evidence.capture` / `kind: "link"`  |
| `src/screens/CaptureTextNote/CaptureTextNote.tsx`           | 63                               | `evidence.capture` / `kind: "text"`  |
| `src/hooks/useAudioRecorder.ts`                             | 122, 148, 162, 174, 191          | `audio.record`                       |

### 6.3 Conditionally covered by the Logger bridge

Once §3.2 lands, only `logger.error(...)` sites that meet **both** bridge conditions are auto-covered:

1. The logger scope is explicitly listed in `SCOPE_TO_AREA`.
2. The call includes an actual `Error` instance that `findError(args)` can extract.

That means `src/db/queries.ts` is **not** covered just by editing the shim. It currently constructs `new Logger()` and therefore uses the default `"app"` scope, which must stay unmapped because it is too broad. To route audited DB errors through Sentry, first change that file to `new Logger("db.queries")`, add `"db.queries"` to `SCOPE_TO_AREA`, and accept that validation-only logger calls without an `Error` instance remain console-only by design.

Same rule for every other logger site: allowlist the scope only after auditing that its emitted `Error.message` values are safe enough for Sentry's current scrubber. Do not treat the bridge as blanket coverage for every `logger.error`.

### 6.4 Don't bother

These are intentional swallows. Reporting them would create noise, not signal.

| File                                           | Why                                                                                      |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `src/utils/haptics.ts:4,8`                     | Haptics is a graceful-degradation API. Failure is expected on devices without taptic.    |
| `src/hooks/useAnimationPref.ts:31`             | ReduceMotion subscription is best-effort.                                                |
| `src/hooks/useAudioRecorder.ts:214`            | Recorder cleanup on unmount — failure here is downstream of an already-reported failure. |
| `src/stories/design-system/useCopyToken.ts:18` | Storybook-only, won't ship.                                                              |

---

## 7. TestFlight-specific concerns

### 7.1 Sourcemaps and dSYMs — symbolication contract

For Sentry to give us readable stack traces from a TestFlight build, **two** things have to arrive in Sentry:

1. **JS sourcemaps** — uploaded by the `@sentry/react-native/expo` plugin during EAS build, gated on `SENTRY_AUTH_TOKEN` being set as an EAS secret. The Expo plugin handles this automatically post-build because we're using `getSentryExpoConfig()` in `metro.config.js`. The Sentry "release" name is matched via a Debug ID embedded in the bundle, so version mismatches don't break symbolication.
2. **iOS dSYMs** — uploaded for native crash symbolication. EAS produces dSYMs as part of the archive. We need to verify these are uploaded; the Expo Sentry plugin _should_ do this, but it's untested here. Verification: trigger a `Sentry.nativeCrash()` in a TestFlight build, confirm the resulting Sentry event has Swift/ObjC frames named, not hex addresses.

> **From the Sentry docs** — sourcemap upload for Expo is automatic when both the Sentry Expo Plugin and the Sentry Metro Plugin are present, _and_ `SENTRY_AUTH_TOKEN` is set in the build environment. We have all three. What we haven't done yet is confirm-with-a-real-error in a real EAS build.

**Action:** Step 7 of the launch plan ("debug crash trigger") should be a long-press menu entry in the dev/preview build that calls `Sentry.nativeCrash()`. Use it once per release-candidate build to verify symbolication end-to-end.

### 7.2 Release naming and environment separation

Right now: one Sentry DSN serves dev (suppressed via `__DEV__`), preview, TestFlight, and production. That's fine while we're a closed beta.

What it costs us: in the Sentry UI we cannot ask "show me only TestFlight crashes vs production crashes" without proxying via `app version` strings, which we'd have to read carefully (TestFlight builds and App Store builds can share a `CFBundleShortVersionString`).

What to do **before TestFlight goes wide**:

- Add an `environment` to `Sentry.init`, sourced from an Expo-bundled variable. **Do not** read `process.env.EAS_BUILD_PROFILE` in app code — that variable is set on the EAS build job, not inlined into the JS bundle, so at runtime it will be `undefined`. Expo only inlines `EXPO_PUBLIC_*` variables into the bundle. Two viable patterns, pick one:
  1. **`EXPO_PUBLIC_SENTRY_ENVIRONMENT`** set per profile in `eas.json`'s `env` block (`development`, `preview`, `production`). Read in `sentry.ts` as `process.env.EXPO_PUBLIC_SENTRY_ENVIRONMENT ?? "unknown"`. Simplest, no app config changes.
  2. **`Constants.expoConfig?.extra?.sentryEnvironment`** populated via a dynamic `app.config.ts` that reads the EAS profile at build time and writes it into `extra`. More flexible if we want other build-time config but adds an `app.config.ts`.
     Recommend option 1 for now.
- Consider, but don't yet build, a separate Sentry project for production. Decision can wait until production exists.

### 7.3 Privacy policy + nutrition labels — blocking gate

Per `app-store-launch-plan.md` and issue #976: TestFlight currently declares "no data collected by us". A Sentry-bearing build cannot ship to external testers until the privacy policy and App Store nutrition labels are updated to disclose Sentry's role. Internal testers (the 100-tester pool tied to our developer account) can receive Sentry-bearing builds for our own testing, but anything wider waits on the privacy policy work.

This is enforcement, not a Sentry concern — but it's the single thing that gates everything in this document from going live.

### 7.4 Privacy verification — gate before each release type

`docs/launch/privacy-verification.md` defines the synthetic-PII test. It must be run:

- Before the first TestFlight build that includes Sentry (gate for §7.3).
- Before any release where we change `sentry.ts`, `sentry-filters.ts`, or `sentry-report.ts`.
- Before turning on any new Sentry feature (replay, profiling, performance) — and we've decided not to turn those on, but if that decision changes, the verification runs first.

---

## 8. Anti-patterns — what not to do

Listed because each of these has an obvious-looking but wrong reason behind it.

1. **`Sentry.captureMessage("user did X")` for analytics.** Tempting because it's cheap, but it routes user behaviour through the crash channel. Use a separate analytics tool, or — better — don't. Local-first means we're not building a behavioural funnel.
2. **`setContext("goal", goal)` to "help debugging".** The goal object contains user content. The whole privacy posture exists to keep this out. Use `setTag("kind", "goal")` and let the stack trace tell the rest.
3. **Re-enabling `tracesSampleRate > 0` to "see how slow the badge flow is".** Performance traces auto-attach span data that can include URLs, query params, and route names. We've turned all of that off deliberately. If we want timing, instrument a single span manually and read the duration ourselves; don't open the firehose.
4. **Calling `Sentry.captureException` inside the `beforeSend` filter.** Recursion. The filter is the last gate; it must not emit new events.
5. **Reporting from inside a `.catch(() => {})` whose entire purpose is graceful degradation.** Haptics, ReduceMotion subscription, audio cleanup — these are best-effort by design. Reporting them creates noise that drowns real signal.
6. **A "verbose" mode that disables the scrubbers in dev.** If a developer needs raw event content, they have console logs. The scrubbers are an invariant; they don't have a debug-off switch.
7. **`setUser({ id: hashedEmail })`.** Hashed isn't anonymous — it's a stable identifier across events. Skip user identity entirely; cohort analysis can use Sentry's built-in install identifier if needed.
8. **Bypassing `reportError` to add "just one more tag".** If a tag is needed, add it to the `ReportContext` enum. If it's a one-off, it's probably user-shaped — that's the actual problem.

---

## 9. Open questions / decisions deferred

These are not blocking the §6 work but should be revisited at TestFlight-public time.

- **Separate production Sentry project?** Pros: clean blast radius if something leaks; clean per-project quotas. Cons: more config, more secrets, more verification runs. Decision deferred until we have a production build.
- **`Sentry.metrics` for non-PII counters?** E.g. "badge bake failures per release". Useful for stability dashboards. Same risk surface as performance — defer until we can audit what the API attaches.
- **User feedback widget?** Sentry offers one. We've not enabled feedback or replay. If we ever want user-initiated reports, they'll need their own privacy review.
- **Background task instrumentation.** No background tasks today. If we add scheduled evidence cleanup or notification handlers, each gets its own `area` and an explicit instrumentation pass.
- **Should the Logger bridge filter by `scope`?** E.g. `db/queries.ts` errors are noisier than `useUserKey` errors. We may want a per-scope sample rate. Defer until we have real data on what's noisy.

---

## 10. Implementation order (suggested)

Smallest credible first commit, then fan out.

1. **Scrubber upgrade first** — extend `sentry-filters.ts` to strip non-allowlisted `event.contexts` keys, with a test. This is the privacy backstop for everything that follows; ship before any new reporting code.
2. **§3.1** — `reportError` helper with the closed `area`/`kind` union. ~50 LOC, no behaviour change. Merge.
3. **§3.3** — wire the existing `ErrorBoundary.componentDidCatch` to `reportError`. One-line code change in `src/components/ErrorBoundary/ErrorBoundary.tsx:27`.
4. **§7.1** — debug menu entry calling `Sentry.nativeCrash()`. Run on a preview EAS build. Confirm symbolicated events arrive.
5. **§3.2** — Logger shim bridge with the explicit `SCOPE_TO_AREA` allowlist. Single file change in `src/shims/rd-logger.js` plus the helper in `sentry-report.ts`. Add scopes to the map only as we audit each one.
6. **§7.2** — add `environment` to `Sentry.init` via `EXPO_PUBLIC_SENTRY_ENVIRONMENT`, set in `eas.json`.
7. **§6.1** — critical-path call sites manually instrumented (key gen/verify, badge create — single outer catch, no double-report).
8. **§6.2** — important call sites, batched by screen area.
9. **§4** — `breadcrumb()` helper with the closed-enum union + selective call sites. Lowest priority — only useful once we have crashes to triage with breadcrumb context.

Each step is independently shippable and independently revertable. None of them depend on App Store / TestFlight state.

---

## 11. Verification before considering this done

A reasonable definition-of-done for the whole arc:

- [ ] `reportError` exists, has tests, has the `area`/`kind` discriminated union (no free-text `kind` or `meta`)
- [ ] `sentry-filters.ts` strips non-allowlisted `event.contexts` keys, with a unit test that plants a synthetic `event.contexts.user_data` and confirms it's removed
- [ ] Logger shim (`src/shims/rd-logger.js`) only forwards `Error` instances to `reportLoggerError`; meta is dropped at the shim boundary; unknown logger scopes are silent; allowlisted scopes have audited `Error.message` values (tests: metadata containing goal title is dropped; email-shaped and `/Users/<name>` strings in `Error.message` are redacted by `beforeSend`)
- [ ] Existing `src/components/ErrorBoundary/ErrorBoundary.tsx:27` calls `reportError(error, { area: "render" })` and no longer just `console.error`s
- [ ] All §6.1 critical sites instrumented
- [ ] §7.1 debug crash trigger committed and used at least once on a preview build
- [ ] Symbolicated JS frames confirmed in Sentry from a forced JS throw
- [ ] Symbolicated native frames confirmed in Sentry from `Sentry.nativeCrash()`
- [ ] `environment` tag visible on all events from EAS builds
- [ ] `privacy-verification.md` run end-to-end against the build that contains all of the above
- [ ] Privacy policy + nutrition labels updated (#976) **before** any external TestFlight invite

Everything above this line lives in `apps/native-rd/`. Nothing in this document touches the rest of the monorepo.
