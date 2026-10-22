# Native verification — issue #699 (bug mode)

Issue: https://github.com/rollercoaster-dev/Rollercoaster.dev-mobile/issues/699 — [UI-16] Pluralize the badge collection title
PR: none yet. Fix branch `codex/issue-699`.

## State list (written before launch)

| #        | Route / journey                                                                               | Fixture & data count                                  | Locale      | Theme                              | Text size | Device                                            | Expected                                                  | Proof method                                                                                                                           |
| -------- | --------------------------------------------------------------------------------------------- | ----------------------------------------------------- | ----------- | ---------------------------------- | --------- | ------------------------------------------------- | --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| S1       | Onboard → create goal "Alpha goal" (1 step, text evidence) → bake → Badge Detail → Badges tab | 1 badge row (spotlight = Alpha goal, 0 gallery cells) | en (pinned) | Still Water (light-autismFriendly) | default   | disposable sim rd-verify-699, iPhone 17, iOS 26.5 | base: `1 badges`; fix: `1 badge`                          | Maestro literal `assertVisible {id: badges-wall-count, text: ...}` + screenshot; card count = spotlight label + no `badge-wall-cell-*` |
| S2       | Same session: Goals tab → create "Bravo goal" → bake → Badges tab                             | 2 badge rows (spotlight = Bravo goal, 1 gallery cell) | en          | Still Water                        | default   | same                                              | base & fix: `2 badges`                                    | Maestro literal assert + screenshot + `maestro hierarchy` dump counting `badge-wall-cell-*` nodes                                      |
| S3       | German locale, same journey                                                                   | 1 and 2 badges                                        | de          | Still Water                        | default   | same                                              | fix: `1 Badge` / `2 Badges`                               | separate session with AppleLanguages=de, only if feasible                                                                              |
| Adjacent | Empty wall unaffected (count=0 branch renders empty state, not the heading)                   | 0                                                     | en          | —                                  | —         | —                                                 | not touched by change (heading only renders when count>0) | source only                                                                                                                            |

Both states run in one Maestro session (one top-level flow) because each top-level flow clears app state.

## Run details

- Base SHA 0b20541e (worktree verify-699-base); tested fix SHA 5a54ba76 (app code identical to 7f4e43f6; 5a54ba76 only adds tests/docs).
- One native build from the fix worktree: `IOS_DEVICE_ID= bun run ios:e2e --port 8138 --device 6766327D-0D6F-4FF7-BAAD-F72447E7F4F8` (EXPO_PUBLIC_E2E_MODE=true), exit 0. Native code is identical between base and fix; only JSON/JS differ, so each run swapped Metro instead of rebuilding.
- Device: disposable sim rd-verify-699 (iPhone 17, iOS 26.5), locale en_US, theme Still Water (light-autismFriendly), default text size.
- Metro: the dev client reloads from localhost:8081 after the deep link, so each run served Metro on 8081 from the tested worktree. cwd was verified with lsof before each run. An unrelated project's Metro was on 8081 and served the wrong bundle (RN 0.86.3 mismatch) until it was stopped.
- Maestro: base `tmp/native-verify/699/maestro/flows/ (local scratch) base-badge-count.yaml` passed (JUnit `ios-en-base-junit.xml`). Fix `tmp/native-verify/699/maestro/flows/ (local scratch) fix-badge-count.yaml` passed (JUnit `ios-en-fix-junit.xml`).

## Results

| Criterion and state       | Expected               | Observed                                                       | Verdict                   | Evidence                                                |
| ------------------------- | ---------------------- | -------------------------------------------------------------- | ------------------------- | ------------------------------------------------------- |
| Bug repro, base, 1 badge  | "1 badges"             | literal assert "1 badges" passed; 1 spotlight, 0 gallery cells | Verified (bug reproduced) | base-1-badges.png                                       |
| Base, 2 badges            | "2 badges"             | "2 badges"; spotlight + 1 gallery cell                         | Verified                  | base-2-badges.png                                       |
| Fix, 1 badge              | "1 badge"              | literal assert "1 badge" passed; 1 spotlight, 0 gallery cells  | Verified                  | fix-1-badge.png                                         |
| Fix, 2 badges             | "2 badges"             | literal assert "2 badges" passed; spotlight + 1 gallery cell   | Verified                  | fix-2-badges.png                                        |
| Fix, German 1/2 badges    | "1 Badge" / "2 Badges" | not run natively (run-e2e pins English)                        | Not checked               | Jest only: src/i18n/**tests**/i18n.test.ts              |
| Other themes / text sizes | no layout change       | only Still Water checked                                       | Not checked               | string is one letter shorter; no layout risk identified |

Overall: **verified on iPhone 17 sim, iOS 26.5, en, Still Water** for the required en criteria. German and the other themes were not checked natively.

Note: the spotlight shows the earlier same-day badge (Alpha) after earning Bravo. That is existing ordering behavior, outside #699's scope.
