# Release Pipeline Research — iOS + Android

**Date:** 2026-05-14
**Status:** Research — recommends an approach; implementation plan to follow.
**Scope:** native-rd app only. Other workspace packages don't ship binaries.

> Historical design record. The implemented pipeline has changed since this
> recommendation, especially Android's temporary Play internal destination.
> Use `docs/release.md` as the operational source of truth.

## TL;DR

Recommend a **GitHub-Actions-orchestrated EAS** pipeline:

- **EAS Build + EAS Submit** for all signing/build/store-upload work (already configured in `eas.json`).
- **GitHub Actions** drives the release: validates, triggers EAS, manages versions/changelogs, uploads Sentry sourcemaps and creates GitHub releases.
- **release-please** for version bumping + changelog from conventional commits (we already use conventional commits — see recent log).
- **Three release tracks** mapped to existing EAS profiles: `development` (manual), `preview` → TestFlight internal + Play internal, `production` → TestFlight external/App Store + Play production (staged rollout).

This keeps signing, credentials, and the native toolchain off our infra (no macOS runners to pay for or maintain) while putting versioning, release notes, and orchestration where the team already lives.

## Starting State (what's already done)

- `apps/native-rd/eas.json` has `development` / `preview` / `production` profiles and `submit.production` configured for both stores. `appVersionSource: remote` and `requireCommit: true` are set.
- `.github/workflows/ci.yml` runs `typecheck` + `lint` + `test` on PRs and pushes to `main`.
- Sentry is wired in (sourcemap upload happens during EAS build via `@sentry/react-native/expo`).
- iOS App Store Connect record exists (`ascAppId: 6766029904`); team ID + Apple ID set in submit config.
- Android submit uses `play-service-account.json` (path-based — needs to be re-keyed for CI).
- `apps/native-rd/docs/plans/2026-04-28-ios-testflight-readiness.md` and `docs/launch/app-store-launch-plan.md` track the manual readiness work and store policy items (Play 14-day testing, German Gewerbeanmeldung, etc.). Those are out of scope here — this doc is only the CI/CD pipeline.

## Options Considered

### A. EAS Build + Submit, driven from a developer laptop (status quo+)

What it is: Stay manual. Run `eas build --profile preview` and `eas submit` from a dev machine when shipping.

- Pros: Zero new infrastructure. Works today.
- Cons: Manual versioning, no changelog automation, no audit trail in Git/PRs, drift between "what's in `main`" and "what's on TestFlight." Doesn't scale past one person and forgets state between releases.

### B. GitHub Actions + Fastlane on macOS runners (DIY everything)

What it is: GH macOS runners do `expo prebuild` → `xcodebuild`/`gradle` → Fastlane `pilot`/`supply` for uploads. Manage Apple certs via Fastlane Match in a private repo.

- Pros: Full control. No EAS dependency. Fastlane is mature for store submission.
- Cons: GH macOS runners are ~10x the cost per minute of Linux runners and slow (~10–20 min per iOS build, longer with `buildReactNativeFromSource: true` — see `app.json`). Match repo and signing maintenance is real work. We'd be re-implementing what EAS already does, having already paid for it.

### C. GitHub Actions orchestrates EAS Build + EAS Submit (recommended)

What it is: All native build work happens in EAS cloud (free macOS workers, signing handled). GH Actions wraps it: validates on PR, triggers the right EAS profile on the right event, runs `release-please` for versioning + changelog + GitHub releases, creates Sentry releases, notifies on failure.

- Pros: Reuses existing EAS config. No macOS runner cost. Versioning + release notes live in Git history (auditable, PR-reviewable). One source of truth for "what's been released." Manual override via `workflow_dispatch` for ad-hoc builds.
- Cons: Two systems to understand (GH Actions YAML + EAS profiles). Requires EAS account in good standing — build queues during outages would block releases (acceptable for our scale; mitigation is the manual override).

**Decision: Option C.** Cost, speed, and reuse of existing config dominate.

## Pipeline Design

### Release tracks

| Track       | Trigger                                        | EAS profile   | iOS destination                   | Android destination                       | Auto-submit | Notes                                             |
| ----------- | ---------------------------------------------- | ------------- | --------------------------------- | ----------------------------------------- | ----------- | ------------------------------------------------- |
| Development | `workflow_dispatch` only                       | `development` | dev client (simulator)            | dev client (APK)                          | No          | Used by devs/agents; usually run locally instead. |
| Internal    | Push to `main`                                 | `preview`     | TestFlight internal               | Play internal                             | Yes         | Continuous internal builds; one per merged PR.    |
| Production  | Tag `v*.*.*` (created by release-please merge) | `production`  | TestFlight ext + App Store review | Play production (staged 10% → 50% → 100%) | Yes         | One release per tag. Manual rollout advance.      |

Rationale: tying production to a tag (not a branch push) gives a deliberate "we are shipping now" gesture; release-please owns tag creation when its PR merges, so the human action is just merging the release PR.

### Versioning + changelog (`release-please`)

- `release-please` watches `main`, parses conventional commits, opens/maintains a "Release vX.Y.Z" PR with the bumped version in `apps/native-rd/package.json` and a generated `CHANGELOG.md` entry.
- Merging that PR creates the `v*.*.*` tag and a GitHub Release with notes — this is the production trigger.
- `appVersionSource: remote` in `eas.json` means EAS owns the iOS build number / Android versionCode (auto-increment); the semver lives in `package.json` and stays in sync via `expo.version` in `app.json`. We'll need a small step (or `release-please` extra-files) to keep `app.json` `version` in sync with `package.json`.
- Why release-please over `changesets`: we already write conventional commits (`feat:`, `fix:`, `chore(...)` — recent log confirms), no manual changeset file step needed, and release-please is GitHub-native.

### Sentry

- EAS already uploads sourcemaps during build (`@sentry/react-native/expo` plugin). On production tag, GH Actions calls `sentry-cli releases finalize <version>` and (optionally) `sentry-cli releases deploys new` to mark the release deployed to App Store / Play. This closes the loop between a Sentry release and a store release.
- `SENTRY_AUTH_TOKEN` already needed by EAS at build time → re-use in CI for finalize step.

### Workflow files (target shape)

- `.github/workflows/ci.yml` — unchanged (PR validation).
- `.github/workflows/release-please.yml` — runs on push to `main`; opens/updates the release PR.
- `.github/workflows/build-internal.yml` — runs on push to `main`; `eas build --profile preview --platform all --non-interactive --no-wait` + `eas submit --profile preview --platform all --latest --non-interactive` (after build completes). Uses `eas build --no-wait` + a follow-up job that polls `eas build:view` to keep GH minutes low.
- `.github/workflows/build-production.yml` — runs on tag `v*.*.*`; same shape but `--profile production`. Adds Sentry release finalize + GitHub Release attachment (e.g., the `.ipa` / `.aab` URLs from EAS for archival).
- All three reuse a shared `validate` job (extract `ci.yml` body into a reusable workflow or composite action so we don't repeat install/typecheck/lint/test).

### Secrets (GitHub → Actions)

| Secret                                                                        | Source                                                      | Used by                                                                                             |
| ----------------------------------------------------------------------------- | ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `EXPO_TOKEN`                                                                  | https://expo.dev/accounts/[org]/settings/access-tokens      | All EAS calls                                                                                       |
| `SENTRY_AUTH_TOKEN`                                                           | Sentry org auth token (org:read, project:releases)          | EAS build (passed through env) + sourcemap finalize                                                 |
| `APPLE_APP_STORE_CONNECT_API_KEY_*` (3 vars: key id, issuer id, key contents) | ASC → Users → Integrations                                  | `eas submit` for iOS (preferred over Apple ID + 2FA app-specific password)                          |
| `ANDROID_PLAY_SERVICE_ACCOUNT_JSON`                                           | Google Cloud service account with Play Developer API access | `eas submit` for Android. Replaces `serviceAccountKeyPath` in `eas.json` (write to file in the job) |

Move the Apple submit config away from Apple ID + 2FA. App Store Connect API keys are the only sane choice for CI. Update `submit.production.ios` in `eas.json` accordingly.

### Build optimization

`apps/native-rd/app.json` currently sets `expo-build-properties` with `ios.buildReactNativeFromSource: true`. This was needed for a specific compatibility issue but roughly doubles iOS build time. Before the first automated production build, verify whether this is still required (run an EAS build with it removed against current SDK). Out of scope to change here, but flag for the implementation plan.

### Failure handling

- Internal track build failure: comment on the commit, post to a Slack/Telegram channel (use the `telegram` skill — already in this user's setup). Don't block.
- Production track build failure: same notification + leave the GitHub Release in draft until the build succeeds (re-trigger via `workflow_dispatch` with the tag).
- Submit failures (rejected by App Store / Play): post the EAS submit log link. Manual intervention expected — don't auto-retry.

### Staged rollout

- iOS: TestFlight external testers get the build immediately on `eas submit`. The actual App Store release stays gated behind manual "Submit for Review" + phased release in ASC. Don't automate that step; the human reviewer of the release PR is the gate.
- Android: `eas submit` with `track: production` and `rollout: 0.1` for 10% start. Advancing to 50%/100% is a manual `eas submit:rollout` (or Play Console) action after watching Sentry for 24–48h.

## Open Decisions (for the implementation plan to settle)

1. Do we want a separate `develop`/`next` branch flow, or is `main` → internal → tag → prod sufficient? (Recommend: just `main`. Solo project.)
2. Are we OK with one TestFlight internal build per merged PR, or should we batch (e.g., daily cron, or only when an `app/*` path changes)? Recommend: gate `build-internal.yml` on a path filter so doc-only PRs don't trigger builds — `eas.json` already has `requireCommit: true` so empty builds aren't a worry, but EAS minutes are.
3. Drop `ios.buildReactNativeFromSource: true` before first prod build? Needs a test build to confirm.
4. Keep `play-service-account.json` path in `eas.json`, or move to env-only? Recommend env-only — never commit even an encrypted credential.
5. Apple submit: switch from Apple ID auth to ASC API key now or later? Recommend now — it's a prerequisite for automation, the Apple ID flow can break on 2FA.

## Out of Scope (tracked elsewhere)

- App Store Connect / Play Console account setup → `docs/launch/app-store-launch-plan.md`.
- TestFlight readiness checklist (privacy policy, metadata, etc.) → `docs/plans/2026-04-28-ios-testflight-readiness.md`.
- Play Console 14-day closed testing requirement → `docs/launch/app-store-launch-plan.md`.
- Code signing identity setup (initial `eas credentials` runs) → manual, one-time.

## Next Steps

1. User reviews this doc.
2. Convert to an implementation plan under `docs/plans/` covering: `release-please` install, three workflow files + reusable validate workflow, secrets setup, ASC API key migration, optional `buildReactNativeFromSource` removal test. Use `superpowers:writing-plans` to draft it.
3. Land in atomic commits (per memory: atomic commits, one logical change each).
