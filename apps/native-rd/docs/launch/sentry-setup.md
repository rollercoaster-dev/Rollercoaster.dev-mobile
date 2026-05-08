# Sentry Setup

**Purpose:** Explain why `native-rd` uses Sentry this way. This is the short rationale doc; the executable privacy checks live in `privacy-verification.md`.

## Policy

Sentry is for crash and error reporting only. It is not analytics, usage tracking, replay, feedback, profiling, or user identification.

The app is local-first and privacy-first, so the Sentry setup is intentionally narrow:

- Capture crashes and errors that help us fix beta stability problems.
- Avoid collecting user content, identity, interaction patterns, screenshots, or route/query details.
- Keep the privacy controls in a small, auditable surface.

## Runtime Setup

Sentry is initialized in `src/services/sentry.ts` before the app is registered. Dev builds return early, so normal local development does not send events. Preview, TestFlight, and production builds are not `__DEV__`, so crash reporting is active there.

The Sentry wrapper is applied in `index.ts` at the root registration point. Rage-tap detection is disabled there, and component tree capture is set to zero.

## Privacy Controls

`src/services/sentry.ts` is the config audit surface:

- `sendDefaultPii: false`: do not intentionally attach user PII.
- `enableAutoSessionTracking: false`: no Sentry session-health or usage tracking.
- `tracesSampleRate: 0` and `tracePropagationTargets: []`: no performance tracing or trace propagation.
- `enableAutoPerformanceTracing: false`, app-start/native-frame/stall/user-interaction tracing off: no passive performance telemetry.
- `attachScreenshot: false` and `attachViewHierarchy: false`: no UI images or view hierarchy payloads.
- `enableCaptureFailedRequests: false`: no automatic failed-request capture.
- `attachThreads: false` and `attachAllThreads: false`: reduce native thread context outside the crashing stack.
- `enableLogs: false`: do not use Sentry's structured logs product.
- No `Sentry.setUser`: we do not attach app-level user identity.

Native crash handling remains enabled because crash capture is the reason Sentry exists here. Native crash payload privacy is verified manually before promotion; JS unit tests do not prove native envelope contents.

## JS Scrubbing

`src/services/sentry-filters.ts` contains the pure filters we own and test:

- `beforeSend` removes `event.user`, `event.extra`, request headers, cookies, body data, and query strings.
- Exception messages redact email-shaped strings and `/Users/<name>` local path prefixes.
- Request URLs are reduced to origin only, for example `https://example.com/path?email=x@y.com` becomes `https://example.com`.
- Breadcrumbs are re-filtered on the final event because native/device breadcrumbs can be merged after `beforeBreadcrumb`.
- Console, storage, navigation data, touch, and rage-tap breadcrumbs are dropped or stripped.
- HTTP-like breadcrumb data is rebuilt from a small allow-list: host-only `url`, safe `method`, and numeric `status_code`.

The filters deliberately do not use broad human-name regexes. Names are too ambiguous in exception text and broad redaction would destroy useful diagnostics. Instead, verification plants synthetic names in user-controlled app data and confirms those data paths do not reach Sentry.

## Project Settings

Some privacy controls are outside the codebase and must be checked in Sentry:

- IP suppression must be enabled.
- Sentry server-side data scrubbing must be enabled.
- Project integrations must not add replay, session replay, profiling, screenshots, feedback, or automatic user identity.

These settings are part of the manual release check because code review cannot prove them.

## Verification

Unit tests cover the JS filters:

```bash
bun test src/services/__tests__/sentry-filters.test.ts
```

Before any Sentry-bearing build is promoted to TestFlight or the App Store, run `docs/launch/privacy-verification.md` against an EAS preview build with a network proxy. The proxy check is required because it shows what left the device, including native crash envelopes and attachments.

Related docs:

- `docs/launch/privacy-verification.md` — release-blocking privacy verification checklist
- `docs/launch/crash-triage-runbook.md` — daily crash triage process
- `docs/plans/2026-05-04-sentry-integration.md` — original implementation plan
