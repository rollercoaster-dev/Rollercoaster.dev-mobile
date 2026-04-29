# Open Badges Opportunity Import Research

**Date:** 2026-04-23
**Status:** Initial research for vision doc
**Goal:** Determine whether native-rd can import badge opportunities from Open Badges platforms in the wild, let the user create their own steps and evidence in native-rd, and then earn a native-rd badge based on that imported opportunity.

## Summary

Yes, this feature makes sense. The right feature shape is **Import Badge Opportunity**, not backpack import and not external step import.

Open Badges platforms often publish an unearned badge definition that says what the badge is, who offers it, what image represents it, what criteria are expected, and what skills or standards it aligns to. In Open Badges 2.0 this object is a `BadgeClass`. In Open Badges 3.0 the equivalent concept is an `Achievement`. Credly also exposes useful public badge template data, but not as standard Open Badges JSON-LD.

For native-rd, that means we can import the external badge as source metadata for a goal. native-rd should not import steps from the external platform. The user still defines steps and attaches evidence in our system. When the goal is complete, native-rd issues its own badge and preserves a reference back to the imported opportunity.

The strongest first version is:

1. User pastes a public badge URL or uploads badge JSON.
2. native-rd extracts badge opportunity metadata.
3. native-rd creates a goal draft with imported name, description, criteria reference, image, issuer, source URL, tags, and alignments.
4. User edits the goal and creates their own steps and evidence requirements.
5. On completion, native-rd issues the normal local badge with source attribution to the imported opportunity.

## Product Boundary

This is what the feature is:

- Import an unearned external badge definition as a starting point for a native-rd goal.
- Treat external criteria as reference material, not as native-rd steps.
- Let the user decide what local steps and evidence prove the goal.
- Issue a native-rd credential when the local goal is complete.
- Preserve the external source so a viewer can see what opportunity inspired or aligned to the local badge.

This is not:

- A backpack for already earned badges.
- A claim that the external issuer awarded the user a badge.
- A general integration where another platform sends completion events.
- A system for importing another platform's learning path or step structure.

The important trust language is: **"This native-rd badge was created from / aligned to / inspired by this external badge opportunity."** It should not say **"Issuer X awarded this badge"** unless Issuer X actually issued the credential.

## Standards Fit

Open Badges already has the concept we need, but naming differs by version.

| Version             | Opportunity object | Awarded object                                  | Useful fields for native-rd                                                                              |
| ------------------- | ------------------ | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Open Badges 2.0     | `BadgeClass`       | `Assertion`                                     | `id`, `name`, `description`, `image`, `criteria`, `issuer`, `alignment`, `tags`                          |
| Open Badges 3.0     | `Achievement`      | `OpenBadgeCredential` / `AchievementCredential` | `id`, `name`, `description`, `criteria`, `image`, `creator`, `alignment`, `resultDescription`            |
| Credly public pages | Badge template     | Issued badge                                    | `name`, `description`, `image_url`, `issuer`, `skills`, `alignments`, `badge_template_activities`, `url` |

The Open Badges 2.0 specification defines `BadgeClass` as information about the accomplishment recognized by a badge, with fields for name, description, image, criteria, issuer, alignments, and tags. It also states that `Criteria` is where would-be recipients learn what is required to be recognized with the badge.

The Open Badges 3.0 specification says an `OpenBadgeCredential` claims that a subject met the criteria of a specific `Achievement`, and notes that `Achievement` is the new name for the older `BadgeClass` concept.

That is enough for native-rd's import model. We are importing the `BadgeClass` / `Achievement` / template, not the awarded credential.

## Native-rd Fit

Current native-rd is already close to the right model:

- `badge` rows are completed awards tied to a `goalId`.
- `useCreateBadge` generates an OB3-shaped credential from the completed goal and evidence.
- Evidence already supports user-controlled artifacts such as photo, text, voice memo, video, link, and file.
- `png-baking` can bake and unbake OB3/OB2 badge chunks for earned credentials, which may help later for file import.

The missing concept is a **source opportunity** separate from the completed local `badge`.

Recommended model:

| Concept                      | Purpose                                                                               |
| ---------------------------- | ------------------------------------------------------------------------------------- |
| `importedBadgeOpportunity`   | Raw and normalized data imported from an external badge definition.                   |
| `goal.importedOpportunityId` | Optional link from a native-rd goal to the imported source.                           |
| `badge.sourceOpportunityId`  | Optional link from the earned native-rd badge back to the opportunity that seeded it. |

This keeps the current earned badge flow intact. It adds a source record that can be shown during goal creation and cited after the badge is earned.

## In-the-Wild Findings

### Badgr / Canvas Credentials / Parchment

Badgr public badge pages expose standard Open Badges 2.0 `BadgeClass` JSON when `.json` is appended to the public badge URL.

Tested examples:

- `https://badgr.com/public/badges/TCOE5nqMSrGjX0nh_NgK8w.json`
- `https://badgr.com/public/badges/iOMWsaF1QbmMCofM54JlUg.json`
- `https://badgr.com/public/badges/K829IK8RS6ercwkpeFOn-Q.json`
- `https://badgr.com/public/badges/0I52e1O8Rx-NMSKQoPcktg.json`

What was available:

- `@context: https://w3id.org/openbadges/v2`
- `type: BadgeClass`
- stable badge `id`
- `name`
- `description`
- `image`
- `issuer`
- `criteria.id` or `criteria.narrative`
- sometimes `alignment`
- sometimes `tags`

Import viability: **high**.

The only implementation wrinkle is content negotiation. Some Badgr public pages returned HTML even when JSON was requested, and at least one response advertised a misleading JSON-ish content type. The importer should try `.json` fallback, then validate the body shape instead of trusting `Content-Type`.

### Credly

Credly public badge pages expose useful public badge template data, but not as standard Open Badges JSON-LD.

Tested examples:

- `https://www.credly.com/org/badge-nation/badge/open-badges-101`
- `https://www.credly.com/org/the-open-group/badge/the-open-group-certified-archimate-essentials-3-1`

What was available:

- `name`
- `description`
- `image_url`
- public page `url`
- issuer organization
- skills
- alignments
- badge type, level, time to earn, cost
- `badge_template_activities`, which can be treated as criteria-like reference text

Import viability: **high with a Credly adapter**.

The public API endpoints tested returned `401`, so the path is not "call Credly's authenticated API." The useful path is "parse the public badge page response." The page contains enough embedded JSON to build a native-rd goal draft.

### Open Badges 3.0 Achievement URLs

OB3 clearly supports the data shape we need through `Achievement`, but public standalone OB3 `Achievement` URLs were harder to find in a quick scan than OB2 `BadgeClass` and Credly templates.

Import viability: **high by model, unproven by volume**.

native-rd should still support OB3 `Achievement` input because it is the current standard and openbadges-system should publish that shape. We should expect the first "badges in the wild" wins to come from OB2 `BadgeClass` and provider-specific adapters.

## Field Mapping

Normalize all imports into one internal shape before creating the goal draft.

| Native-rd field | OB2 `BadgeClass`             | OB3 `Achievement`                    | Credly template                     |
| --------------- | ---------------------------- | ------------------------------------ | ----------------------------------- |
| `sourceUrl`     | pasted URL or `id`           | pasted URL or `id`                   | `url`                               |
| `sourceType`    | `openbadges-v2-badge-class`  | `openbadges-v3-achievement`          | `credly-template`                   |
| `sourceId`      | `id`                         | `id`                                 | `id`                                |
| `title`         | `name`                       | `name`                               | `name`                              |
| `description`   | `description`                | `description`                        | `description`                       |
| `criteriaText`  | `criteria.narrative`         | `criteria.narrative`                 | `badge_template_activities[].title` |
| `criteriaUrl`   | `criteria.id`                | `criteria.id`                        | activity URLs when present          |
| `imageUrl`      | `image` or `image.id`        | `image` or `image.id`                | `image_url`                         |
| `issuerName`    | issuer profile `name`        | creator/issuer profile `name`        | issuer organization `name`          |
| `issuerUrl`     | issuer profile `url` or `id` | creator/issuer profile `url` or `id` | organization vanity URL             |
| `tags`          | `tags`                       | extension or alignment-derived tags  | `skills[].name`                     |
| `alignments`    | `alignment`                  | `alignment`                          | `alignments`                        |
| `rawJson`       | full source JSON             | full source JSON                     | extracted public JSON               |

Goal creation should use the normalized fields this way:

| Goal draft field       | Source                                                      |
| ---------------------- | ----------------------------------------------------------- |
| Goal title             | Imported badge name                                         |
| Goal description       | Imported badge description plus optional criteria reference |
| Goal image/design seed | Imported image URL, if allowed by policy                    |
| Reference panel        | Criteria, issuer, source URL, skills, alignments            |
| Steps                  | Created by the user in native-rd                            |
| Evidence requirements  | Created by the user in native-rd                            |

## Import Algorithm

1. Accept a URL, JSON paste, JSON file, PNG, or SVG.
2. If URL, fetch with `Accept: application/ld+json, application/json, text/html`.
3. For JSON results, detect shape by `type`, `@context`, and known provider fields.
4. For HTML responses, try known fallbacks:
   - append `.json` for Badgr-style public badge URLs
   - parse `<script type="application/ld+json">`
   - parse known embedded provider data, starting with Credly
   - scrape minimal Open Graph metadata only as a last resort
5. If the result is a baked badge image, unbake it and inspect the embedded assertion or credential. If it only contains an earned credential, offer to import its achievement metadata as the opportunity source, not the earned badge.
6. Normalize into `ImportedBadgeOpportunity`.
7. Show a preview before creating anything.
8. Create a local goal draft linked to the imported opportunity.
9. Let the user create steps and evidence.
10. When complete, issue a native-rd badge and include a source reference to the imported opportunity.

## Generated Credential Strategy

When native-rd issues the final badge, it should keep the source relationship visible but avoid misrepresenting issuer authority.

Recommended wording in generated metadata:

- Achievement name can be user-edited, seeded from the imported opportunity.
- Achievement criteria should describe the native-rd goal and local evidence process.
- Evidence can include local evidence artifacts.
- Add a source reference to the imported opportunity through one of:
  - `alignment` if the source represents an external standard, skill, or competency
  - an extension property for `sourceOpportunity`
  - an evidence item that names the imported opportunity as the goal source

The vision doc should decide the exact OB3 representation. The product rule is clearer than the schema detail: the earned badge is issued by native-rd, and the external badge is source context.

## openbadges-system Implications

This feature should also guide openbadges-system. If openbadges-system wants other tools to import badge opportunities cleanly, it should publish stable public opportunity URLs.

Recommended openbadges-system behavior:

- Publish OB3 `Achievement` JSON-LD at stable URLs.
- Optionally publish OB2 `BadgeClass` JSON for compatibility.
- Support browser HTML pages and machine-readable JSON from the same public badge URL.
- Support `.json` fallback URLs because that is common in the wild.
- Include strong `criteria.narrative`, image, issuer/creator, tags, and alignments.
- Do not require native-rd-specific steps in the public badge data.
- If native-rd hints are useful, publish them as optional extension metadata only.

The first interoperability target should be "any app can import the opportunity metadata." native-rd can then add its own local-first step system on top.

## UX Notes

The import screen should be framed as creating a local goal from an external opportunity.

Important labels:

- "Import Badge Opportunity"
- "Source badge"
- "Use as goal starting point"
- "Create your own steps"
- "Earn in native-rd"

Avoid labels that imply external issuer authority:

- "Claim this badge from Credly"
- "Earn issuer badge"
- "Awarded by Badgr"
- "Verified by external issuer"

The preview should show:

- badge image
- name
- issuer/source
- description
- criteria reference
- skills/alignments
- source URL
- warning when metadata is sparse or provider-specific

## Risks

| Risk                                                    | Impact                                                         | Mitigation                                                                     |
| ------------------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Public badge metadata is inconsistent across platforms. | Some imports will be sparse or fail.                           | Use adapter-based import and preview before creating a goal.                   |
| Provider pages are not stable APIs.                     | Credly parsing may break.                                      | Treat provider adapters as best-effort and store raw source snapshots.         |
| Criteria can be too vague or too long.                  | Users may not know how to make steps.                          | Show criteria as reference text and keep step creation user-owned.             |
| Imported image reuse may have licensing constraints.    | We may copy artwork we should only reference.                  | Decide whether to cache images, hotlink, or require user confirmation.         |
| Issuer trust can be misrepresented.                     | Users/viewers may think the external issuer awarded the badge. | Use clear wording and source attribution in UI and credential metadata.        |
| Local-first import needs network at import time.        | Offline users cannot fetch a URL immediately.                  | Allow JSON/file/image import and store source snapshots for later offline use. |

## Open Questions

- Should native-rd store imported opportunity data on the goal, in a separate table, or both?
- Should imported badge images be copied into local storage, referenced remotely, or converted into a native-rd design seed?
- What exact OB3 field should carry the source opportunity relationship in the final native-rd credential?
- Should users be allowed to edit imported title/description before creating the goal, and how much source metadata should remain immutable?
- How should the UI distinguish "source criteria" from "my evidence requirements"?
- Should native-rd support provider-specific adapters in the mobile app, or should openbadges-system provide a normalization service?
- What is the minimum viable provider set for the first release: OB2 `BadgeClass`, OB3 `Achievement`, Badgr `.json`, and Credly public pages?
- Do we need a copyright/attribution policy before using external badge images in generated native-rd credentials?

## Research Sources

- [1EdTech Open Badges overview](https://www.1edtech.org/standards/open-badges)
- [Open Badges 3.0 specification](https://www.imsglobal.org/spec/ob/v3p0/)
- [Open Badges 3.0 implementation guide](https://www.imsglobal.org/spec/ob/v3p0/impl/)
- [Open Badges 2.0 final specification](https://www.imsglobal.org/sites/default/files/Badges/OBv2p0Final/index.html)
- [Badgr public BadgeClass example: Trademarks](https://badgr.com/public/badges/TCOE5nqMSrGjX0nh_NgK8w.json)
- [Badgr public BadgeClass example: PNSG 2340](https://badgr.com/public/badges/iOMWsaF1QbmMCofM54JlUg.json)
- [Badgr public BadgeClass example: PNSG 2415](https://badgr.com/public/badges/K829IK8RS6ercwkpeFOn-Q.json)
- [Badgr public BadgeClass example: Mastered Turning Game](https://badgr.com/public/badges/0I52e1O8Rx-NMSKQoPcktg.json)
- [Credly public template example: Open Badges 101](https://www.credly.com/org/badge-nation/badge/open-badges-101)
- [Credly public template example: The Open Group Certified ArchiMate Essentials 3.1](https://www.credly.com/org/the-open-group/badge/the-open-group-certified-archimate-essentials-3-1)
- native-rd schema and badge creation code:
  - `apps/native-rd/src/db/schema.ts`
  - `apps/native-rd/src/hooks/useCreateBadge.ts`
  - `apps/native-rd/src/badges/png-baking.ts`
