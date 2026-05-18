# Release Testing Notes

One file per released version, named `<version>.md` (e.g. `0.1.5.md`). Each file feeds **three different store fields**, each with its own audience and hard length limit. The linter (`bun run release-notes:lint`) enforces the limits in CI.

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

Currently `en-US` only. When additional locales are added (see `apps/native-rd/docs/i18n.md`), this format will grow per-locale slices (`play:en-US:start`, `play:de-DE:start`, etc.) and the Fastlane metadata layout will mirror that.

## Flow into stores

The hand-written notes here are the **source of truth**. Downstream automation (planned, not yet built — see `docs/release.md`) will:

1. Copy the `play` body into `fastlane/metadata/android/en-US/changelogs/<versionCode>.txt`.
2. Copy the `appstore` body into `fastlane/metadata/ios/en-US/release_notes.txt`.
3. Pass the `testflight` body to the App Store Connect API as the build's `whatToTest` localization.

Until that automation lands, copy/paste manually when promoting a build.
