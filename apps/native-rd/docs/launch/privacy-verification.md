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
4. No replay video, no console breadcrumbs, no auto-PII integrations
5. `beforeSend` strips local file paths and request URLs (Step 4)
6. `beforeBreadcrumb` scrubs navigation params and fetch/xhr URLs (Step 4)
7. Sentry project-level data-scrubbing rules + IP suppression are enabled

A passing run requires that **every** synthetic PII string below is either absent from the outbound payload, replaced with `[Filtered]`, or reduced to a host-only value. If any leak through, the run fails — go back to filters and try again.

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

| #   | Marker                                                                                      | How to plant it                                                                   | Where to look                                              | Pass criterion                                                                                                   |
| --- | ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| 1   | `Joe Czarnecki` (synthetic name) in a goal title                                            | Create a goal titled `"Joe Czarnecki test goal"` and crash from it                | Event payload, breadcrumbs, exception messages             | Marker is absent OR the goal title is replaced with `[Filtered]` / a placeholder                                 |
| 2   | `test+pii@example.com` in a thrown error message                                            | Trigger a debug-menu error: `throw new Error("Email=test+pii@example.com")`       | Exception value field                                      | Marker is absent OR replaced with `[Filtered]`                                                                   |
| 3   | Local file path `/Users/<your-mac-username>/...`                                            | Any thrown error in a non-production build whose stack frames include local paths | Stack frame `filename` fields                              | Local-machine path is absent OR replaced (preview builds are EAS-built, so Mac paths shouldn't appear — confirm) |
| 4   | URL with query param: `https://example.com/?email=test%40example.com`                       | Hit a fetch to that URL (debug menu)                                              | Breadcrumbs, request data                                  | URL is reduced to host-only (`https://example.com`) OR breadcrumb is dropped                                     |
| 5   | Navigation param leak: navigate to a screen with `{ goalTitle: "Joe Czarnecki test goal" }` | Navigate from one screen to another with that param                               | Navigation breadcrumb `data` field                         | Marker is absent OR the `data` field is stripped                                                                 |
| 6   | Console message with PII: `console.log("user email:", "test+pii@example.com")`              | Run from debug menu in a preview build                                            | Console breadcrumbs                                        | Console breadcrumbs should be absent entirely (`enableLogs: false`)                                              |
| 7   | IP address attribution                                                                      | Just send any event                                                               | Sentry event metadata `user.ip_address`                    | `null` or `[Filtered]`. **Sentry project setting must have IP suppression on.**                                  |
| 8   | Default PII (cookies, headers)                                                              | Just send any event                                                               | Sentry event metadata `request.headers`, `request.cookies` | Absent or `[Filtered]` (`sendDefaultPii: false`)                                                                 |

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
6. **If any row fails:** stop, return to Step 4 of the implementation plan (`docs/plans/2026-05-04-sentry-integration.md`), tighten the relevant filter, build again, retest.
7. **All rows pass:** record the result in the Verification Log with date, build number, and Sentry release ID.

---

## Pass criteria summary

A run passes if:

- Every synthetic marker in the table is absent / scrubbed / host-only as specified
- The proxy capture shows no PII strings the Sentry UI didn't show (i.e. no on-device payload that diverges from what Sentry rendered)
- IP address fields in Sentry events are null or `[Filtered]`

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
