# User Testing Prep — iOS First, Android Soon

**Created:** 2026-05-02
**Owner:** Joe
**Goal:** Get native-rd into the hands of real testers (iOS TestFlight first, Google Play closed test soon after) without compromising the "no data collected" privacy promise.

---

## The Single Next Thing

> **Stabilize the closed-beta feedback loop.**
> Before broad invites, every tester path needs a way to report problems and every crash path needs to be observable enough to act on.

Order of work as of 2026-05-08:

1. Land the current Android build pipeline PR, treating unrelated repo-wide CI coverage hangs as external blockers rather than native-rd work.
2. Work the serial execution queue below from top to bottom.
3. Do not start later cleanup, full i18n, or feature requests until the current queue item is closed or intentionally skipped.

---

## Current Strategy — 2026-05-08

Everything outside `apps/native-rd` is paused unless it directly blocks native-rd user testing.

### Release Readiness Priorities

| Priority | Workstream                                       | Outcome                                                                                       | Tracking                                     |
| -------- | ------------------------------------------------ | --------------------------------------------------------------------------------------------- | -------------------------------------------- |
| P0       | Observability + feedback                         | Crashes and tester reports can be captured, scrubbed, and converted into actionable issues    | #971 closed, #972 open, Android Sentry TBD   |
| P0       | Known beta-blocking bugs                         | Core flows do not trap testers or make local data/badges feel unreliable                      | Create issues from Joe's bug list            |
| P1       | Real-device validation                           | iPhone production-like build is tested against camera, mic, persistence, badge export, crash  | #975                                         |
| P1       | Minimal German path                              | German testers can complete the main flow without hitting English-only critical UI everywhere | #988 foundation, narrower German slice TBD   |
| P1       | Quality refresh                                  | We know which stale quality items block beta and which can wait                               | #977                                         |
| P2       | Feature request intake                           | User requests are captured without derailing beta stabilization                               | New issue label/process, no default build-in |
| Paused   | Broad i18n, OB3 verifier parity, non-native work | Valuable, but not required for first user testing unless a tester blocker proves otherwise    | Existing milestones/issues                   |

### Serial Execution Queue

There is one active work slot. Work this queue from top to bottom; do not run these in parallel. If an item is skipped, leave a comment on the issue explaining why and move to the next item.

| Order | Issue/PR                                             | Why now                                                                                       | Done when                                                                      |
| ----- | ---------------------------------------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| 0     | PR #1025 Android build pipeline                      | Clears the current native-rd Android build work already in review                             | PR is merged or explicitly parked                                              |
| 1     | #1022 DeveloperScreen for debug tools                | Gives us a stable, gated place for crash/test-event actions before deeper Sentry verification | Dev tools are reachable only in dev/preview and dangerous actions stay gated   |
| 2     | #1027 Android Sentry crash delivery                  | Android currently is not sending crash reports; fix this before Android testers               | A production-like Android crash appears in Sentry with safe metadata           |
| 3     | #1021 Sentry breadcrumb call sites                   | Makes crash/user reports actionable without collecting user content                           | Core flows emit closed-enum, non-identifying breadcrumbs                       |
| 4     | #972 In-app Report a Bug                             | Gives testers a structured feedback path beyond platform screenshot feedback                  | Settings has a tested feedback flow wired to Sentry                            |
| 5     | #1028 Bug + feature request intake                   | Lets Joe turn known bugs and tester feedback into consistently triaged issues                 | Labels/template/script exist and are linked from this plan                     |
| 6     | #984 Atomic SecureStore key writes                   | Prevents half-written badge signing keys before testers hit badge completion                  | Key writes are all-or-nothing and covered by tests                             |
| 7     | #982 Badge creation error state                      | Prevents users from getting stuck in endless loading if key setup fails                       | Completion flow surfaces a clear error instead of hanging                      |
| 8     | #1026 Focus-mode evidence fixes                      | Fixes known core-flow mismatches in step completion and evidence capture                      | Focus mode evidence gating, quick actions, and accessibility are aligned       |
| 9     | #943 Persist theme switching                         | Avoids a visible personalization/settings regression across app restarts                      | Selected supported theme survives restart                                      |
| 10    | #975 Physical iPhone validation                      | Confirms production-like iOS behavior on real hardware before external invites                | Camera/photo/mic/persistence/badge/export/crash paths are checked              |
| 11    | #977 Quality dashboard refresh                       | Re-checks stale high-severity debt before widening the beta                                   | Open HIGH items are classified as blocker or acceptable beta risk              |
| 12    | #988 i18n foundation                                 | Prepares translations without starting broad string migration prematurely                     | i18n infrastructure, language selection, pseudo locale, and tests are in place |
| 13    | #1029 Minimal German first-test path                 | Makes the main beta flow usable for German testers                                            | German covers the first-test path; full app translation remains later          |
| 14    | #978 Google Play closed-test setup                   | Starts Android distribution only after crash visibility and core blockers are handled         | Closed-test setup is ready and the 14-day clock is started intentionally       |
| 15    | #936 Remove dead chrome composition                  | Low-risk cleanup after beta blockers are under control                                        | Unused native-rd chrome wiring is removed                                      |
| 16    | #983 Delete unrouted TestScreen                      | Removes dead code after tester-critical paths are stable                                      | TestScreen is gone and tests/type-check still pass                             |
| 17    | #961 Prune unused dependencies/dead code             | Reduces maintenance cost after launch-critical work                                           | Fallow findings are reviewed and safe removals are done                        |
| 18    | #960 Badge matrix Storybook/visual snapshot decision | Useful visual coverage, but not a first-tester blocker                                        | Decision and/or coverage lands without blocking beta                           |

Stop after order 13 to invite the first tiny iOS cohort if iPhone validation and quality triage say the risk is acceptable. Continue to order 14 before inviting Android testers.

### First Tester Entry Criteria

Invite the first tiny TestFlight cohort only after:

- iOS crash reporting has been verified from an installed TestFlight build.
- There is a clear bug-reporting route: TestFlight screenshot feedback and/or in-app Sentry feedback.
- P0 known bugs are either fixed or documented as acceptable beta risks.
- Badge completion does not leave users stuck in an endless loading state if signing key setup fails (#982).
- A short "what to test" script exists so testers exercise goals, evidence capture, focus mode, badge creation, export, settings, and feedback.

Android testers wait until:

- Android Sentry crash reporting is verified from a production-like Android build.
- Google Play closed-test setup is ready enough to start the 14-day clock intentionally.
- The same P0 known bugs have been cleared or accepted.

### Minimal German Path

German support is useful for local testing, but full app translation should not block the first beta. The recommended cut is:

1. Land i18n foundation (#988): dependencies, `src/i18n/`, language selection, pseudo locale, tests.
2. Translate only the first-test path:
   - onboarding / welcome
   - goals list and goal creation
   - focus mode and step completion
   - evidence capture labels and errors
   - badge completion
   - settings basics, including feedback
3. Defer badge designer, developer/debug tools, edge-case admin copy, and full pseudo-locale snapshot coverage until after the first tester loop.

### Bug + Feature Intake

Use one issue per actionable item. During user testing, every issue should answer: "Does this block testing, degrade testing, or wait?"

Bug labels:

- `app:native-rd`
- `type:bug`
- `source:user-testing` when found by testers
- `priority:critical` only for data loss, unrecoverable stuck states, or app launch blockers
- `priority:high` for common core-flow failures
- `beta-blocker` for issues that must be fixed before inviting or expanding testers
- `needs-triage` until severity and next action are decided

Feature request labels:

- `app:native-rd`
- `type:feature-request`
- `source:user-testing`
- `needs-triage`
- `priority:later` by default

Feature requests should not be implemented during beta stabilization unless they remove a testing blocker. Capture them, link any supporting tester quotes or scenarios, and revisit after the first feedback loop.

---

## Bug Reporting Strategy

**Closed beta uses platform built-ins for tester feedback, plus Sentry (privacy-scrubbed) for symbolicated crash reports.** Reversed 2026-05-04 — Sentry is compatible with the no-PII promise when configured deliberately (UUID-only identity, `sendDefaultPii: false`, `beforeSend`/`beforeBreadcrumb` scrubbing, IP suppression, `tracesSampleRate: 0`). See #971.

| Channel         | Tool                                                                                                                         | Privacy posture                                                                                |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| iOS testers     | TestFlight 3-finger screenshot feedback + automatic crash reports → App Store Connect                                        | Apple collects under their privacy terms; testers accepted these when joining TestFlight       |
| Android testers | Play Console built-in tester feedback + automatic crash reports                                                              | Google collects under their privacy terms; testers accepted these when joining the closed test |
| Crash reporting | Sentry (UUID-only identity, scrubbed events) — symbolicated JS stacks via Hermes sourcemap upload                            | iOS is set up; Android crash delivery still needs verification/fix before Android testers      |
| Privacy policy  | Updated to declare _Crash Data_ + _Performance Data_ not linked to identity (App Privacy nutrition labels) — handled in #976 | Honest and accurate after #976 lands                                                           |

**Current decision:**

- Add in-app feedback if we want a cross-platform route that is easier to turn into GitHub issues than platform screenshot feedback alone (#972).
- Keep platform feedback enabled either way because screenshots and OS/device context are useful during closed testing.

---

## Status Snapshot

**Readiness review, 2026-05-02:** not ready to invite testers yet. The main blocker is build/distribution prep: EAS is not initialised, no standalone TestFlight build exists, and no physical-device validation has been completed. Local code health is acceptable for closed-beta prep (`type-check`, Jest, lint with warnings only, and a11y audit passed), but the installed simulator build used for E2E review was a dev build without an embedded JS bundle, so Maestro failed at launch with "No script URL provided." Treat E2E as unverified until a production-like build is installed.

The only non-build app-behavior blocker found in this review is badge creation when signing key setup fails: `useUserKey` can surface SecureStore/key-generation errors while `useCreateBadge` remains in transient loading. Track in [#982](https://github.com/rollercoaster-dev/monorepo/issues/982).

| Area                      | State                   | Notes                                                                                                                                                                  |
| ------------------------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Apple Developer Program   | ✅ Enrolled             | Confirmed 2026-05-02                                                                                                                                                   |
| Crash / bug reporting     | ✅ Covered by platforms | TestFlight (iOS) + Play Console (Android) — no in-app code needed                                                                                                      |
| TestFlight build pipeline | 🟡 In progress          | EAS initialised; `eas.json` added; dev cloud build verified. First production build + `eas submit` still pending.                                                      |
| App Store Connect record  | ❌ Not started          | Bundle ID, slug, display name still TBD                                                                                                                                |
| Privacy policy            | 🟡 Drafted, unhosted    | `docs/launch/privacy-policy.md` — needs platform-disclosure sentence + contact email + public URL                                                                      |
| Quality dashboard         | 🟡 Stale                | `docs/quality/grades.md` last updated 2026-02-28 — 2 months old, much has shipped since                                                                                |
| Foundations review        | 🟡 Stale                | Same — see `docs/quality/foundations-review-phase1.md`                                                                                                                 |
| Tech debt log             | 🟡 Stale                | 5 HIGH-severity items still listed OPEN; need re-verification                                                                                                          |
| Badge creation error path | 🟡 Issue opened         | [#982](https://github.com/rollercoaster-dev/monorepo/issues/982) — avoid endless loading if signing key setup fails                                                    |
| Google Play account       | 🟡 In progress          | Signup form filled 2026-05-07; awaiting Google ID verification (24–48 h async). Personal account €25 + 14-day / 12-tester closed test still required                   |
| Android build pipeline    | ✅ DONE 2026-05-07      | Local emulator dev-client (Pixel 6a / API 35) and EAS preview APK both green. Commits `f245fd1f`, `2d2e46b4`, `64176f14`, `cbeee3ef` on `feat/native-rd-android-setup` |

---

## Phases

Each phase has **one clear deliverable**. Supporting prep (privacy policy, quality refresh) can run in parallel as long as it doesn't complete a later phase's deliverable.

### Phase 0 — Apple Developer Program ✅ DONE

- [x] Enrolment approved

### Phase 3 — TestFlight build pipeline ✅ DONE 2026-05-03

Three focused sittings. See `docs/plans/2026-04-28-ios-testflight-readiness.md` for granular Apple admin steps.

> **Note on phase numbering:** Phases 1 and 2 (Sentry + in-app bug button) were dropped on 2026-05-02, then reinstated on 2026-05-04 once Sentry was confirmed compatible with the no-PII promise (UUID-only identity, scrubbing, IP suppression). Phases run in parallel with Phase 3+ rather than blocking it.

> **Closure note (2026-05-03):** Internal testing is live with crashes flowing into App Store Connect → TestFlight → Crashes, so #973 and #974 are closed. The unchecked items below are kept for historical reference; the small follow-ups (display name, ASC App ID placeholder in `eas.json`) are tracked in the new triage issue #1012 or roll into Phase 5.

#### Sitting A — Decisions only (no tooling)

- [x] Confirm iOS bundle ID: `dev.rollercoaster.app` — rebranded in PR #1011 (2026-05-03)
- [x] Confirm Expo slug: `rollercoasterdev` — set during `eas init` 2026-05-02 (project ID `d7a5b9b4-48b0-460b-ab51-912e11cebd10`, owner `rollercoasterdev`)
- [ ] Confirm App Store display name spelling/capitalisation
- [ ] Choose feedback contact email (used in TestFlight metadata + privacy policy)
- [x] Decide build/version strategy — `autoIncrement: true` on production profile in `eas.json`

#### Sitting B — EAS Build ✅

- [x] `eas login`
- [x] `eas init`
- [x] Add `eas.json` with development + production profiles (PR #985)
- [x] Let EAS manage iOS signing credentials
- [x] Produce first iOS production-profile build

#### Sitting C — App Store Connect + first submission ✅

- [ ] Create App Store Connect app record
- [ ] Beta app description drafted
- [ ] What-to-test instructions drafted
- [ ] Export compliance answered
- [ ] Privacy nutrition labels filled (declare no data collection by us; TestFlight's collection is Apple's, not ours)
- [ ] Internal testing group created
- [ ] First TestFlight submission via `eas submit --platform ios`

### Phase 4 — Device validation (real iPhone)

- [ ] Production-like build installed on physical iPhone
- [ ] Camera evidence flow
- [ ] Photo library evidence flow
- [ ] Voice memo evidence flow
- [ ] Local DB persistence across app restart
- [ ] Badge creation/export flow
- [ ] App icon + splash verified
- [ ] Force a deliberate test crash; confirm it appears in App Store Connect → TestFlight → Crashes

### Phase 5 — Privacy + legal (parallel with Phase 3, before submission)

**The 14-day clock for Phase 7 starts when you create the closed track in Play Console — not before. Phase 5 can complete independently of Phase 7.**

- [ ] Add platform-disclosure sentence to `docs/launch/privacy-policy.md`: "If you install via TestFlight or Google Play, those platforms collect crash reports under their own privacy policies."
- [ ] Add contact email to `docs/launch/privacy-policy.md`
- [ ] Host privacy policy publicly (`https://rollercoaster.dev/privacy` or similar)
- [ ] Permission copy reviewed (camera, photos, microphone)
- [ ] Encryption / export compliance reviewed (local crypto, secure storage, badge signing)

### Phase 6 — Quality dashboard refresh (parallel, before inviting testers)

**Deliverable:** know what you're actually shipping. Current grades are 2 months old.

- [ ] Run `/quality-score` to refresh `docs/quality/grades.md`
- [ ] Re-verify open items in `docs/quality/tech-debt.md` (5 HIGH-severity tests still listed; some may be resolved by recent PRs)
- [ ] Decide which HIGH-severity items block first invite vs. which are acceptable in beta

### Phase 7 — Android (after first iOS testers are running)

**Build pipeline complete 2026-05-07.** Distribution side blocked on Google Play account verification.

- [x] Android EAS profile + first build — `eas.json` `preview` profile produces a signed APK; verified 2026-05-07 (build #3, commit `2d2e46b4`, ~33 min). Local emulator dev-client also green (Pixel 6a / API 35, Gotchas 7/8/9/10 captured in `native-rd-build` skill).
- [🟡] Google Play Console personal account (~€25) — signup form filled 2026-05-07; awaiting Google ID verification (asynchronous, 24–48 h).
- [ ] `play-service-account.json` generated + saved to `apps/native-rd/` (gitignored). Required for `eas submit`. Depends on Play Console access.
- [ ] Closed testing track created in Play Console — **the 14-day clock starts here**
- [ ] Recruit 12 testers (Google Group / email list, opt-in)
- [ ] Testers stay opted in for 14 consecutive days
- [ ] First `eas submit --platform android --profile production` (uploads AAB to Internal Testing track)
- [ ] Apply for production access after 14 days

See `docs/launch/app-store-launch-plan.md` for the full Google Play context.
See `apps/native-rd/.claude/skills/native-rd-build/SKILL.md` (v2.3.0+) for the local + EAS Android build playbook.

### ~~Phase 8 — Crash triage workflow~~ 🚫 Closed 2026-05-04 — absorbed into Phase 1

The DIY symbolication tooling (sourcemap archive, `metro-symbolicate` skill, build-number index) is made redundant by Sentry's automatic sourcemap upload + server-side symbolication. The non-tooling pieces that survived — release-gate policy, one-issue-per-signature discipline, label conventions, TestFlight Organizer fallback note — are folded into #971 as a single `docs/launch/crash-triage-runbook.md` deliverable.

#1012 closed with a full breakdown of what was dropped vs. absorbed.

---

## Tracked Issues

All open phases are tracked as GitHub issues under milestone [**`native-rd: User Testing Prep`**](https://github.com/rollercoaster-dev/monorepo/milestone/29) on project board #11 (Monorepo Development). One issue per atomic deliverable, scoped to fit a single PR.

| Phase        | Issue                                                            | Title                                                                       |
| ------------ | ---------------------------------------------------------------- | --------------------------------------------------------------------------- |
| 1            | [#971](https://github.com/rollercoaster-dev/monorepo/issues/971) | feat(native-rd): integrate Sentry for crash reporting (UUID-only, scrubbed) |
| 2            | [#972](https://github.com/rollercoaster-dev/monorepo/issues/972) | feat(native-rd): in-app Report a Bug button via Sentry feedback API         |
| 4            | [#975](https://github.com/rollercoaster-dev/monorepo/issues/975) | chore(native-rd): physical iPhone validation pass                           |
| 5            | [#976](https://github.com/rollercoaster-dev/monorepo/issues/976) | docs(native-rd): host privacy policy publicly + finalise contact email      |
| 6            | [#977](https://github.com/rollercoaster-dev/monorepo/issues/977) | chore(native-rd): refresh quality dashboard + tech-debt re-verification     |
| 7            | [#978](https://github.com/rollercoaster-dev/monorepo/issues/978) | chore(native-rd): Google Play closed-test setup + 14-day clock start        |
| App behavior | [#982](https://github.com/rollercoaster-dev/monorepo/issues/982) | fix(native-rd): prevent badge creation from hanging when key setup fails    |

**Closed:**

- [#973](https://github.com/rollercoaster-dev/monorepo/issues/973) EAS Build setup + first iOS production build — pipeline operational, builds reaching TestFlight (closed 2026-05-03)
- [#974](https://github.com/rollercoaster-dev/monorepo/issues/974) App Store Connect record + first TestFlight submission — internal testing live with active crash reports (closed 2026-05-03)
- [#1012](https://github.com/rollercoaster-dev/monorepo/issues/1012) TestFlight crash triage workflow + Hermes symbolication — made redundant by Sentry; runbook + release-gate items absorbed into #971 (closed 2026-05-04)

---

## Open Decisions (block specific phases)

| Decision                                 | Blocks       | Default if undecided                       |
| ---------------------------------------- | ------------ | ------------------------------------------ |
| Bundle ID `dev.rollercoaster.app` final? | Phase 3B     | Keep as-is                                 |
| ~~Expo slug~~ resolved 2026-05-02        | —            | `rollercoasterdev` (set during `eas init`) |
| Display name capitalisation              | Phase 3C     | `Rollercoaster.dev`                        |
| Feedback contact email                   | Phase 3C + 5 | TBD                                        |
| Privacy policy host URL                  | Phase 5      | TBD                                        |

---

## Related Docs

- `docs/plans/2026-04-28-ios-testflight-readiness.md` — granular TestFlight admin checklist (referenced by Phase 3)
- `docs/launch/app-store-launch-plan.md` — full iOS + Google Play launch strategy
- `docs/launch/privacy-policy.md` — privacy policy draft (needs platform-disclosure sentence — Phase 5)
- `docs/quality/grades.md` — quality dashboard (stale, refreshed in Phase 6)
- `docs/quality/tech-debt.md` — known debt log (stale, refreshed in Phase 6)
- `docs/quality/foundations-review-phase1.md` — Feb 2026 codebase health review (stale)

---

## Update Log

| Date       | Change                                                                                                                                                                                                                                                                                                                                                                  | By           |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| 2026-05-02 | Doc created. Phase 0 confirmed done. Phase 1 selected as next focus.                                                                                                                                                                                                                                                                                                    | Joe + Claude |
| 2026-05-02 | Milestone #29 + 8 issues (#971–#978) created and linked to project #11.                                                                                                                                                                                                                                                                                                 | Joe + Claude |
| 2026-05-02 | Dropped Phases 1 (Sentry) and 2 (in-app bug button) — incompatible with the "no data collected" privacy promise. Closed #971 and #972. Bug reporting now relies on TestFlight + Play Console built-ins.                                                                                                                                                                 | Joe + Claude |
| 2026-05-02 | User-testing readiness review: build/distribution prep remains the primary blocker; local gates pass; E2E unverified on standalone build; opened #982 for the one non-build badge creation blocker.                                                                                                                                                                     | Codex        |
| 2026-05-02 | Status snapshot updated: TestFlight build pipeline now 🟡 In progress (EAS initialised, `eas.json` added in PR #985, dev cloud build verified). Production build + `eas submit` still pending.                                                                                                                                                                          | Joe + Claude |
| 2026-05-03 | Internal testing live; crashes flowing into TestFlight. Closed #973 (EAS Build) and #974 (ASC + first submission). Added Phase 8 — crash triage workflow tracked in #1012.                                                                                                                                                                                              | Joe + Claude |
| 2026-05-04 | Sentry policy reversed: compliant with no-PII promise via UUID-only identity, IP suppression, breadcrumb scrubbing, and a documented privacy verification test. Reopened #971 + #972.                                                                                                                                                                                   | Joe + Claude |
| 2026-05-04 | Phase 8 / #1012 closed — made redundant by Sentry. Surviving non-tooling pieces (release-gate policy, one-issue-per-signature discipline, TestFlight Organizer fallback note) folded into #971 as a single `crash-triage-runbook.md` deliverable.                                                                                                                       | Joe + Claude |
| 2026-05-07 | Phase 7 build pipeline complete: local Android emulator dev-client and EAS preview APK both green. Four commits on `feat/native-rd-android-setup` (nitro-modules `^0.35.6`, EAS `bun x` fix, build-skill rewrite, VERIFIED bump). Three new gotchas + one EAS gotcha captured in `native-rd-build` skill. Google Play Console signup started; awaiting ID verification. | Joe + Claude |
| 2026-05-08 | Refocused plan for user testing: observability and bug intake first, Android Sentry before Android testers, minimal German path after beta blockers, feature requests captured but not built by default.                                                                                                                                                                | Codex        |
