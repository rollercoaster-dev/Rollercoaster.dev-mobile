# Sub-Badges and Achievement Hierarchies — What OB 3.0 and CLR 2.0 Actually Provide

**Date:** 2026-08-30
**Status:** Research — no decision taken
**Owner:** Joe

**Scope reference:** [ADR-0012 no auto judgment](../decisions/ADR-0012-no-auto-judgment.md) · [data-model.md §Iteration C](../architecture/data-model.md) · [ob3-proof-format-spike.md](./ob3-proof-format-spike.md) · [badge-export.md](./badge-export.md) · [atproto-evaluation.md](./atproto-evaluation.md)

---

## TL;DR

The question was "how do Open Badges support sub-badges, and how should tutorial goals be scoped so they map onto the skill tree later?"

**Open Badges 3.0 has no parent/child mechanism.** Its `related` property is a bare pointer with no relationship semantics. Hierarchy lives one spec over, in **CLR 2.0's `Association` class**, whose `associationType` vocabulary (`isChildOf`, `isPartOf`, `precedes`, …) is a near-exact match for the `SkillTreeEdge` already sketched in [data-model.md §Iteration C](../architecture/data-model.md).

Three findings change what we should do now:

1. **The skill tree's edges reference _achievement_ ids, not _credential_ ids.** Achievement ids are curriculum-level and identical for every user. So the tutorial-scoping work is **not** blocked on atproto, on hosting, or on any backend.
2. **`Achievement.id` need not resolve** — confirmed in the spec, the Implementation Guide, and the validator source. It is a name, not an address.
3. **But an HTTPS-form id and a UUID-form id carry _different_ semantics across issuers**, and native-rd is a self-issuing app where every user is a distinct issuer. That single fact decides the id format.

The load-bearing change is `credentialBuilder.ts:85`, which derives the achievement id from the user's own DID plus a per-user ULID. Two people completing the same tutorial currently produce unlinkable achievement ids, which makes a shared skill tree impossible by construction.

---

## What was actually inspected

Primary sources only. Prose summaries of these specs are unreliable on exactly the points that matter here.

| Source                                                                                                                                       | What it settles                                            |
| -------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| [OB 3.0 spec](https://www.imsglobal.org/spec/ob/v3p0/) (HTML, fetched 2026-08-30)                                                            | Normative property definitions and multiplicities          |
| [`ob_v3p0_achievementcredential_schema.json`](https://purl.imsglobal.org/spec/ob/v3p0/schema/json/ob_v3p0_achievementcredential_schema.json) | Exact field shapes and enumerations                        |
| [`clr_v2p0_clrcredential_schema.json`](https://purl.imsglobal.org/spec/clr/v2p0/schema/json/clr_v2p0_clrcredential_schema.json)              | The `Association` class                                    |
| [OB 3.0 Implementation Guide §3.1.3](https://www.imsglobal.org/spec/ob/v3p0/impl)                                                            | Non-normative guidance on choosing achievement identifiers |
| [1EdTech/digital-credentials-public-validator](https://github.com/1EdTech/digital-credentials-public-validator) @ `e666bb9` (2026-08-24)     | What an external verifier _actually enforces_              |

Same validator commit as [ob3-proof-format-spike.md](./ob3-proof-format-spike.md), so the two documents describe the same engine.

---

## Finding 1 — OB 3.0 `related` carries no relationship semantics

`Achievement.related` is `[0..*]` of `Related`:

```json
{
  "id": "<the related achievement>",
  "type": ["Related"],
  "inLanguage": "<BCP47>",
  "version": "<string>"
}
```

Required: `id`, `type`. The schema description is just `"Identifies a related achievement."` There is no field for _how_ the two relate.

The presence of `inLanguage` and `version` — and the absence of anything else — shows the intended job: pointing at translations and revisions of **the same** achievement, not at a parent, child, or prerequisite. Using it to mean "child of" is a private convention no consumer will read.

### The rest of the Achievement class

Everything OB3 offers that is adjacent to hierarchy, and what each is actually good for:

| Property                                                                     | Multiplicity | Verdict for sub-badges                                                                                                                                                                                                       |
| ---------------------------------------------------------------------------- | ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `related`                                                                    | `[0..*]`     | Untyped pointer. A hint, not structure.                                                                                                                                                                                      |
| `alignment`                                                                  | `[0..*]`     | Points at an **external** framework: `targetName`, `targetUrl` (both required), `targetFramework`, `targetCode`, `targetType`. The real "this badge covers competency X" hook — but the target lives outside the credential. |
| `achievementType`                                                            | `[0..1]`     | Labels a node's _role_. Extensible enum.                                                                                                                                                                                     |
| `resultDescription` → `RubricCriterionLevel`                                 | `[0..*]`     | Sub-parts **inside one badge**, with `level` and `points`. The way to express granularity without minting a badge per step.                                                                                                  |
| `tag`                                                                        | `[0..*]`     | Free-text clustering.                                                                                                                                                                                                        |
| `specialization`, `humanCode`, `fieldOfStudy`, `creditsAvailable`, `version` | `[0..1]`     | Grouping and versioning metadata.                                                                                                                                                                                            |

`achievementType` is an extensible vocabulary — a fixed enum plus an `ext:` escape hatch matching `(ext:)[a-zA-Z0-9.\-_]+`. The fixed values are:

```
Achievement, ApprenticeshipCertificate, Assessment, Assignment,
AssociateDegree, Award, Badge, BachelorDegree, Certificate,
CertificateOfCompletion, Certification, CommunityService, Competency,
Course, CoCurricular, Degree, Diploma, DoctoralDegree, Fieldwork,
GeneralEducationDevelopment, JourneymanCertificate, LearningProgram,
License, Membership, ProfessionalDoctorate, QualityAssuranceCredential,
MasterCertificate, MasterDegree, MicroCredential, ResearchDoctorate,
SecondarySchoolDiploma
```

`Badge`, `Competency`, `Course`, `LearningProgram`, and `MicroCredential` are enough to label every node type a skill tree needs.

`Alignment.targetType` is likewise extensible, with fixed values `ceasn:Competency`, `ceterms:Credential`, `CFItem`, `CFRubric`, `CFRubricCriterion`, `CFRubricCriterionLevel`, `CTDL`.

---

## Finding 2 — CLR 2.0 `Association` is the hierarchy mechanism

The CLR 2.0 schema defines a class OB 3.0 does not have:

```json
{
  "type": "Association",
  "associationType": "isChildOf",
  "sourceId": "<achievement id>",
  "targetId": "<achievement id>"
}
```

All four properties required; `additionalProperties: false`. Schema description:

> An Association describes the semantic relationship between two achievements and the credentials that assert those achievements.

`associationType` is a **closed** enumeration — unlike `achievementType`, there is no `ext:` escape:

| Value                      | Meaning                                 |
| -------------------------- | --------------------------------------- |
| `isChildOf` / `isParentOf` | Hierarchy, both directions              |
| `isPartOf`                 | Composition — a piece of a larger whole |
| `isPeerOf`                 | Sibling / equivalent standing           |
| `isRelatedTo`              | Untyped association                     |
| `precedes`                 | Sequence — comes before                 |
| `replacedBy`               | Supersession                            |
| `exactMatchOf`             | Identity across frameworks              |

Associations live on `ClrSubject.association[]`, alongside `ClrSubject.verifiableCredential[]` — many OB3 badges bundled into one signed record, each still independently verifiable, plus the typed edges between them.

### This is the skill tree, already standardised

Compare against what [data-model.md §Iteration C](../architecture/data-model.md) already sketches:

| native-rd (planned)              | CLR 2.0                                     |
| -------------------------------- | ------------------------------------------- |
| `SkillTreeEdge.from_node_id`     | `Association.sourceId`                      |
| `SkillTreeEdge.to_node_id`       | `Association.targetId`                      |
| `SkillTreeEdge.label` (freeform) | `Association.associationType` (closed enum) |
| `GoalLink` (badge → larger goal) | `Association` with `isPartOf`               |

The one mismatch is `label`. Ours is freeform; CLR's is a closed vocabulary. If `SkillTreeEdge.label` adopts the eight CLR values verbatim — as a constrained set, with freeform text moved to a separate optional `note` field if we want it — then exporting the tree as a `ClrCredential` becomes serialisation rather than remodelling.

### What the validator enforces about associations: nothing

`CLR20Inspector` (`e666bb9`) runs six probes: `CredentialParseProbe`, `JsonSchemasProbe`, `InlineJsonSchemaProbe`, `ClrSubjectProbe`, and one of `ExternalProofProbe` / `EmbeddedProofProbe`. A case-insensitive grep for `association` across every `.java` file in the repository returns **zero matches**.

So associations are checked for JSON shape and nothing else. There is **no referential-integrity check** — `sourceId` and `targetId` are not verified to correspond to any achievement present in the bundle, and cycles are not detected. Both are ours to enforce.

---

## Finding 3 — achievement ids do not need to resolve

Checked three ways, because it determines whether any of this depends on hosting.

**Normative spec (§B.1.1):** `id`, type `URI`, multiplicity `[1]`, description `"Unique URI for the Achievement."` No MUST or SHOULD regarding resolution. The word _resolvable_ does not appear anywhere in the specification. The only dereferencing requirement in the entire document is §8.5, _Dereferencing the Public Key_.

**Validator:** `OB30Inspector` runs fourteen probes. None fetches `achievement.id`. `CredentialSubjectProbe` inspects `achievement` structurally only — that `resultDescription` entries carry the right type, and that `criteria` has an `id` or a `narrative`.

**Implementation Guide §3.1.3** names both options outright:

> **Use an HTTPS URL as the identifier**: Issuer systems and other achievement publishing systems can publish achievements at the identifier URLs.
>
> **Use a UUID**: Issuers sometimes assign an identifier that is assumed to be locally unique to that issuer but **cannot be dereferenced**.

A non-resolving id is explicitly sanctioned.

### But the two forms mean different things across issuers

The same section states the consequence:

> When relying parties encounter the same HTTPS-type achievement ID in AchievementCredentials **across multiple issuers**, they can assume that the issuers did intend to recognize the same achievement, as it is defined by its publisher […]
>
> When the same UUID-type `Achievement.id` is referenced by **different issuers** across multiple OpenBadgeCredentials, relying parties **cannot authoritatively determine that the intent was to recognize the same semantic achievement**.

This lands directly on us. native-rd badges are self-signed: the earner is also the issuer (`credentialBuilder.ts:107-112`, "Self-sovereign assertion"). **Two people completing the same tutorial are, to the spec, two different issuers referencing one achievement id.** That is precisely the case the guide says a `urn:`/UUID id cannot carry.

So HTTPS is not merely the tidier option here — it is the only form under which a shared tutorial means the same thing in two people's trees.

### Versioning belongs in a field, not the path

§3.1.3 also settles how revisions work: the id stays constant across versions, differing embedded metadata under one id is expected, and `Achievement.version` labels each revision. Relying parties may re-fetch the id URL for the issuer's current understanding.

So: `https://rollercoaster.dev/achievements/tutorial/git-basics` with `version: "1"` — **not** `…/git-basics/v1`. Putting the version in the path mints a new achievement on every edit and breaks every association edge pointing at the old one.

---

## Finding 4 — what this does and does not depend on

Two id namespaces get conflated whenever hosting comes up. Separating them is what makes the tutorial work independent of [atproto-evaluation.md](./atproto-evaluation.md).

|                    | What it identifies             | Who owns it     | Same for all users? | Needs hosting?     |
| ------------------ | ------------------------------ | --------------- | ------------------- | ------------------ |
| **Achievement id** | The tutorial _definition_      | Us (curriculum) | Yes                 | No — see Finding 3 |
| **Credential id**  | One person's _earned instance_ | The earner      | No                  | Only if published  |

`Association.sourceId` / `targetId` reference **achievement** ids. The entire sub-badge structure therefore lives in the first row: curriculum, not identity.

**Not dependent on atproto or any backend:** tutorial slugs, `achievementType`, `tag[]`, `related[]`, typed edges stored locally, and the tree rendering and validating offline.

**Dependent on a publication target** (atproto, or the `badges.rollercoaster.dev` tier in [badge-export.md](./badge-export.md)): a resolvable address for an _earned_ badge, a shareable `ClrCredential` bundle, and key rotation so a lost phone does not orphan the tree.

The atproto evaluation warns against letting "atproto gives us a resolvable DID" justify a dependency, since the `did:key` problem is a local encoding fix. The same caution applies here in the other direction: choosing an HTTPS achievement id is a **naming** decision, and it does not oblige us to stand up infrastructure before it pays off.

---

## The blocker in today's code

`credentialBuilder.ts:82-87`:

```ts
// NOTE (Iteration A): Appending a path segment to a did:key: identifier produces
// an invalid DID URL — did:key: DIDs do not support path components per the spec.
// A proper achievementId should be a separate HTTPS URI. Fixed in Iteration D.
const achievementId = iri(
  `${input.issuerDid}/achievements/${encodeURIComponent(input.goal.id)}`,
);
```

The existing comment names the DID-URL syntax problem. There is a second, larger one it does not name: **`input.goal.id` is a per-user ULID, and `input.issuerDid` is a per-device key.** Both halves are personal. The same tutorial completed by two people yields two unrelated achievement ids, so no association can ever connect them and no shared tutorial track can exist.

For user-authored goals this is correct behaviour — a private goal _should_ have a private, locally-unique id, and Finding 3's UUID caveat does not bite because there is only ever one issuer. The distinction is between **catalog** achievements (tutorials, ours, shared) and **personal** achievements (user goals, theirs, unique).

The minimal change: `CredentialInput` gains an optional catalog achievement id, used when present and falling back to today's derivation when absent. Small, local, no new dependencies, and it unblocks everything else in this document.

---

## Proposal for tutorial scoping

Ordered cheapest-first. None of it requires building the tree.

1. **One tutorial = one small goal = one badge.** Steps stay steps. Badge-per-step is the failure mode; `resultDescription` + `RubricCriterionLevel` express within-badge granularity if we need it (Finding 1).

2. **Give tutorials stable HTTPS catalog ids.** `https://rollercoaster.dev/achievements/tutorial/<slug>`, version carried in `Achievement.version`. Nothing needs to be served at the URL today. Serving static JSON later upgrades the id from a name to an address for free.

3. **Add the `catalogAchievementId` input to `credentialBuilder`.** The blocker above. Everything else assumes it.

4. **Set `achievementType`.** Tutorial → `Badge`. Tutorial track → `LearningProgram`. Abstract skill node → `Competency`. One line, spec-valid, and it is what makes a tree node renderable by role.

5. **Constrain `SkillTreeEdge.label` to the CLR `associationType` vocabulary.** Eight values, listed in Finding 2. Costs nothing now and makes the Iteration C export a serialisation.

6. **Populate `tag[]` on tutorial achievements.** [data-model.md:113](../architecture/data-model.md) already reserves tags for skill-tree grouping, and tutorials are the one place we control the taxonomy rather than inferring it.

7. **Emit `related[]` child → parent.** Cheap and valid, but a hint only (Finding 1). The authoritative edge is the local typed one.

---

## Open questions

**Prerequisites versus gating.** `precedes` is in the CLR vocabulary and is the natural way to say "this tutorial comes before that one." Rendered as a lock, it becomes exactly the judgment [ADR-0012](../decisions/ADR-0012-no-auto-judgment.md) bans. Proposed position, not yet decided: **associations describe the map, they never lock a node.** Ghost nodes stay openable; sequence is information, not permission.

**Unverifiable authorship.** The Implementation Guide notes that OB 2.0 verifiers treated same-domain achievement and issuer ids as a trust signal, and that OB 3.0 drops this, since issuer profiles no longer need HTTP ids. A `rollercoaster.dev` achievement id asserted by a user's `did:key` is therefore normal and unremarkable — but no verifier can confirm we authorised it, and the guide defers verifiable authorship to a future version. Fine for a personal skill tree. Worth stating plainly before anyone treats a tutorial badge as an authoritative credential.

**Catalog distribution.** Tutorial definitions have to reach the device somehow — bundled with the app, fetched, or both. Bundling keeps the offline-first guarantee; fetching lets the catalog grow without a release. Not urgent, but it decides whether tutorial content is versioned with the app or independently.
