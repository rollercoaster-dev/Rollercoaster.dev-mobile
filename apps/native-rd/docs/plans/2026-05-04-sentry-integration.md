# Sentry Integration — Implementation Plan (#971)

**Created:** 2026-05-04
**Owner:** Joe
**Issue:** [#971](https://github.com/rollercoaster-dev/monorepo/issues/971) — `feat(native-rd): integrate Sentry for crash reporting`
**Related:** #976 (privacy policy + nutrition labels), #972 (in-app bug-report via Sentry feedback API)

## Goal

Symbolicated crash reports flowing into Sentry, with **zero PII leaving the device**, verified by a documented test plan. The next TestFlight build must not ship until the privacy policy + App Privacy nutrition labels (#976) are updated to match.

---

## The single critical sequencing constraint

The currently-live TestFlight build declares "no data collected by us." The moment a build with Sentry initialised installs on a tester's device, that claim becomes false. **#976 must merge before any Sentry-bearing build is pushed to TestFlight.**

This means: develop and verify Sentry on local + EAS _preview_ builds (not promoted to TestFlight), and only push to TestFlight once the privacy-policy update is live.

---

## Open decisions (resolve before Step 1)

| Decision                              | Default                                                              | Notes                                                                            |
| ------------------------------------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Sentry org + project name             | `rollercoaster-dev` / `native-rd`                                    | Free-tier dev plan is fine for closed beta                                       |
| DSN storage                           | `app.json` `extra.sentry.dsn`, read via `expo-constants`             | DSN is not a secret (it's client-side), but should still not be hardcoded inline |
| Auth token storage (sourcemap upload) | EAS secret `SENTRY_AUTH_TOKEN`                                       | This **is** a secret — never commit                                              |
| Crash test trigger                    | Hidden long-press on Settings header in `__DEV__` + EAS preview only | Avoids shipping a forced-crash button to TestFlight                              |

---

## Steps (atomic commits, in order)

### Step 1 — Write the privacy-verification test plan FIRST

**File:** `apps/native-rd/docs/launch/privacy-verification.md`

Before any Sentry code lands, document:

- The synthetic-PII events you'll fire (e.g. goal title with a fake name, URL with `?email=test@example.com`, thrown `Error` with a file path containing `/Users/<user>/`)
- What to check in the Sentry UI for each event (event payload, breadcrumbs, stack frames, request data)
- Network-proxy validation: capture outbound traffic with mitmproxy / Charles / Proxyman; assert no PII-shaped strings appear
- Pass criteria: every synthetic PII string is either absent, scrubbed (`[Filtered]`), or replaced with a host-only URL

**Why first:** the test plan defines what "compliant" means. Writing the code first risks over-fitting to whatever Sentry happens to do by default.

**Commit:** `docs(native-rd): add Sentry privacy verification test plan`

---

### Step 2 — Install + bare init (no filters yet) ✅ DONE

- `@sentry/react-native@8.10.0` installed via the Sentry wizard
- `@sentry/react-native/expo` config plugin added to `app.json` plugins
- New file `src/services/sentry.ts`: `initSentry()` that early-returns if `__DEV__`; otherwise calls `Sentry.init({ dsn, sendDefaultPii: false, tracesSampleRate: 0, attachStacktrace: true, enableLogs: false, integrations: [] })`. DSN hardcoded (it's client-side, not a secret).
- `initSentry()` called from `index.ts` _before_ `registerRootComponent`, so providers and Sentry both initialise before any UI mounts
- `Sentry.wrap(App)` applied in `index.ts` (App.tsx exports `App` as a named export, so wrapping happens at the registration point, not in App.tsx)

**Verify:** `npx expo run:ios` — app boots, no Sentry events sent (DEV mode); flip a temporary local override and see one ping in Sentry.

**Commit:** `feat(native-rd): install @sentry/react-native with privacy-safe init`

---

### Step 3 — ~~Pseudonymous identity~~ 🚫 Dropped

Originally planned a UUID-only `Sentry.setUser({ id })` for de-duplication and feedback-correlation. Dropped 2026-05-04 — the UUID adds no value over Sentry's auto-generated `installation_id`:

- "N distinct users hit this crash" works without our UUID (Sentry's auto installation-id de-dupes)
- Crash-free user rate works without our UUID
- We have no way to map an opaque ID back to a human (no email, no name, no GitHub handle), so per-user filtering is unactionable
- #972 (feedback widget) ties feedback to recent events via session-id, not user-id

The right axis for our debugging is **context, not identity** — tags like `firstLaunch`, `theme`, build number, OS version. Those will be added if a specific crash needs them, not preemptively.

---

### Step 4 — Privacy filters (the load-bearing step)

- Add `beforeSend` to `Sentry.init`:
  - Drop events whose top error message matches offline noise (`NetworkError`, `AbortError`, `Network request failed`)
  - Drop events flagged `__DEV__`
  - Scrub `event.exception.values[].stacktrace.frames[].filename` of `/Users/<name>/` paths
  - Scrub `event.request.url` to host-only
- Add `beforeBreadcrumb`:
  - Drop `category: 'navigation'` breadcrumbs that contain route params (or strip the `data` field)
  - Scrub `category: 'xhr' | 'fetch'` URLs to host-only
  - Drop `category: 'console'` breadcrumbs (they leak whatever was logged)
- Sentry project settings (web UI, manual): enable IP suppression, enable default server-side data-scrubbers, add custom scrubber for `email`/`name` patterns
- Jest tests: feed synthetic PII payloads through `beforeSend`/`beforeBreadcrumb`, assert scrubbed output

**Commit:** `feat(native-rd): scrub PII from Sentry events + breadcrumbs`

---

### Step 5 — Sourcemap upload via EAS Build ✅ DONE (config), ⏳ pending build verification

- `@sentry/react-native/expo` plugin configured in `app.json` with `organization: "rollercoasterdev"` and `project: "native-rd"`
- `SENTRY_AUTH_TOKEN` set as a project-scoped EAS secret (auto-exposed as env var to all EAS builds)
- The plugin generates `ios/sentry.properties` + `android/sentry.properties` at prebuild time; both `ios/` and `android/` are gitignored, and the generated file uses `# Using SENTRY_AUTH_TOKEN environment variable` rather than embedding the token

**Pending verification (next EAS preview build):** force a JS error, confirm the Sentry stack shows TS filenames + line numbers (not Hermes bytecode offsets) and sourcemaps appear under Sentry → Releases → Artifacts.

**Commit:** `chore(native-rd): wire Sentry sourcemap upload via EAS Build`

---

### Step 6 — Run the privacy verification test plan

Execute every step from `privacy-verification.md` against an EAS preview build (not TestFlight):

- Fire each synthetic PII event
- Inspect Sentry event payload + breadcrumbs in the UI
- Inspect outbound network capture in mitmproxy
- Tick each pass criterion

**If any criterion fails:** loop back to Step 4, do not proceed. Update the test plan if you discover a new PII shape.

**Commit:** `docs(native-rd): record passing Sentry privacy verification run` (the test-plan doc gains a "Verification log" section with date, build, results)

---

### Step 7 — Forced crash + symbolicated trace verification

- Add a hidden trigger (long-press on a non-functional UI element in Settings, or a debug-menu entry gated by `__DEV__ || EAS_PREVIEW`)
- Use `Sentry.nativeCrash()` for native, plus a thrown `Error` for JS
- Run on a physical iPhone via EAS preview install
- Confirm both crashes land in Sentry with symbolicated traces within ~5 minutes

**Commit:** `chore(native-rd): debug-only forced-crash trigger for verification`

---

### Step 8 — Triage runbook

**File:** `apps/native-rd/docs/launch/crash-triage-runbook.md` (one page)

Sections:

- **Daily flow:** open Sentry → review new issues → label → file GitHub issue (or comment on existing if same signature)
- **Release gate:** top-3 crash signatures from build N-1 must each have a tracked GitHub issue before promoting build N → external testers
- **One-issue-per-signature** — Sentry's GitHub auto-link does the mechanical work; you decide when a new signature is "the same bug" vs. "actually different"
- **Label conventions:** `crash:native`, `crash:js-hermes`, `crash:reanimated`, `crash:launch`, `crash:flaky`
- **Fallback:** when Sentry SDK fails to start or a pre-init native crash happens — instructions to open Xcode → Window → Devices and Simulators → View Device Logs, or App Store Connect → TestFlight → Crashes

**Commit:** `docs(native-rd): crash triage runbook + release gate`

---

### Step 9 — Coordinate with #976 before TestFlight push

Before merging this branch and pushing a build to TestFlight:

- [ ] #976 PR open with privacy-policy update declaring "Crash Data" + "Performance Data, not linked to identity"
- [ ] App Privacy nutrition labels in App Store Connect updated to match
- [ ] Both #971 and #976 land in the same TestFlight build (or #976 lands first)

**This is a checklist item, not a commit.**

---

## Risks worth flagging upfront

- **Sentry config plugin runs on prebuild and modifies native projects.** Verify the existing iOS build pipeline (especially the recent EAS post-install hook in PRs #1009 / `1470241f`) still works after the plugin is added.
- **New Architecture compatibility.** `newArchEnabled: true` is on. Confirm the `@sentry/react-native` version installed has new-arch support; older versions silently no-op some hooks.
- **`__DEV__` is false in TestFlight.** The `!__DEV__` guard enables Sentry for testers (correct), but means local dev-build smoke tests need a temporary override to send events.
- **DSN ≠ auth token.** Easy to confuse. DSN is fine in `app.json`. Auth token is an EAS secret.
- **Breadcrumb scope creep.** Console, navigation, and AsyncStorage breadcrumbs are the biggest PII risk and the easiest to forget. Start aggressive (drop everything), relax later if signal is poor.

---

## Out of scope (explicit)

- In-app "Report a Bug" button via Sentry user feedback API — that's #972
- Public privacy policy hosting + nutrition-label submission — #976
- Android — same SDK, will reuse this work in Phase 7

---

## Definition of done

- Sentry receives crashes from EAS preview builds with symbolicated traces
- The privacy verification test plan has a passing run logged in `privacy-verification.md`
- `crash-triage-runbook.md` exists and explains the daily flow + release gate
- #976 is queued to land in or before the next TestFlight build that includes Sentry
