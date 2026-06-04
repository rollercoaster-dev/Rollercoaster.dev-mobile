# Release Testing Notes

One file per released version, named `<version>.md` (e.g. `0.1.5.md`). Each file feeds **three different store fields**, each with its own audience and hard length limit. The linter (`bun run release-notes:lint`) is designed to gate the release-please PR — wire it into CI when ready. It is not currently invoked by `ci-native-rd.yml` (which excludes `apps/native-rd/docs/**`); run it manually before tagging.

## The three fields

| Section in this doc | Where it ships                                                         | Audience                                 | Hard limit                     |
| ------------------- | ---------------------------------------------------------------------- | ---------------------------------------- | ------------------------------ |
| `play`              | Google Play Console → "What's new in this version" (per `versionCode`) | End users browsing the Play listing      | **500 characters** per locale  |
| `appstore`          | App Store Connect → "What's New in This Version" (per version)         | End users browsing the App Store listing | **4000 characters** per locale |
| `testflight`        | App Store Connect → TestFlight → "What to Test" (per build)            | Internal + external TestFlight testers   | **4000 characters**            |

The Play and App Store fields are **user-facing release notes** — write them as marketing copy ("Goals now show your next step on the home card"). The TestFlight field is **tester instructions** — write it as a QA brief ("Create a goal, tap into it, verify the next-step text appears on the card and matches the first incomplete step").

Do not put internal jargon, PR numbers, or commit hashes in `play` or `appstore`. They are fine in `testflight`.

## File format

Each version file uses HTML comment markers to delimit the three slices. The headings around them are documentation; the markers are what the linter parses.

```md
---
version: 0.1.5
versionCode: 12
date: 2026-05-25
---

# Testing notes — 0.1.5

## Google Play — What's new (en-US, max 500 chars)

<!-- play:start -->

Free-form text here.

<!-- play:end -->

## App Store — Release notes (en-US, max 4000 chars)

<!-- appstore:start -->

Free-form text here.

<!-- appstore:end -->

## TestFlight — What to test (max 4000 chars)

<!-- testflight:start -->

Free-form text here.

<!-- testflight:end -->
```

`_template.md` is the canonical starting point — copy it to `<next-version>.md` when starting a release.

## Character counting

The linter measures the **trimmed body between the markers**, in JavaScript `String.length` units (UTF-16 code units). This matches how App Store Connect and Play Console count, which both treat each character as one regardless of byte width — but emoji and combining marks may count as 2+ code units. Avoid emoji in the `play` slice especially; the 500-char budget is tight.

## Localization

Currently `en-US` only. When additional locales are added (see `apps/native-rd/docs/i18n.md`), this format will grow per-locale slices (`play:en-US:start`, `play:de-DE:start`, etc.).

## End-to-end flow

The hand-written notes here are the **source of truth**. Three scripts move them through the pipeline:

### 1. Scaffold a new version

```sh
bun run release-notes:generate 0.1.5
```

Parses `CHANGELOG.md` for the version, pre-fills each slice with `TODO: ` bullets, writes `0.1.5.md`. Internal-scope commits (`ci:`, `chore:`, `build:`, `deps:`, `release:`) are filtered out of user-facing slices.

### 2. Edit each slice

Open `0.1.5.md` and rewrite every line that starts with `TODO:`:

- **play** / **appstore**: user-facing copy. No jargon, no PR numbers.
- **testflight**: tester instructions. Steps to exercise → expected result.

Internal terms and PR numbers are fine in `testflight` only.

### 3. Validate length and absence of TODOs

```sh
bun run release-notes:lint
```

Fails if any slice exceeds its store limit, is missing markers, or still contains `TODO`. Wire this into CI on the release-please PR to gate merge.

### 4. Split into store-bound artifacts

```sh
bun run release-notes:split 0.1.5
```

Produces:

| Output                                                       | Purpose                                                                         |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| `apps/native-rd/store.config.json`                           | EAS Metadata config — read by `eas metadata:push` to set App Store "What's New" |
| `apps/native-rd/.release-artifacts/play-changelog-en-US.txt` | Raw text for Play Console "What's new" (manual paste or future API push)        |
| `apps/native-rd/.release-artifacts/what-to-test.txt`         | Raw text to paste into App Store Connect → TestFlight → "What to Test"          |

The splitter refuses to write any output if the notes file still contains `TODO` markers — same check as `release-notes:lint`, enforced again here so CI can't sneak past it.

### 5. Push to stores

**iOS App Store + TestFlight:**

```sh
eas metadata:push --profile production
eas submit --platform ios --profile production
```

Then paste `apps/native-rd/.release-artifacts/what-to-test.txt` into App Store Connect → TestFlight → the build → "What to Test". `eas submit --what-to-test` is not used (the flag does not work on our EAS plan tier, so the pipeline stopped trying to send it automatically).

**Android Play "What's new":** there is no `eas submit` flag for this. Three options, in increasing order of automation:

1. **Manual paste** — open Play Console → Production → "What's new in this version" → paste the contents of `play-changelog-en-US.txt`. Fine for now.
2. **Fastlane Supply** — requires Ruby. Reads `fastlane/metadata/android/<locale>/changelogs/<versionCode>.txt`. Heavier dependency.
3. **Play Developer API push** (planned) — a small Bun script using `googleapis` to call `androidpublisher.edits.tracks.update` with `releases[0].releaseNotes`. Same service account credentials as `eas submit --platform android`; no additional permissions needed.

## Static App Store metadata

EAS Metadata's `apple.info.en-US` block requires `title` and `privacyPolicyUrl` alongside `releaseNotes`. These stable values live in `apps/native-rd/store.config.base.json` (committed), and the splitter merges them with the per-release `releaseNotes` to produce the generated `store.config.json` that `eas metadata:push` consumes.

Current values:

| Field              | Value                               | Source of record                                      |
| ------------------ | ----------------------------------- | ----------------------------------------------------- |
| `title`            | `Rollercoaster.dev`                 | `apps/native-rd/app.json` (`expo.name`)               |
| `privacyPolicyUrl` | `https://rollercoaster.dev/privacy` | `apps/native-rd/docs/launch/app-store-launch-plan.md` |

Update `store.config.base.json` through a normal PR. Schema is validated by `eas metadata:lint --profile production`.

> The privacy policy page must be live at the URL above before `eas metadata:push` runs in production. Follow the launch-readiness item in `apps/native-rd/docs/launch/production-release-plan.md` (issue #976).

## Reference: store fields and limits

| Section in this doc | Store field                                      | Limit             | API                                                                     |
| ------------------- | ------------------------------------------------ | ----------------- | ----------------------------------------------------------------------- |
| `play`              | Play Console → "What's new in this version"      | 500 chars/locale  | Play Developer API: `edits.tracks.update` → `releases[].releaseNotes[]` |
| `appstore`          | App Store Connect → "What's New in This Version" | 4000 chars/locale | EAS Metadata: `apple.info.<locale>.releaseNotes`                        |
| `testflight`        | TestFlight → "What to Test"                      | 4000 chars        | Manual paste into App Store Connect (no automated API on our plan)      |
