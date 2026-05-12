# Sentry Usage — Finish Planned Rollout

**Status:** Active
**Created:** 2026-05-12
**Branch:** `feat/issue-1021-sentry-bridge-and-breadcrumbs`
**Related:**

- `apps/native-rd/docs/plans/2026-05-06-sentry-usage-implementation.md` (predecessor — this finishes its rollout)
- `apps/native-rd/docs/plans/2026-05-04-sentry-integration.md` (epic, #971)
- `apps/native-rd/docs/launch/privacy-verification.md` (gate)
- `apps/native-rd/docs/launch/sentry-usage-concept.md` (design)
- Issue [#1021](https://github.com/rollercoaster-dev/monorepo/issues/1021) — breadcrumb call sites
- Issue [#1019](https://github.com/rollercoaster-dev/monorepo/issues/1019) — **explicitly out of scope** ("Sentry throughout the app is not a goal")

---

## Context

The user asked to "integrate Sentry throughout the app". That request directly contradicts the position recorded in issue #1019, which says coverage must be **narrow and data-driven after closed-beta triage**, not a priori. The user confirmed during planning that the actual intent is to **execute the remaining Planned work** from `2026-05-06-sentry-usage-implementation.md`, not blanket coverage.

A full audit of the codebase against the predecessor plan found the foundation is largely in place. Specifically already done:

- `Sentry.init` with hardened privacy posture, `__DEV__` gate, environment separation (`sentry.ts:36`)
- Privacy scrubbers including the `event.contexts` allowlist backstop (`sentry-filters.ts:61–67, 146–152`)
- Closed-enum `ReportContext` + `reportError` + `breadcrumb` API (`sentry-report.ts`)
- ErrorBoundary `componentDidCatch` → `reportError({ area: "render" })`
- `useUserKey` reporting at `key.verify` (`useUserKey.ts:102`) and `key.generate` (`useUserKey.ts:133`)
- `useCreateBadge` reporting at `badge.create` (`useCreateBadge.ts:301`) and `badge.create/store` (`useCreateBadge.ts:261`)
- `EXPO_PUBLIC_SENTRY_ENVIRONMENT` set per EAS profile + read by `Sentry.init`
- SettingsScreen long-press → `Sentry.nativeCrash()`, gated by `EXPO_PUBLIC_SENTRY_DEBUG_TOOLS` (`SettingsScreen.tsx:38, 85`)
- rd-logger shim with `findError` and bridge to `reportLoggerError` (`shims/rd-logger.js`)
- Expo config plugin + Metro `getSentryExpoConfig` for sourcemaps

Three items remain unfinished:

1. **Logger bridge is wired but the allowlist is empty.** `SCOPE_TO_AREA = {}` in `src/services/sentry-report.ts:80`, so every `logger.error(...)` call in the app no-ops at the Sentry boundary. Eighteen `new Logger(...)` scopes exist (full list under Key Changes §1).
2. **`breadcrumb()` has zero callers in product code.** All six closed-union categories (goal, step, evidence, badge, key, focus) are defined but unused. Issue #1021 tracks this.
3. **Privacy verification end-to-end run is `_pending_`** in `docs/launch/privacy-verification.md`. This is the documented gate before any TestFlight build ships.

This plan finishes those three items in the rollout order from the predecessor plan, lands them under issue #1021's umbrella (with #1021's scope broadened to include the bridge), and runs the verification gate.

---

## Pre-step 0: branch rename + plan relocation

Once plan mode exits:

1. Rename git branch:
   ```bash
   git branch -m feat/issue-1021-sentry-bridge-and-breadcrumbs
   git push origin -u feat/issue-1021-sentry-bridge-and-breadcrumbs
   # If the old branch was pushed: delete it on the remote
   ```
2. Move this plan into the repo (`AGENTS.md` forbids plans in `~/.claude/plans/`):
   ```bash
   mv ~/.claude/plans/continue-delegated-quilt.md \
      apps/native-rd/docs/plans/2026-05-12-sentry-usage-finish.md
   ```
3. Update issue #1021 title to "add Sentry logger bridge registrations + breadcrumb call sites" so it accurately scopes the PR.

---

## Key Changes

### 1. Logger `SCOPE_TO_AREA` registration

Audit each `new Logger("...")` scope and allowlist only those whose `logger.error(...)` call sites produce safe `Error.message` content (after `scrubEvent` already redacts emails, sandbox paths, URI schemes). Add each mapping in `src/services/sentry-report.ts:80`. **Do not** map the default `"app"` scope.

**Critical exclusions (deliberate, to avoid double-reporting):** `useUserKey`, `useCreateBadge` — they already call `reportError` directly (see `sentry-report.ts:76–78` comment).

Full inventory of scopes found in `src/`. Audit decisions recorded as commits land.

| Scope                             | Status (as of 2026-05-12)       | Final mapping                 | Audit outcome / commit                                                                                                                                                                                                                             |
| --------------------------------- | ------------------------------- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `useFocusModePrefs`               | ✅ Allowlisted                  | `focus.mode`                  | Commit `f78b2c93`. Two `logger.error` sites; line 16 (no Error) had Error attached so `findError` picks it up. Line 24 already had `{ error }`.                                                                                                    |
| `evidenceCleanup`                 | ✅ Allowlisted                  | `evidence.cleanup`            | Commit `f78b2c93`. One `logger.error` with `{ error }`. URIs in meta dropped by shim; URI in `Error.message` caught by `URI_SCHEME_PATTERN` scrubber.                                                                                              |
| `crypto` (SecureStoreKeyProvider) | ❌ Not allowlisted (deliberate) | n/a                           | `isAvailable()` swallow is graceful degradation (concept doc §6.4). `generate/getPublicKey/sign` throws propagate to `useUserKey`/`useCreateBadge` which already call `reportError` directly (§6.1). Allowlisting would double-report or be no-op. |
| `useAllEvidenceForGoal`           | ❌ Not allowlisted (deliberate) | n/a                           | Only `logger.warn` calls for data-shape fallbacks. Matches §6.4 graceful-degradation pattern. Revisit if beta surfaces schema-drift bugs.                                                                                                          |
| `db.queries`                      | ✅ Allowlisted (renamed)        | `db.write`                    | Commit `2d3fc3a5`. Renamed `new Logger()` → `new Logger("db.queries")`. New ReportContext member `{ area: "db.write" }` because db.queries spans 5 entity types (goal/step/evidence/badge/settings) — no single existing area was honest.          |
| `evidenceViewers`                 | ✅ Allowlisted                  | `evidence.view` (no kind)     | This commit. Handles both link and file open paths so omits `kind`. Scrubber catches expo URI patterns.                                                                                                                                            |
| `VideoContent`                    | ✅ Allowlisted                  | `evidence.view`, kind:`video` | This commit. Playback subscribe error.                                                                                                                                                                                                             |
| `PhotoContent`                    | ✅ Allowlisted                  | `evidence.view`, kind:`photo` | This commit. `<Image>` onError event.                                                                                                                                                                                                              |
| `LinkContent`                     | ✅ Allowlisted                  | `evidence.view`, kind:`link`  | This commit. Unhandled rejection from `openLinkInBrowser`.                                                                                                                                                                                         |
| `FileContent`                     | ✅ Allowlisted                  | `evidence.view`, kind:`file`  | This commit. Unhandled rejection from `openFile`.                                                                                                                                                                                                  |
| `useFirstLaunch`                  | ⏳ Skip                         | n/a                           | Boot-path; rare; not actionable in Sentry                                                                                                                                                                                                          |
| `BadgeDesignerScreen`             | ⏳ Audit pending                | TBD                           | Read each `logger.error` site first                                                                                                                                                                                                                |
| `CompletionFlowScreen`            | ⏳ Skip                         | n/a                           | Captured upstream via `useCreateBadge`'s direct `reportError`                                                                                                                                                                                      |
| `FocusModeScreen`                 | ⏳ Audit pending                | `focus.mode` (probable)       |                                                                                                                                                                                                                                                    |
| `GoalsScreen`                     | ⏳ Skip                         | n/a                           | Render path — already covered by ErrorBoundary                                                                                                                                                                                                     |
| `ViewerThumbnailStrip`            | ⏳ Skip                         | n/a                           | UI render; not actionable                                                                                                                                                                                                                          |

**New ReportContext members added by this work:**

- `{ area: "db.write" }` — for `db.queries` scope (commit `2d3fc3a5`)
- `{ area: "evidence.view"; kind?: EvidenceTypeValue }` — for view-side evidence failures (this commit)

Both added to concept doc §3.1 as revisions dated 2026-05-12.

**Audit method per scope** (codify this as a checklist in the PR description):

1. Grep `logger.error` in that file
2. For each call site, identify the Error source
3. If `Error.message` is a categorical native/library error string (e.g. `"Permission denied"`, `"File not found"`), allowlist it
4. If `Error.message` may include user content the scrubber doesn't cover, do **not** allowlist — leave the failure visible only as a breadcrumb trail

Test discipline: each allowlist entry gets a unit test in `src/services/__tests__/sentry-report.test.ts` that proves the scope maps to the right area tag.

### 2. Breadcrumb call sites (issue #1021)

Wire `breadcrumb(...)` at phase boundaries. One breadcrumb per phase per user-visible event, never per-keystroke/per-frame/per-list-item. The closed union enforces structural privacy; volume discipline is a separate concern.

| Category / message                                         | Call site (initial guess; confirm during implementation)                                                    |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `goal.create` / `update` / `delete` / `complete`           | Goal mutation hooks / `GoalsScreen` action handlers                                                         |
| `step.create` / `update` / `delete` / `reorder` / `toggle` | Step mutation hooks                                                                                         |
| `evidence.start` / `save` / `discard`                      | Each `CaptureXScreen` save/discard handler                                                                  |
| `badge.build` / `sign` / `bake` / `store`                  | `useCreateBadge` — emit **before** each phase so a thrown error's preceding breadcrumb identifies the phase |
| `key.generate` / `verify`                                  | `useUserKey` — emit before each operation                                                                   |
| `focus.enter` / `exit`                                     | `FocusModeScreen` mount/unmount or explicit user toggles                                                    |

Ordering rule: emit the breadcrumb **before** the work, not after. If the work throws, the breadcrumb is already on the trail.

### 3. Privacy verification end-to-end run

After items 1+2 land, execute every row of `apps/native-rd/docs/launch/privacy-verification.md` against an EAS preview build. Record a row in the Verification Log table at the bottom of that doc with date, `CFBundleVersion`, Sentry release ID, and result.

This is a gate, not code — but it's the final precondition before any build with Sentry can be promoted past EAS preview to TestFlight (per #971 and #976).

---

## Critical files

| File                                                                                | Change                                                                                                                          |
| ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `apps/native-rd/src/services/sentry-report.ts`                                      | Add `SCOPE_TO_AREA` entries; possibly add new `ReportContext` areas (e.g. `crypto.io`) if logger scopes don't fit existing enum |
| `apps/native-rd/src/services/__tests__/sentry-report.test.ts`                       | One test per new allowlist entry; existing closed-enum invariants must still pass                                               |
| `apps/native-rd/src/db/queries.ts`                                                  | `new Logger()` → `new Logger("db.queries")` (only if db scope is allowlisted)                                                   |
| `apps/native-rd/src/hooks/useCreateBadge.ts`                                        | `breadcrumb({ category: "badge", message: ... })` before build / sign / bake / store                                            |
| `apps/native-rd/src/hooks/useUserKey.ts`                                            | `breadcrumb({ category: "key", message: "generate" \| "verify" })`                                                              |
| `apps/native-rd/src/screens/FocusModeScreen/FocusModeScreen.tsx`                    | `breadcrumb({ category: "focus", message: "enter" \| "exit" })`                                                                 |
| `apps/native-rd/src/screens/Capture*Screen/*.tsx` (5 screens)                       | `breadcrumb({ category: "evidence", message: "start" \| "save" \| "discard", kind })`                                           |
| `apps/native-rd/src/screens/GoalsScreen/GoalsScreen.tsx` + goal/step mutation hooks | `breadcrumb({ category: "goal" \| "step", message: ... })`                                                                      |
| `apps/native-rd/docs/launch/privacy-verification.md`                                | Append Verification Log row after EAS preview run                                                                               |

---

## Existing utilities to reuse (do not rewrite)

- `reportError(error, ctx)` — `src/services/sentry-report.ts:56`. Only sanctioned exception path.
- `reportLoggerError(scope, err)` — `src/services/sentry-report.ts:85`. Bridge entry. Driven by `SCOPE_TO_AREA`.
- `breadcrumb(b)` — `src/services/sentry-report.ts:120`. Closed-union; hides `Sentry.addBreadcrumb`.
- `findError(args)` — `src/shims/rd-logger.js:14`. Extracts first `Error` from logger args including nested `.error` / `.cause`. Do not rewrite.
- `scrubEvent` / `beforeBreadcrumbFilter` — `src/services/sentry-filters.ts`. The privacy backstop. Never bypass.
- `Sentry.wrap(App)` + ErrorBoundary `componentDidCatch` — render-path errors already covered.

---

## Rollout order (atomic commits / commit sequence on the renamed branch)

| #   | Status     | Commit     | Subject                                                                                                                                                  |
| --- | ---------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | ✅ done    | `213c48a6` | `chore(native-rd): add 2026-05-12 sentry-usage-finish plan + index entry` (branch already renamed; plan relocated; #1021 title broadening still pending) |
| 2   | ✅ done    | `f78b2c93` | `feat(native-rd): allowlist useFocusModePrefs + evidenceCleanup in Sentry logger bridge` (crypto deliberately excluded per audit — see table above)      |
| 3   | ✅ done    | `2d3fc3a5` | `feat(native-rd): rename db Logger scope and allowlist db.queries -> db.write`                                                                           |
| 4   | ✅ done    | `d3e816a5` | `feat(native-rd): allowlist evidence view scopes via new evidence.view area` + concept doc updates                                                       |
| 5   | ✅ done    | `f8b03903` | `feat(native-rd): add badge-phase breadcrumbs in useCreateBadge`                                                                                         |
| 6   | ✅ done    | `97df6e54` | `feat(native-rd): add key-phase breadcrumbs in useUserKey`                                                                                               |
| 7   | ✅ done    | `492b0312` | `feat(native-rd): add focus-mode enter/exit breadcrumbs`                                                                                                 |
| 8   | ✅ done    | `25faf4c7` | `feat(native-rd): add goal/step mutation breadcrumbs in db queries`                                                                                      |
| 9   | ✅ done    | `eadb2386` | `feat(native-rd): add evidence capture breadcrumbs (start + save)`                                                                                       |
| 10  | ⏳ pending | (manual)   | `docs(native-rd): log passing Sentry privacy verification run on EAS preview build N`                                                                    |

**Remaining manual steps before this plan can close:**

1. **Broaden issue #1021 title** to reflect the wider scope it now covers. Original title only mentions breadcrumbs; the merged PR also covers the bridge allowlist work.
2. **Push branch** + open PR against `main`.
3. **Run privacy verification** end-to-end on an EAS preview build per `apps/native-rd/docs/launch/privacy-verification.md` and append the Verification Log row.
4. **Audit `BadgeDesignerScreen` and `FocusModeScreen` loggers** (still marked "audit pending" in the table above) — separate follow-up commits or fold into a later PR.

---

## Test plan

### Unit (per commit)

- `bun test src/services/__tests__/sentry-report.test.ts` — closed-enum invariants + new mappings
- `bun test src/shims/__tests__/rd-logger.test.ts` — existing bridge tests must still pass
- For each breadcrumb call site: mount the component / call the hook, perform the action, assert `Sentry.addBreadcrumb` was invoked with the expected `category`/`message`/`data` shape
- For each newly-allowlisted scope: pass an Error to `reportLoggerError("<scope>", err)`; assert `area`/`kind` tags

### Type + lint (per commit)

```
bun run type-check
bun run lint
```

### Manual on EAS preview (capstone)

1. Build EAS preview with `EXPO_PUBLIC_SENTRY_ENVIRONMENT=preview` and `EXPO_PUBLIC_SENTRY_DEBUG_TOOLS=true` (already in `eas.json`).
2. Install on physical iPhone via the build link.
3. Trigger Settings Version long-press → confirm `Sentry.nativeCrash` event in Sentry, tagged `environment:preview`.
4. Walk through goal create → step add → evidence capture → badge earn → focus enter/exit. Force one error in each path (e.g. revoke a permission mid-flow). For each captured event in Sentry:
   - Confirm breadcrumb trail shows the preceding phase
   - Confirm no PII strings (cross-check the mitmproxy capture per `privacy-verification.md`)
   - Confirm `area`/`kind` tags
5. Run every row of `privacy-verification.md` and append the Verification Log row.

---

## Assumptions / explicit out-of-scope

- **`reactNavigationIntegration` is not added.** Privacy risk (route params in breadcrumbs) + transactions would be no-ops under `tracesSampleRate: 0`. Absence is intentional.
- **`Sentry.setUser` / installation_id** remains untouched (Step 3 of #971 dropped this).
- **`SENTRY_AUTH_TOKEN` EAS secret** is assumed configured per #971 Step 5. If sourcemaps don't appear after the next preview build, raise a separate ticket — not part of this plan.
- **Feedback widget / in-app bug report (#972), DeveloperScreen (#1022), Android crash verification (#1027), TestFlight crash triage workflow polish (#1012)** — separate issues, separate PRs.
- **"Sentry throughout the app" coverage (#1019)** — deferred to post-beta triage per its own acceptance criteria.
- **Privacy policy + nutrition label update (#976)** — separate, must land before any TestFlight build that contains Sentry.
- This plan does **not** add new integrations or change `Sentry.init` options.

---

## Verification (definition of done)

- Every commit on the renamed branch is buildable, type-checks, lints, and passes its scoped tests.
- An EAS preview build emits at least one event per closed-union breadcrumb category during the manual walkthrough.
- `docs/launch/privacy-verification.md` Verification Log has one row with `Result: pass` for the build containing all commits.
- PR #1021 (rescoped) merges, closes #1021, references #971 as parent.
- No commits land on `main` directly (per `.claude/rules/commit-rules.md`).
