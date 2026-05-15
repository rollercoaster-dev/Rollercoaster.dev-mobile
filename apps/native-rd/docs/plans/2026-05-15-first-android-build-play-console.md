# First Android Build → Play Console (Manual First Upload)

**Date:** 2026-05-15
**Branch:** `adding-first-android-build-to-play-console`
**Status:** Pre-flight checklist — execution gated on Play Console account verification

## Context

This branch is the container for cutting the first Android AAB and walking it through the Play Console manually. The very first upload for a brand-new app must be done through the Play Console UI so Play App Signing can be opted into; after that, `eas submit` can take over via the service account.

The EAS pipeline, Android build profile, and submit profile are all already configured in `apps/native-rd/eas.json` and `apps/native-rd/app.json`. The preview APK route is `[VERIFIED 2026-05-07]` per the `native-rd-build` skill. The production AAB path is still `[UNTESTED]`.

**Known gap (confirmed with Joe):** `SENTRY_AUTH_TOKEN` is missing from EAS env. Without it, sourcemap upload during a production build is skipped silently — every store-released crash would arrive in Sentry as obfuscated minified frames. Sentry-blind production is the failure mode this plan blocks first.

## Critical files

| File                                                        | Role                                                                                                                                                                                           |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/native-rd/eas.json`                                   | EAS build/submit profiles. `appVersionSource: "remote"`, `production.autoIncrement: true`, `submit.production.android.track: "internal"`.                                                      |
| `apps/native-rd/app.json`                                   | Expo config. `android.package: "dev.rollercoaster.app"`, permissions: `RECORD_AUDIO`, `MODIFY_AUDIO_SETTINGS`, `CAMERA`. Sentry plugin wired with org `rollercoasterdev`, project `native-rd`. |
| `apps/native-rd/.gitignore`                                 | Line 41 ignores `play-service-account.json`. Also ignores `*.jks`, `*.keystore`, `*.p8/.p12/.key/.pem`. Verified 2026-05-15.                                                                   |
| `apps/native-rd/.claude/skills/native-rd-build/SKILL.md`    | Build matrix + gotchas. Promote status tags after Android production AAB succeeds.                                                                                                             |
| `apps/native-rd/docs/launch/app-store-launch-plan.md`       | Phase 7 (Android) — current source of truth for Play Console rollout.                                                                                                                          |
| `apps/native-rd/docs/plans/2026-05-02-user-testing-prep.md` | Closed testing tracker (12 testers × 14 days).                                                                                                                                                 |

## Pre-flight checklist (must be done before `eas build -p android --profile production`)

### 1. `SENTRY_AUTH_TOKEN` as EAS env secret — THE missing item

The `@sentry/react-native/expo` plugin runs a postbuild sourcemap upload step via `sentry-cli`. EAS only injects env vars it knows about.

**Use an Organization Auth Token, not a personal User Auth Token.** Org tokens are scoped to the organization (not your personal account), survive personnel changes, and have a purpose-built scope for this exact use case.

- Create at: https://sentry.io/orgredirect/organizations/rollercoasterdev/settings/auth-tokens/
- Single scope required: **`org:ci`** — "CI/deployment workflows including source maps, releases, code mappings"
- (Legacy fallback if you create a User Auth Token instead: `project:releases` + `org:read`. Not recommended for CI.)

Store it via the EAS env system. **All `eas` commands must run from `apps/native-rd/`** — that's where `eas.json` and the EAS project link live. Running from the worktree root gives `EAS project not configured`.

Note: `eas secret:*` is deprecated in EAS CLI ≥16. Use `eas env:*` instead. The `production` environment matches the `production` build profile.

Run it interactively — the CLI walks you through every choice (environment, name, value, type, visibility) and you can't mis-flag it:

```bash
cd apps/native-rd
eas env:create
# Answer prompts:
#   Environment:  production    (also add to preview if you want debug symbolication)
#   Name:         SENTRY_AUTH_TOKEN
#   Value:        <paste org auth token>
#   Type:         string
#   Visibility:   secret        (hidden everywhere, can't be read back after creation)

eas env:list --environment production   # verify SENTRY_AUTH_TOKEN appears, value masked as ***
```

**Important caveat for autonomous agents:** `eas env:create` is interactive and will hang in a non-TTY shell. Joe runs this himself; an agent invoking it via Bash will deadlock per the `apps/native-rd/CLAUDE.md` "never run interactive CLI commands" rule.

If you want the token available to `preview` builds too (so debug crashes also symbolicate), repeat with `--environment preview`.

**Verification:** after the next production build, the build log should contain a `Sentry: Uploading source maps` line and the Sentry release page should show artifacts. No token → log says "skipping" and Sentry releases stay empty.

### 2. Privacy Policy URL

Google Play blocks publishing for any app declaring sensitive permissions (this app declares all three: camera, mic, audio settings) without a publicly hosted privacy policy URL. The URL goes into the Play Console listing — it does not have to live in `app.json`. Action: host the policy (GitHub Pages on `rollercoaster.dev` is fine) and have the URL ready before opening the Play Console store listing form. Reusable for the iOS App Store listing too.

### 3. `versionCode` baseline

`eas.json` uses `appVersionSource: "remote"`. EAS owns the canonical `versionCode` and bumps it because `production.autoIncrement: true`. For the first build there is no remote value yet, so EAS defaults to `1`. If you've ever run a preview that pushed a remote value, run `eas build:version:get -p android` (from `apps/native-rd/`) to confirm what EAS will use. No code change required — just verify.

### 4. Store listing assets (gates submission, not the build itself)

Required by Play Console at upload time, not by Gradle:

- App icon (already at `apps/native-rd/assets/icon.png`)
- Feature graphic — 1024×500 PNG, no transparency
- 2–8 phone screenshots (16:9 or 9:16, min 320px short side)
- Short description (≤80 chars)
- Full description (≤4000 chars)
- App category, content rating questionnaire, target audience declaration
- Data safety form (declare RECORD_AUDIO, CAMERA, microphone/photo collection if data leaves device)

Stage these in `apps/native-rd/docs/launch/` as text + image files before opening Play Console so the form-filling pass is mechanical.

### 5. `play-service-account.json` (known blocker, tracked)

Not required for the **first** upload because that one is manual. It IS required before the second build can be promoted via `eas submit -p android --profile production`. Generate from Play Console → Setup → API Access → Create Service Account → grant "Release manager" role → download JSON → drop at `apps/native-rd/play-service-account.json` (already gitignored — confirmed 2026-05-15 via `git check-ignore -v`).

## Build procedure (first AAB)

```bash
cd apps/native-rd   # REQUIRED — eas needs to see eas.json here

# 1. Confirm env var exists in the production environment
eas env:list --environment production | grep SENTRY_AUTH_TOKEN

# 2. Sanity-check the production profile would resolve correctly
eas build:inspect -p android --profile production --stage pre-install

# 3. Trigger the production build (cloud, ~20-30 min)
eas build -p android --profile production

# 4. When build finishes, download the .aab from the EAS dashboard
#    (URL is printed in the build summary)
```

Promote the `native-rd-build` skill entry for "Android production AAB" from `[UNTESTED]` to `[VERIFIED <date>]` after this succeeds.

## Manual upload procedure (Play Console UI — first AAB only)

1. Play Console → Create app → enter name, default language, app/game, free/paid, declarations.
2. Set up → App content:
   - Privacy policy (paste URL from pre-flight #2)
   - Ads, App access, Content rating, Target audience, News app, Data safety, Government apps, Financial features
3. Grow → Store listing: name, short description, full description, graphics (icon, feature graphic, screenshots).
4. Release → Testing → **Internal testing** → Create new release.
5. App integrity → opt into **Play App Signing** (Google generates and holds the app signing key; the AAB you upload is signed with the EAS-generated upload key — that's the correct flow).
6. Upload the `.aab` downloaded from EAS.
7. Add internal testers list (your own Google account at minimum).
8. Save → Review release → Start rollout to Internal testing.
9. Accept the tester invite link in a browser logged into a tester Google account, then install via Play Store on a real device.

## Post-first-upload (closed testing requirement)

For personal Google Play developer accounts created after Nov 2023, Google requires:

- **Closed testing track** (not internal)
- **≥12 testers opted in**
- **≥14 continuous days** of testing
- Then "Apply for production access" form

Plan: after the manual internal-track upload succeeds, create a **Closed testing** track, recruit 12 testers, start the 14-day clock. This is already tracked in `docs/plans/2026-05-02-user-testing-prep.md` — no plan change here, just don't try to skip to production.

After production access is granted, change `submit.production.android.track` in `eas.json` from `"internal"` to `"production"` (or add a separate `production-public` submit profile and keep `internal` for staging).

## Verification

End-to-end signals that this plan succeeded:

| Check                      | How                                                                                                                                                  |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sourcemaps uploaded        | Sentry → Releases → most recent release has artifacts                                                                                                |
| AAB signed correctly       | Play Console "App integrity" shows both upload key fingerprint AND app signing key fingerprint after first upload                                    |
| Permissions match manifest | Play Console "App content" → Permissions matches the three in `app.json`                                                                             |
| Tester install works       | Install via Play Store internal track link on a real Android device, launch the app, record voice memo, take photo (exercises all three permissions) |
| Crash symbolicates         | Force a JS crash in the installed build (e.g. dev menu shake → throw), confirm Sentry shows readable component stack                                 |
| Build skill updated        | `apps/native-rd/.claude/skills/native-rd-build/SKILL.md` promotes `[UNTESTED]` → `[VERIFIED <date>]` for the Android production AAB row              |

## Out of scope

- Wiring CI to auto-submit (`ci-release.yml` already exists; first build is intentionally manual)
- iOS App Store submission (separate `appleId`/`ascAppId` already configured)
- OTA updates / `expo-updates` runtimeVersion policy
- Promoting closed testing → production (gated on the 14-day clock)
