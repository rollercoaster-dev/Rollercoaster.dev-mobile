---
version: X.Y.Z
versionCode: NNN
date: YYYY-MM-DD
---

# Testing notes — X.Y.Z

## Google Play — What's new (en-US, max 500 chars)

End-user copy. Lead with the user benefit, not the implementation. No PR numbers, no jargon. Tight — 500 chars goes fast.

<!-- play:start -->

TODO: 2–4 short bullets or a single paragraph describing what improved for the user in plain language.

<!-- play:end -->

## App Store — Release notes (en-US, max 4000 chars)

End-user copy. Same voice as Play, but you have room for more detail. Group as Features / Improvements / Fixes if helpful.

<!-- appstore:start -->

**New**

- TODO

**Improved**

- TODO

**Fixed**

- TODO
<!-- appstore:end -->

## TestFlight — What to test (max 4000 chars)

Tester-facing QA brief. For each notable change: what to do, what to expect, what edge cases matter. PR numbers and internal terms are fine here.

<!-- testflight:start -->

**Focus areas this build**

- TODO: feature → steps to exercise → expected result

**Known issues / skip these**

- TODO: anything that's broken-on-purpose or out of scope

**Reporting**

- File anything weird in GitHub issues with the build number from Settings → About.
<!-- testflight:end -->
