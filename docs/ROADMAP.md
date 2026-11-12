# Roadmap

Snapshot 2026-11-11. 139 open issues. Prototype Fund application dropped 2026-11-11.

**Three rules:**

- A milestone is a track with a finish line. There are four.
- No milestone means "not scheduled", on purpose.
- The board column (Next / In Progress) says _when_. This file says _why_, by naming the ADR.

## Now

| Track                    | Open | Governed by        | Done when                                 |
| ------------------------ | ---- | ------------------ | ----------------------------------------- |
| **1.0 to the App Store** | 55   | ADR-0001, ADR-0012 | #666 closed: iOS build live in the store. |

## Next

| Track               | Open | Governed by                           | Done when                                 |
| ------------------- | ---- | ------------------------------------- | ----------------------------------------- |
| **Phase B wrap-up** | 10   | ADR-0013, ADR-0014 (still "Proposed") | Focus Mode and sub-step leftovers closed. |
| **i18n**            | 14   | ADR-0007, 0008, 0009                  | German ships with no raw English strings. |

## Later

| Track                                         | Open | Governed by               | Done when                      |
| --------------------------------------------- | ---- | ------------------------- | ------------------------------ |
| **Interoperability** (import, share, atproto) | 18   | ADR-0015, needs a rewrite | No date. Was the funded slice. |

## Not scheduled (no milestone)

42 issues: 37 code health (refactors, dependency bumps, CI, docs) and 5 parked ideas.
Pull one into a track when that track needs it. Otherwise they wait.

## Loose ends

- **ADR-0015 is now out of date.** It is "Proposed" and built on the fund's budget and dates. It needs a short superseding ADR: interoperability stays the direction, unfunded, after 1.0.
- **ADR-0014 is unsigned** and governs Phase B wrap-up.
- **Priority labels have drifted.** Nine file-split refactors (#339 to #348) say `priority:high` and have not moved since June.

---

## Issue lists per track

Snapshot only. The milestone on GitHub is the live list.

### 1.0 to the App Store (55)

- #80 Evidence count a11y label has pluralization bug ('1 evidence items')
- #90 Reconcile release pipeline with TestFlight and Play internal testing · Next
- #266 ErrorBoundary: "Try Again" is a no-op for deterministic render errors
- #267 ErrorBoundary: no screen-reader focus/announcement on fallback
- #268 ErrorBoundary: gate console.error to **DEV** (duplicate prod logging)
- #269 ErrorBoundary/sentry-report: capture componentStack via an allowlisted arg
- #302 Toast: actionable toast can be constructed/left in an undismissable state
- #523 Goal-level evidence has no entry point after the Focus Mode rebuild
- #548 [A11y] Edit Goal step rows announce English labels in every language (#446)
- #593 Epic: onboarding templates — a tutorial goal and a small library of badge-worthy starters · In Progress
- #604 Capture real app screenshots and the four-theme accessibility strip · Next
- #608 Clear the PR queue and unblock the stuck release
- #613 Legal furniture: GDPR Art. 13 details in the privacy policy and an AGPL §7 App Store permission · Next
- #666 Ship 1.0 to the App Store (iOS first)
- #683 Epic: UI consistency, accessibility, and native usability review follow-ups · In Progress
- #686 [UI-03] Apply the sheet accessibility contract at every call site · In Review
- #688 [UI-05] Make goals identifiable before opening them · Next
- #689 [UI-06] Make the badge wall usable as a collection · Next
- #690 [UI-07] Label theme choices before selection · Next
- #692 [UI-09] Expose motion control in Settings · Next
- #693 [UI-10] Give validation a consistent, accessible presentation · Next
- #694 [UI-11] Bound persistent chrome and action groups on small screens · Next
- #695 [UI-12] Keep navigation and secondary actions discoverable · Next
- #696 [UI-13] Let users inspect captured evidence where it appears · Next
- #698 [UI-15] Count evidence and steps accurately on badge detail · Next
- #715 [Pre-1.0 spike] Prove peer review on two phones and decide go/defer within two days · Next
- #720 NewGoal wizard: Start Working retry after a step insert failure creates a duplicate goal
- #721 Naming S1: write the naming brief
- #722 Naming S2: map 20 competitor app names
- #723 Naming S3: define 8–10 naming territories
- #724 Naming S4–S5: generate 300+ candidates, no judging
- #725 Naming S6: shortlist and score with the rubric
- #726 Naming S7: screen the 5 finalists
- #727 Naming S8: validate survivors with 5 people
- #728 Naming: decide, clear, and register
- #729 Epic: Product name — pick a fitting, available name for the app
- #741 [UI-00] Define and apply a type-scaling policy · In Progress
- #745 [UI-00b] Use shared Text everywhere and ban react-native Text imports · Next
- #746 [UI-00c] Large-type layout: unclipped tab bar and no mid-word heading breaks · Next
- #747 [UI-00d] Nested shared Text should inherit the outer role cap
- #749 [UI-00e] Theme preview card breaks words mid-word at AX sizes
- #750 [UI-00f] Cap TextInput under Dynamic Type
- #752 [UI-00h] Show full content at large type: remove truncation
- #755 [UI-00k] Badge designer usable at accessibility text sizes
- #756 [UI-00l] Large-type one-offs: progress ring, proof card, timing editor, Welcome footer
- #757 [UI-00m] Changing text size while the app is open leaves stale layout
- #758 [UI-17] Fix low-contrast Welcome hero and footer text in several themes · Next
- #759 [UI-18] Badge detail overflow menu does not open (triage) · Next
- #760 Upgrade to Expo SDK 58 (React Native 0.88) — fixes live text-size layout (#757) · In Progress
- #765 [Crypto] Signing key migrates via device backups — SecureStore uses default WHEN_UNLOCKED · Next
- #781 [UI] Floating tab pill draws over open bottom sheets and stays tappable
- #786 [UI] Share sheet: 'Save as image' and 'Export credential' row titles not drawn on Android
- #787 [UI] ExpandableTitle follow-ups from #708: toggle styling at large type, stale expanded state
- #798 [UI] Android: tab bar covers New goal wizard and its bottom sheets
- #803 Edit Goal: add, edit and clear a step's description · In Review

### Phase B wrap-up (10)

- #22 FocusMode: clarify behavior when all steps re-complete in same mount after Reopen Goal
- #420 Decide TimelineNode goal-node color/token alignment
- #435 Reconverge TimelineStep band + StepCard chips to Focus Mode A fidelity
- #525 focusTimelineHidden is a dead setting after the Focus Mode rebuild
- #526 Focus Mode: set-aside / pick-back-up fire no screen-reader announcement · Blocked
- #527 canCompleteStep's evidence gate is looser than the card's completion reveal
- #537 [Fix] Focus Mode discards the resolver's structural result — wire child context + parent overview (#533 F3)
- #538 [Feature] Parent-completion parts offer: ask what to do with still-pending sub-steps (#533 F6) · Blocked
- #584 [Storybook] StepWaitEditor — record an external `waiting on` in Focus · Blocked
- #634 [Design tokens] Add first-class journey-step-paused-bg/fg — paused is the only non-journey state in the color map

### i18n (14)

- #62 i18n: locale-aware format utilities (formatDate, formatEvidenceLabel)
- #74 i18n: migrate badge designer surfaces · Blocked
- #75 i18n: pseudo-locale snapshot tests for representative screens · Blocked
- #144 i18n: post-first-ship cleanup — raw English strings + naming drift · Blocked
- #173 native-rd/i18n: post-bake-off rig consolidation (rubric lift, models.ts↔YAML codegen, env-loader unification)
- #196 Harden i18n batch-translator against cross-namespace drift
- #208 i18n: add Intl.PluralRules polyfill — gated on first >2-category locale
- #440 i18n:sync LLM step emits invalid JSON on quote-wrapped placeholders (use structured output)
- #478 i18n: ban double-quotes inside en/ values (JS-string quote nesting) + lint gate
- #519 refactor(i18n): collapse badgeI18nKey / stateWordI18nKey once the old Focus chrome retires · Blocked
- #520 cleanup(i18n): delete the dead timelineJourney:step.status.\* key group
- #549 [Cleanup] Prune editGoal i18n keys the redesigned editor no longer reads (#446) · Blocked
- #821 i18n: translate raw English in alerts, error details and screen-reader labels
- #822 i18n: widen the raw-string lint rule to props, alerts and src/badges

### Interoperability (18)

- #95 Extract `verify-badge.ts` predicates into testable module
- #311 Import: data model for imported badge opportunities
- #312 Web: minimal credential store + verifier service (pick deployable)
- #313 Import: OB2 BadgeClass / Badgr .json adapter → preview → goal draft · Blocked
- #314 Earn: carry sourceOpportunityId back-reference on issued badge · Blocked
- #315 App: Share action — upload credential + evidence summaries, return token link · Blocked
- #316 Web: verifier page at /v/<id> — render badge + evidence, in-browser OB3 check · Blocked
- #595 Epic: OB3 external verification — make a badge verify outside the app
- #615 [Spike] Goal-template format — make ADR-0015 milestone 5 something other than a guess
- #616 Write the trust model: what a self-issued credential actually proves
- #624 [Follow-up] Review leftovers from #597 — OB3 schema shape
- #627 [Docs] ADR: badges are immutable once signed — record the no-migration decision durably
- #631 [Cleanup] Orphaned Ed25519 key blobs left in SecureStore after P-256 rotation
- #633 [Crypto] Hardware-backed key generation — P-256 opens the Secure Enclave, nothing uses it yet
- #645 Epic: rollercoaster.dev PDS — a self-hosted atproto data server
- #646 [Spike] Run the reference PDS locally in Docker and point the #614 scripts at it
- #647 Deploy pds.rollercoaster.dev — self-hosted PDS with \*.rollercoaster.dev handles
- #793 feat(native-rd): share composer — evidence photo + badge overlay image

### Not scheduled: code health (37)

- #21 Centralize GoalsStackNav / BadgesStackNav navigation type aliases
- #23 FocusModeScreen: stabilize 'goal' reference to avoid effect re-runs on every Evolu emission
- #81 Migrate remaining Unicode-as-icon affordances to phosphor-react-native
- #133 Investigate enabling @typescript-eslint/no-explicit-any (or removing dead disables)
- #214 Investigate: a11y audit step finds 0 tests as first cold jest run (false red on cascading failures)
- #258 refactor(native-rd): apply density lazily at theme-switch time, not eagerly across all 7 themes
- #305 run-android.sh: `android:device` passes adb serial to `expo run:android --device`, which wants a device name
- #308 Route evidence file-cleanup failures to Sentry (orphaned-file observability)
- #319 Resolve react-hooks v6 findings deferred from Expo SDK 56 upgrade
- #334 refactor(steplist): collapse drag drop-indicator state into a DropIndicator union
- #335 tech-debt(db): harden Evolu mutation Result handling app-wide
- #339 Split source files flagged by file-size-limit lint rule (>300 lines)
- #340 refactor(db): split queries.ts into per-domain query modules
- #341 refactor(db): extract step queries + step-tree helpers into queries/steps.ts
- #342 refactor(badges): extract OB3 credential parsers + EvidenceList from BadgeDetailScreen
- #344 refactor(completion): extract badge bake-capture engine into useBadgeBake
- #345 refactor(completion): extract EvidencePromptPhase + CelebrationPhase components
- #346 refactor(focus): extract useFocusMode hook from FocusModeScreen
- #347 refactor(badge-designer): extract useDesignEditor hook
- #348 refactor(badge-designer): split DesignEditor + content controllers into modules
- #349 refactor(badges): extract contourSampling module from guilloche frame generator
- #351 refactor(badges): extract IconPickerModal sub-components
- #352 refactor(badges): extract useCaptureAsPng hook from BadgeRenderer
- #353 refactor(badges): split parseBadgeDesign out of badges/types
- #547 [Cleanup] StepList has no production consumer after the Edit Goal integration (#446)
- #560 [E2E] Run the required Maestro gate in CI instead of by hand
- #561 Decide: build a redesign entry point for BadgeDesignerScreen, or delete it (registered in 2 navigators, 0 navigate() callers)
- #564 docs: purge dangling references to the four E2E flows deleted in #502
- #591 docs(native-rd): write a real testing doc
- #610 Prune stale docs, scrub the private hostname, and refresh the quality dashboard
- #611 Write the missing package, prototypes, and patches READMEs
- #612 Milestone and label hygiene
- #626 [Chore] Root eslint config duplicates openbadges-core's TS rule switches
- #675 chore(deps): coordinated Evolu major upgrade (common 8, react 11, react-native 16)
- #676 chore(deps): upgrade eslint to v10 (with @eslint/js 10)
- #702 chore(native): assess baseline Expo SDK diagnostics
- #799 chore(deps): remove unused @react-native-community/datetimepicker

### Not scheduled: parked ideas (5)

- #107 Design evidence-source telemetry (camera vs library) for closed BreadcrumbInput API
- #281 Voice memo: on-device speech-to-text for Step capture (F register)
- #282 Photo evidence: on-device alt-text via Apple Foundation Models (cautious, opt-in)
- #283 App Intents + Spotlight: surface 'next best step' to Siri and system search
- #429 [design-token] Review Night Ride + Clean Signal card shadow tokens vs honesty matrix
