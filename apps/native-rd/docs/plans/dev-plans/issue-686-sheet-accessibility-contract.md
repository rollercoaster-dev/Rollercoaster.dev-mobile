# Development Plan: Issue #686 — sheet accessibility contract at every call site

## Workspace and scope

- Issue: https://github.com/rollercoaster-dev/Rollercoaster.dev-mobile/issues/686 (UI-03, parent epic #683)
- Worktree: `/Users/jc/.superset/worktrees/Rollercoaster.dev-mobile/bemused-poetry-d9aac651`
- Branch: `codex/issue-686` (manual run of `auto-issue #683`; the epic itself is not one PR, so the next unclaimed P1 sub-issue was taken)
- Base: `0b20541ed0d407194532f40a2a4bab26008092cd` (`origin/main`, 2026-10-22)
- Scope: every `AnimatedSheet` consumer — FocusModeScreen (capture + plan sheets), BadgeDetailScreen (share sheet), NewGoalWizard and EditGoalView (already isolated locally) — plus the chrome that sits outside a screen's own tree (ScreenSubHeader, FocusPillTabBar).

## Problem (source-confirmed at base)

- `AnimatedSheet` sets `accessibilityViewIsModal`, which is iOS-only and hides only the overlay's **siblings**.
- FocusModeScreen mounts its sheets inside `FocusContent`; the `ScreenSubHeader` back button is a sibling of an ancestor, so VoiceOver can still reach it. Nothing hides content from TalkBack. Neither sheet restores focus to its trigger.
- BadgeDetailScreen hides nothing from TalkBack. Opening the sheet from the ⋯ overflow menu restores focus to the Share CTA, not to ⋯.
- The floating tab bar is rendered by the tab navigator, outside every screen's tree, so it stays reachable on both platforms while a sheet is open on Focus or Badge detail.
- NewGoalWizard / EditGoalView each hand-roll the TalkBack wrapper and the press-target capture.

## Intent Verification

- [x] While any `AnimatedSheet` is open (and its screen is focused), the screen body behind it, the screen's sub-header, and the tab bar are hidden from both VoiceOver (`accessibilityElementsHidden`) and TalkBack (`importantForAccessibility="no-hide-descendants"`).
- [x] Focus Mode: closing the capture sheet or the evidence-plan sheet (× / backdrop / Android back) restores screen-reader focus to the control that opened it.
- [x] Badge detail: closing the share sheet restores focus to whichever control opened it (Share CTA, or ⋯ when opened from the overflow menu).
- [x] One shared integration pattern: sheets register themselves; background regions opt in through one hook/component; triggers use one helper. NewGoalWizard and EditGoalView use it instead of their local copies.
- [x] Native: `e2e/flows/sheet-isolation.yaml` passed on an iOS 26.5 simulator and an Android 36 emulator against app source `cae4617e`. iOS shows background, header, and tab bar absent from the AX tree while a sheet is open and back after; Android reports them `important-for-accessibility=false` / `true` at the same states. See `e2e/reports/issue-686/index.md`.
- [ ] VoiceOver / TalkBack physical-device check, including focus restoration: **Not checked**. An agent cannot run assistive tech; tracked as F3.

## Decisions

| ID  | Decision                                                                                                                                                                 | Rationale                                                                                                                                                                                                                                                    |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| D1  | A module-level open-sheet counter (`useSyncExternalStore`), registered by `AnimatedSheet` itself while `visible`.                                                        | The tab bar and sub-header live outside the screen's tree; a store needs no provider, so Storybook and Jest render unchanged and callers carry no registration obligation.                                                                                   |
| D2  | Background regions opt in with `useSheetBackgroundA11yProps()` / `<SheetBackground>`; ScreenSubHeader and FocusPillTabBar opt in once for every screen.                  | Hiding must never wrap the sheet itself, so opt-in is explicit; the two pieces of shared chrome are covered centrally.                                                                                                                                       |
| D3  | Set both `accessibilityElementsHidden` and `importantForAccessibility` on background regions.                                                                            | `accessibilityViewIsModal` cannot reach ancestors' siblings (header, tab bar) on iOS and does nothing on Android.                                                                                                                                            |
| D4  | Restore focus to the press event's `currentTarget` (the Pressable's host view) via `useSheetTrigger`, falling back to `nativeEvent.target`.                              | RN cannot query current accessibility focus. `nativeEvent.target` is the deepest view touched (label Text / icon), which is not focusable; `currentTarget` is the Pressable itself during dispatch (RN 0.85 `executeDispatch`). Review finding, fix round 1. |
| D5  | Widen `onChangeEvidencePlan`, the open-ended `onAddEvidence`, `IconButton.onPress`, `CelebrationHeroHeader.onOverflow`, `BadgeShareSheet.onOpenSheet` to pass the event. | Existing zero-arg callers stay assignable; the event is already delivered at runtime by `Pressable`.                                                                                                                                                         |
| D6  | Count a sheet as open only while its host screen is focused (`NavigationContext` focus/blur, via `useSyncExternalStore`); outside a navigator it reads as focused.       | Bottom tabs keep the unfocused tab mounted; a sheet left open behind a touch tab switch would otherwise keep the new tab's tab bar and headers hidden. Review finding (HIGH), fix round 1.                                                                   |

## Implementation Plan

1. [x] Shared module `src/components/AnimatedSheet/sheetAccessibility.tsx`: open-sheet store, `useOpenSheetRegistration`, `useSheetBackgroundA11yProps`, `SheetBackground`, `useSheetTrigger`. AnimatedSheet registers while visible. Tests.
2. [x] ScreenSubHeader + FocusPillTabBar opt in. Tests.
3. [x] FocusModeScreen: wrap body in `SheetBackground`; capture triggers for both sheets; widen card callback types; EvidenceTypePicker `restoreFocusRef` accepts a tag. Tests.
4. [x] BadgeDetailScreen: wrap hero + scroll; CTA opts in; trigger capture for CTA and ⋯ paths. Tests.
5. [x] Migrate NewGoalWizard / EditGoalView wrappers and tag capture to the shared helpers; existing tests keep passing.
6. [x] Root type-check, lint, test; independent reviews; native verification; finalize.

## Native state matrix

| Route/state                     | Fixture                       | Locale/theme/type       | Expected proof                                                        |
| ------------------------------- | ----------------------------- | ----------------------- | --------------------------------------------------------------------- |
| Focus → Add more evidence sheet | Goal with an in-progress step | English/default/default | AX tree: only sheet elements; no back button, card, or tab bar        |
| Focus → change evidence plan    | Same                          | English/default/default | Same as above; after × the background returns                         |
| Badge detail → Share sheet      | Earned badge (full-ride flow) | English/default/default | AX tree: hero/body/CTA/tab bar absent while open; present after close |
| Focus restore / TalkBack / VO   | —                             | —                       | Not checked: needs physical device with VoiceOver and TalkBack        |

## Not in Scope

| Item                                 | Reason                                                                            |
| ------------------------------------ | --------------------------------------------------------------------------------- |
| RN `Modal`-based dialogs/menus       | Native modals already isolate their content on both platforms.                    |
| Visual/touch blocking of the tab bar | Issue asks for assistive-technology isolation; sighted touch behaviour unchanged. |

## Discovery Log

- [2026-10-22] Full suite at `033236b`: 223 suites / 10,500 tests passed. CodeRabbit CLI returned `Invalid organization` (same as #709), so no local CodeRabbit verdict; three independent reviewers ran instead.
- [2026-10-22] Native: Maestro's Android tree includes not-important views, so `assertNotVisible` cannot detect TalkBack hiding. The flow gates its negative checks to iOS, and Android was verified through the `important-for-accessibility` attribute. Port 8081 was held by another project's Metro, which the dev client attached to; worked around per the report.
- [2026-10-22] #683 is an epic; #684/#691/#693/#694/#699 are claimed or in flight in other worktrees, #685/#687 merged. Took #686.

## Review findings and follow-ups

Round 1 reviewed `033236b` (code quality, test coverage, error handling). No critical findings.

| Reviewer       | Sev                  | Finding                                                                                    | Disposition                                                         |
| -------------- | -------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------- |
| Error handling | High                 | Sheet left open behind a tab switch kept the other tab's tab bar/headers hidden.           | Fixed: registration gated on host-screen focus (D6) + test.         |
| Quality, Error | Medium               | `nativeEvent.target` can be a non-focusable child (label/icon), so restore may no-op.      | Fixed: prefer `event.currentTarget` (D4) + test.                    |
| Tests          | Medium               | "Not pulled back" negative could pass if the sheet never closed.                           | Fixed: asserts the header is back before the negative.              |
| Tests          | Medium               | Nothing pinned that focus restores only once the trigger is back in the a11y tree.         | Fixed: Badge test records CTA reachability inside the focus spy.    |
| Tests          | Low                  | Badge backdrop dismissal and VoiceOver prop reset untested.                                | Fixed: dismiss column; close check asserts both props.              |
| Quality        | Low                  | `useMemo` for identity; doc dropped sibling-ref guidance; hero comment; comment indents.   | Fixed.                                                              |
| Tests          | Low                  | Android back not exercised at screen level.                                                | Deferred: same `onClose` as ×, covered by `AnimatedSheet.test.tsx`. |
| Error handling | Low                  | Re-suspending `FocusContent` with a sheet open leaves background hidden behind spinner.    | Follow-up F1.                                                       |
| Error handling | Medium (speculative) | ⋯ › Share: iOS may return focus to ⋯ as the menu Modal fades, after the sheet title focus. | Follow-up F2 (needs device).                                        |

### Follow-ups

- **F1** `FocusModeScreen.tsx` Suspense: if `FocusContent` re-suspends while a sheet is open, effects don't clean up, so the header/tab bar stay hidden until it resolves. Next: reproduce; if real, gate on a mounted/visible signal or close sheets before re-fetch.
- **F2** `BadgeDetailScreen.tsx` overflow → share: VoiceOver focus race between the closing RN `Modal` and the sheet's title focus. Next: check on device; if focus lands on hidden ⋯, open the sheet from the Modal's `onDismiss`.
- **F4** Tooling: `bun run start:worktree` passes `--no-dev-tools`, which current `expo start` rejects. The native-rd-build skill also needs a gotcha for another project's Metro on 8081: the dev client attaches to it, giving an RN version mismatch; fix with the `RCT_jsLocation` default on iOS or `adb reverse tcp:8081 tcp:<port>` on Android. Not changed here because open PR #735 edits that skill.
- **F3** Physical-device VoiceOver + TalkBack pass over every sheet's open / × / backdrop / Android-back paths (also covers the #501 evidence chips). Needs Joe with a device.
