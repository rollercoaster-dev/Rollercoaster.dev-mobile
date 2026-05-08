# Sentry Privacy Verification Test Plan

**Purpose:** Prove end-to-end that no PII leaves the device when the app sends events to Sentry. Run before any Sentry-bearing build is promoted to TestFlight (#971 / #976).

**Created:** 2026-05-04
**Last verified:** _never_ (see Verification Log at the bottom)

---

## What we're verifying

The privacy posture from `src/services/sentry.ts` and #971:

1. No user identifier in the payload (no `Sentry.setUser` is called)
2. `sendDefaultPii: false` is honoured
3. `tracesSampleRate: 0` — no performance traces with URLs / route params
4. `enableAutoSessionTracking: false` — no Sentry session-health tracking
5. No replay video, screenshots, view hierarchy, console breadcrumbs, failed-request capture, or auto-PII integrations
6. JS `beforeSend` strips user identity, extras, request metadata, email-shaped strings in exception messages, local `/Users/<name>` paths in exception messages, and request URLs (Step 4)
7. JS `beforeBreadcrumb` scrubs navigation params; drops console, storage, touch, and rage-tap breadcrumbs; and rebuilds fetch/xhr/http/request breadcrumb data from a host-only URL + method/status allow-list (Step 4)
8. Sentry project-level data-scrubbing rules + IP suppression are enabled

The JS event filters are unit-tested in `src/services/__tests__/sentry-filters.test.ts`. Native crash payloads are not proven scrubbed by those JS tests; they must be verified in the proxy capture and Sentry UI before TestFlight or App Store promotion.

A passing run requires that **every** synthetic PII string below is either absent from the outbound payload, replaced with `[Filtered]` / an app placeholder, or reduced to a host-only value. If any leak through, the run fails — go back to filters and try again.

---

## Tooling required

| Tool                                                                          | Purpose                                                                                          |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Sentry account + access to the `native-rd` project                            | Inspect what Sentry actually received                                                            |
| EAS preview build of native-rd installed on a physical iPhone                 | TestFlight builds are off-limits until #976 lands; preview builds are not **DEV** so Sentry runs |
| Network proxy with iOS root cert installed (Proxyman / mitmproxy / Charles)   | Inspect what actually leaves the device — the load-bearing check                                 |
| A device on the same Wi-Fi as the proxy, with HTTP proxy + cert trust enabled | Otherwise events bypass the proxy                                                                |

The network-proxy capture is the load-bearing artefact. Sentry's UI tells you what _Sentry_ received; the proxy tells you what _left the device_. They must match. The Sentry UI alone is not sufficient verification.

---

## Synthetic PII events

These are the events you'll deliberately fire from a debug menu (or by manually triggering specific app states). Each one plants a marker string of a specific PII shape; the test passes if the marker is absent, scrubbed, or host-only-truncated in both the Sentry UI and the proxy capture.

| #   | Marker                                                                                      | How to plant it                                                             | Where to look                                              | Pass criterion                                                                                                                                                                        |
| --- | ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `Joe Czarnecki` (synthetic name) in a goal title                                            | Create a goal titled `"Joe Czarnecki test goal"` and crash from it          | Event payload, breadcrumbs, extras, navigation data        | Marker is absent OR the goal title is replaced with `[Filtered]` / a placeholder. Do not rely on broad free-form name regexes in exception messages; they destroy useful diagnostics. |
| 2   | `test+pii@example.com` in a thrown error message                                            | Trigger a debug-menu error: `throw new Error("Email=test+pii@example.com")` | Exception value field                                      | Marker is absent OR replaced with `[redacted-email]` / `[Filtered]`                                                                                                                   |
| 3   | Local file path `/Users/<your-mac-username>/...`                                            | Trigger a debug-menu error containing that path in the error message        | Exception value field and stack frame `filename` fields    | Exception message path is redacted. Stack-frame local-machine paths are absent OR rewritten (preview builds are EAS-built, so Mac paths shouldn't appear — confirm).                  |
| 4   | URL with query param: `https://example.com/?email=test%40example.com`                       | Hit a fetch to that URL (debug menu)                                        | Breadcrumbs, request data                                  | URL is reduced to host-only (`https://example.com`) OR breadcrumb is dropped                                                                                                          |
| 5   | Navigation param leak: navigate to a screen with `{ goalTitle: "Joe Czarnecki test goal" }` | Navigate from one screen to another with that param                         | Navigation breadcrumb `data` field                         | Marker is absent OR the `data` field is stripped                                                                                                                                      |
| 6   | Console message with PII: `console.log("user email:", "test+pii@example.com")`              | Run from debug menu in a preview build                                      | Console breadcrumbs                                        | Console breadcrumbs should be absent entirely (`beforeBreadcrumb` drops `console`)                                                                                                    |
| 7   | IP address attribution                                                                      | Just send any event                                                         | Sentry event metadata `user.ip_address`                    | `null` or `[Filtered]`. **Sentry project setting must have IP suppression on.**                                                                                                       |
| 8   | Default PII (cookies, headers)                                                              | Just send any event                                                         | Sentry event metadata `request.headers`, `request.cookies` | Absent or `[Filtered]` (`sendDefaultPii: false`)                                                                                                                                      |
| 9   | Touch/rage tap data                                                                         | Tap rapidly on a screen with synthetic text visible                         | Breadcrumb categories `touch`, `ui.multiClick`             | Breadcrumbs with those categories are absent                                                                                                                                          |
| 10  | Native crash payload                                                                        | Trigger `Sentry.nativeCrash()` from a preview build                         | Proxy raw body, attachments, threads, contexts, Sentry UI  | Synthetic markers are absent. JS `beforeSend` tests are not sufficient proof for this row.                                                                                            |

Add to this list whenever you discover a new PII shape during normal triage. The plan is a living document.

---

## Procedure

1. **Build:** trigger an EAS preview build of native-rd. Wait for it to land. Install on a physical iPhone via the build link.
2. **Set up the proxy:**
   - Start your network proxy on the Mac
   - On the iPhone: Settings → Wi-Fi → ⓘ → HTTP Proxy → Manual → Mac IP + proxy port
   - Install + trust the proxy's root CA on the iPhone (Settings → General → VPN & Device Management)
   - Verify in browser: load any HTTPS site on the phone, confirm it appears in the proxy capture
3. **Filter the proxy** to only show traffic to `*.sentry.io` (or `*.ingest.de.sentry.io` for our DSN region) so the noise drops to manageable.
4. **Open Sentry** → `native-rd` project → Issues, ready to inspect new events as they arrive.
5. **For each row in the table above:**
   - Trigger the synthetic event from the app
   - Wait ~30 seconds for Sentry to receive it
   - Open the event in the Sentry UI; check the indicated fields against the pass criterion
   - Open the corresponding request in the proxy capture; search the raw body for the marker string
   - Tick or fail the row in the Verification Log below
   - For native crashes, inspect every envelope item, attachment, thread, context, and rendered Sentry UI section; do not assume JS `beforeSend` ran on the native crash payload.
6. **If any row fails:** stop, return to Step 4 of the implementation plan (`docs/plans/2026-05-04-sentry-integration.md`), tighten the relevant filter, build again, retest.
7. **All rows pass:** record the result in the Verification Log with date, build number, and Sentry release ID.

---

## Pass criteria summary

A run passes if:

- Every synthetic marker in the table is absent / scrubbed / host-only as specified
- The proxy capture shows no PII strings the Sentry UI didn't show (i.e. no on-device payload that diverges from what Sentry rendered)
- IP address fields in Sentry events are null or `[Filtered]`
- Native crash envelopes have been inspected directly in the proxy capture and Sentry UI
- Sentry project settings for IP suppression and server-side data scrubbing are confirmed

A run **fails** if any single marker leaks through. Partial passes do not count — the privacy promise is binary.

---

## Verification Log

| Date      | Build (CFBundleVersion) | Sentry release ID | Result | Notes                                                                           |
| --------- | ----------------------- | ----------------- | ------ | ------------------------------------------------------------------------------- |
| _pending_ | —                       | —                 | —      | First run will happen after Step 4 (filters) and Step 5 (sourcemap upload) land |

---

## Out of scope (for this doc)

- Apple's TestFlight crash pipeline — that's outside our control and accepted under TestFlight's separate privacy terms
- App Privacy nutrition-label declarations — handled in #976
- Privacy-policy text updates — handled in #976
