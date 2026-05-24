# Codebase tour & review

Evergreen walkthrough of `native-rd`, slice by slice. Doubles as React Native learning material and an audit log. The tour is intended to be read in order by a new contributor; the audit findings are filed as a GitHub issue tree per slice (epic + sub-issues), tracked in-app as a Goal rather than as a GitHub milestone.

## Slices

| #   | Chapter                                                             | Status      |
| --- | ------------------------------------------------------------------- | ----------- |
| 1   | [Goals domain](01-goals.md)                                         | not-started |
| 2   | [Evidence & capture](02-evidence.md)                                | not-started |
| 3   | [Badges + signing/baking](03-badges.md)                             | not-started |
| 4   | [Theming + ND accessibility](04-theming-a11y.md)                    | not-started |
| 5   | [Infra (i18n, Sentry, build, navigation, db, scripts)](05-infra.md) | not-started |

Chapter status is one of: `not-started` → `in-progress` → `drafted` → `reviewed`. Update the table when a chapter's status changes.

## Tracked as a goal inside `native-rd`

The review is itself a goal inside the app — dogfooding the goal / step / evidence / badge flow while auditing it.

- **Goal:** _Tour & review the native-rd codebase_
- **Steps:** one per slice (5 total — see table above)
- **Evidence per step:** the filed GH issue tree for that slice (epic + sub-issues) plus any PRs that close them. Nothing else — GH artifacts are externally addressable, durable, and verifiable; chapter docs live in the repo as output but aren't evidence.
- **Completion artifact:** a self-signed Open Badge, baked from a custom design (designed via `BadgeDesignerScreen` during or after slice 3), with the GH issue/PR URLs as evidence claims. The badge is the verifiable proof the review happened — the PNG carries it forever.

The app goal is the primary progress tracker. GH issues are both work-output and evidence.

## Methodology

Each slice runs the same protocol:

1. **Prep** — enumerate files in scope, list RN concepts likely to need explanation, jot suspect findings to investigate during the walkthrough.
2. **Live walkthrough** — file-by-file narration; questions drive depth; findings captured inline.
3. **Writeup** — draft the chapter from the walkthrough; stage findings in [`checklist.md`](checklist.md); file findings as a GH issue tree (epic + sub-issues + `blocked-by`, in one pass). The epic per slice is linked from the in-app Goal step as evidence.

### Five lenses

Every slice is scanned through these lenses. If a lens turns up nothing, say so explicitly in the chapter — silence is ambiguous.

- **type-safety** — `any`, unsafe casts, missing return types, unchecked union narrowing
- **RN/Expo idiom** — non-idiomatic patterns; missing platform-specific handling; misuse of Expo APIs
- **perf hot paths** — render-thrash, large lists without virtualization, heavy synchronous work on the JS thread
- **a11y / ND-a11y** — WCAG 2.1 AA compliance, roles, labels, touch targets, contrast, reduced-motion, ND-specific variants
- **test coverage gaps** — uncovered branches in load-bearing code; missing regression tests tied to past bug fixes

### Severity

- **Critical** — concrete impact (crash, data loss, a11y regression hitting a real user group, security hole). Files immediately, escalated severity label.
- **Important** — meaningful smell with a plausible failure path or maintenance cost. Files in the slice batch.
- **Nice** — naming, minor inconsistencies, doc gaps. Files only if cheap; otherwise dropped, not parked.

Anything below Nice is dropped. The checklist is not a graveyard.

### Dual-channel RN explanation

The walkthrough is paced at codebase-tour speed. RN platform concepts (Metro, native modules, Fabric / new arch, threading, Yoga layout, react-navigation primitives, gesture worklets, Reanimated, etc.) get captured in tagged callout blocks inside each chapter:

> ★ RN concept ─ _name_
>
> Brief explanation, scoped to what's needed to read this slice. Links to canonical RN/Expo docs for deeper reading.

Skim them or read deep — they don't gate the chapter narrative.

## Checklist staging

[`checklist.md`](checklist.md) is the staging area for findings before they become GH issues. Once a slice's findings are filed as an epic + sub-issues, the staged entries are deleted (not archived). Filed issues are the source of truth; the staging file is ephemeral.

## Chapter template

New chapters start from [`_chapter-template.md`](_chapter-template.md). Don't deviate from the structure without updating the template — consistency is the whole point of having a tour.
