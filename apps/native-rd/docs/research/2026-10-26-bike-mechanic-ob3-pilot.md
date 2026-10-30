# Bike-Mechanic OB3 Pilot — ECI NextGen Mechanics Report and Credential Trust

**Date:** 2026-10-26
**Status:** Research, not a decision. Nothing here is scoped or agreed.
**Owner:** Joe

**Scope reference:** [Product vision](../vision/product-vision.md) · [Community Learning and Peer Validation](../vision/community-learning-and-peer-validation.md) · [ADR-0012 no-auto-judgment](../decisions/ADR-0012-no-auto-judgment.md) · [ADR-0014 containment offers, never refuses](../decisions/ADR-0014-containment-offers-never-refuses.md) · [openbadges-sub-badges.md](./openbadges-sub-badges.md) · [2026-09-20-ob3-linked-achievements.md](./2026-09-20-ob3-linked-achievements.md) · [openbadges-external-earning-research.md](./openbadges-external-earning-research.md)

**Baseline:** `main` at `aad2e486`. **Trigger:** a YouTube transcript summarising the ECI report. Every transcript claim was checked against the report PDF itself. All web sources fetched 2026-10-26.

**Glossary:** acronyms and evidence labels are defined in [glossary-community-credentialing.md](./glossary-community-credentialing.md). In short: [verified] read in the primary source, [secondary] press or vendor coverage only, [unverified] not found, [inference] my reasoning.

---

## TL;DR

- **The ECI report is real and the transcript's numbers hold.** 175k mechanics in Europe, 45k short today, 105k recruits needed by 2032. One overstatement: the report asks to _research_ informal routes, not to recognise them.
- **The report never mentions badges, digital credentials, ESCO, EQF or Europass.** It asks for a portable, modular entry qualification. Nobody in the bike sector issues a verifiable digital credential today.
- **A pilot is possible, but not with what ships today.** A self-issued badge proves integrity, not trust. Trust needs third-party endorsements and ESCO alignment. One of five engineering preconditions is done ([#761](https://github.com/rollercoaster-dev/Rollercoaster.dev-mobile/pull/761)); four remain, see §6.
- **Europass (EDC) is out of reach for a phone app.** It needs an organisational eIDAS seal and there is no OB3-to-ELM mapping.

**Not worth doing if:** no repair hub or VET partner will engage after the 5 Nov 2026 ECI webinar, or the pilot cannot show that at least one workshop reads the badge (open question 4).

---

## 1. The ECI report: what it says

**Source:** [NextGen Mechanics Report 2026 (PDF)](https://cyclingindustries.com/wp-content/uploads/2026/09/Nextgen-Mechanics-Report-.pdf), listed on [ECI Publications](https://cyclingindustries.com/publications/) as dated 30 Sep 2026. Page numbers below are the report's printed page numbers.

### Transcript claims, checked

Each claim from the transcript, then the verdict and where it sits in the report.

- **Published at the ECI Summit, Brussels, 30 Sep 2026.** [verified] Publications page date. The [ECI webinar page](https://cyclingindustries.com/news/details/eci-webinar-europe-needs-105000-more-bike-mechanics-by-2032-how-will-we-get-there/) says "Published at the ECI Summit in Brussels". It was originally planned for the CIE Summit in Oct 2025, per [Shimano's 2025 launch release](https://bicycleretailer.com/announcements/2025/06/30/shimano-europe-launches-european-call-evidence-tackle-urgent-bicycle) [secondary host].
- **About 175k mechanics in Europe.** [verified] p4, p19, appendix p46 (160k retail plus 15k fleet and other).
- **About 45k shortfall today.** [verified] p4, p9, p19. Model value 44,750 (p47). About 19k of it is net new posts; the rest is replacement at 15% turnover.
- **About 105k recruits needed by 2032.** [verified] p4, p18, p19. Model value 105,418 (p48). It _includes_ the 45k: 45k now plus 61k growth. It equals "60% of the workforce".
- **About 247k needed by 2032.** [verified] p19, p45. This is the total workforce after demand is met (247,348, p48), "roughly 40%" above today.
- **600+ survey responses, 30 countries.** [verified] p9 ("over 600 responses across 30 European Countries"). The survey was dated July 2025 (p10, p26).
- **Grew out of Shimano's Next Gen Mechanics.** [verified] Appendix title: "Report to Shimano Europe for the NextGen Mechanics Project" (p45). Shimano Europe launched the call for evidence with Cycling Industries Europe on 30 Jun 2025.
- **27 recommendations in 5 areas.** [verified, by count] The summary list (p6–7) numbers 1.1–1.8, 2.1–2.6, 3.1–3.4, 4.1–4.5 and 5.1–5.4, which makes 27. The report never states "27" itself.
- **A basic qualification recognised and transferable across Europe.** [verified] Rec 2.1: "a clear, recognised entry qualification … that works across Europe … map it onto existing national qualifications". Rec 2.2 pilots it in 2–3 cities or regions.
- **Closer cooperation with VET providers.** [verified] Section 3 (recs 3.1–3.4). The sector "does not have in-house VET expertise" (3.1).
- **Recruiting career changers.** [verified, narrative only] p18: "target older career-changers, people currently outside employment …". It is not a numbered recommendation.
- **Recognising informal routes (volunteering, on-the-job, repair hubs).** **Overstated.** Rec 2.6 is to "_Research_ how skills training delivered by community workshops, bike kitchens and social enterprises can be integrated into the recognised pathway". The report calls volunteering-only entry "a significant barrier to entry" (p19, p28) and describes the informal _repair market_ as a safety and credibility risk (p11).
- **ECI setting up an education and skills expert group.** [verified] p44: "ECI is establishing a dedicated Education and Skills Expert Group (ESEG)". Its job: advocacy, pioneer-city research, and feeding "a common European framework standardising technical education". ESEG is **not yet listed** among the expert groups on the [publications page](https://cyclingindustries.com/publications/).

### Things the transcript did not mention, relevant here

- **Data caveats the report states itself.** The demand model "relies on expert opinion … and a degree of judgement. No additional research has been commissioned" (p46). It uses Shimano data "provided in confidence" (p45), so the 175k base cannot be independently checked. [verified]
- **An internal inconsistency.** The report body says OOMT data shows "31% of mechanics left the industry in the Netherlands in 2024" (p12). The appendix cites the same source as 24% (p47). [radmarkt.de](https://radmarkt.de/next-gen-mechanics-und-eci-report-europa-fehlen-in-zukunft-105-000-fahrradmechaniker/) [secondary] reports 24%. [verified discrepancy]
- **A draft curriculum already exists.** "A draft entry-level curriculum has already been developed at European level" (p28). It is not published or linked. [verified claim, document unverified]
- **Modularity is asked for explicitly.** Delivery should be "modular and flexible enough that working mechanics can build recognised skills incrementally" (p30). The report quotes the EU Mobility Transition Pathway's call for "a more standardised, modular and transparent recognition of skills" (p21). [verified]
- **Social-economy skills are hard to assess.** "Skills acquired in social economy settings are typically informal, uncertified and difficult for workshops or fleets to assess" (p22). The barrier is "the absence of structural bridges between community training and accredited, employer-recognised pathways". L'Heureux Cyclage (180+ French non-profit workshops) and Innovam's Cyclehub (50–100 lateral entrants a year in the Netherlands) are named as structured examples (p22, p29). [verified]
- **Brand training should complement the baseline.** Stakeholders say the baseline "should complement, rather than compete with, brand-led programmes" (p28). [verified]
- **Competition law constrains collective action.** Solutions "must be open to all companies to participate" (p39). [verified]
- **No credential technology is named.** A text search of the report for _badge, credential, micro, Europass, ESCO, EQF_ finds no hits in the credential sense. [verified]

---

## 2. Possible issuers and endorsers

For each body: what it is, and whether it issues any digital credential today.

### ECI / ESEG

- A trade association formed when [CONEBI and CIE merged](https://cyclingindustries.com/news/details/conebi-and-cie-complete-merger-to-form-european-cycling-industries/) (Dec 2025). ESEG is being established (report p44). Contact named in the report: Henrique Santos, Projects & Data Officer.
- Digital credentials: none found. [unverified]

### Shimano Europe: NextGen Mechanics / S-TEC

- Shimano Europe funded the report's demand model (p45). S-TEC is Shimano's online dealer training platform. The [Shimano S-TEC page](https://bike.shimano.com/pt-BR/stories/article/s-tec.html) (fetch returned 403; content from search snippet only) describes 235+ modules with an 80% quiz pass mark. The North American instance runs on Sparc ([na.s-tec.shimano.com](https://na.s-tec.shimano.com/why/manufacturers)).
- Digital credentials: no portable credential found. [unverified]

### Bosch eBike Systems dealer training

- The [2026–27 North American tour release](https://bicycleretailer.com/announcements/2026/09/22/bosch-ebike-systems-kicks-2026-2027-dealer-training-tour-new-tiered) [secondary host] describes Intro Training leading to a one-year Dealer Certification that unlocks warranty claims and DiagnosticTool 3. European equivalent: an annual dealer tour (pedelec-elektro-fahrrad.de [secondary]).
- Digital credentials: the certification is a portal entitlement and expires. No Open Badge found. Separately, Bosch has announced a digital "Certified by Bosch" condition certificate for used e-bikes ([bike-x.de](https://www.bike-x.de/e-bike/news/nach-certified-by-bosch-braucht-europa-ein-einheitliches-e-bike-zertifizierungssystem/) [secondary]). It certifies a bike, not a person.

### SRAM Technical University (STU)

- [Official STU page](https://www.sram.com/en/service/articles/SRAM-Technical-University-STU): STU Online is open worldwide. Level 1/2 are webinars; Level 3 is in person in DE/AT/CH, NL/Flanders and FR/BE/LU/CH, with the UK "coming soon".
- Digital credentials: the page does not mention any certificate or badge. [verified absence on that page]

### Germany: Zweiradmechatroniker/in, Fahrradtechnik

- A 3.5-year dual apprenticeship under the [ZweiradAusbV 2014](https://www.gesetze-im-internet.de/zweiradausbv/). The [BIBB certificate supplement](https://www.bibb.de/dienst/berufesuche/de/index_berufesuche.php/certificate_supplement/en/zweiradmechatroniker_fr_fahrradtechnik_e.pdf) gives **DQR level 4** (preliminary) and ISCED 3B. The report puts it in "Group A: protected trades" (p26).
- Digital credentials: paper journeyman's certificate (Gesellenbrief). None digital found.

### UK: Cytech (ACT) and ST0622

- [Cytech](https://www.cycleassociation.uk/services/increase-sales/cytech-training/) is "owned by the UK cycle industry through the Association of Cycle Traders" and runs Technical One/Two/Three plus an online Theory One. The report says Cytech has trained 30,000+ mechanics (p29). The [ST0622 v1.2](https://skillsengland.education.gov.uk/apprenticeships/st0622-v1-2) bicycle mechanic apprenticeship is Level 2, 18 months, "Approved for delivery".
- Digital credentials: Cytech has a "status and a 'badge'" plus a public directory ([Cycling Industry News, 2017](https://cyclingindustry.news/cytech-launches-technician-status-badges-to-recognise-achievement/) [secondary]). It is a visual badge, with no evidence it is an Open Badge. A City & Guilds "Advanced Bicycle Technician and E-Bike" badge appeared in search results on Credly, but [the Credly page](https://www.credly.com/org/city-guilds/badge/advanced-bicycle-technician-and-e-bike) returns 404. [unverified]

### Netherlands: Fietstechnicus / Eerste fietstechnicus (MBO)

- SBB certificate supplements: [Fietstechnicus](https://s-bb.nl/doc/pdf/952051/en-GB) is crebo 25231, **NLQF 2 / EQF 2**, with core tasks _make delivery-ready, maintain, repair, sell_. [Eerste fietstechnicus](https://s-bb.nl/doc/pdf/952063/en-GB) is crebo 25230, **NLQF 3 / EQF 3**, adding _diagnosis, support management_. Training actors: Innovam, Cyclehub (report p26, p29).
- Digital credentials: no bike-specific one found. The Dutch sector-wide Open Badges platform **edubadges** (SURF) exists; a [SURF presentation](https://tcs.sunet.se/download/attachments/147521957/The_Dutch_approach_to_microcredentials.pdf?api=v2) says it is OB 2.0-based with OB3 planned and a VET micro-credential pilot from 2023. [secondary]

### France: Mécanicien Cycles (RNCP37007)

- [France Compétences entry](https://www.francecompetences.fr/recherche/rncp/37007/): active, **niveau 3**, certifier ANFA / CPNE services de l'automobile, valid to 24-10-2027. It has two _blocs de compétences_ (assembly and preparation; after-sales interventions) and VAE is possible. Related level-4 titles exist (Conseiller technique cycles RNCP36721; Technicien-vendeur cycles RNCP41464). [secondary, not opened]
- Digital credentials: paper. Note that **blocs de compétences are already modular units**, which a badge could align to.

### Belgium: EDUCAM / Syntra

- The report calls this "frequently cited as a strong example" within national qualification structures (p26). Not researched further.

### Community repair hubs

- L'Heureux Cyclage (FR, 180+ associations), bike kitchens, social enterprises (report p22). The L'Heureux Cyclage site returned HTTP 402 to fetch. An earlier EU project, Innovam's [TWIN](https://www.innovam.nl/best-practices/case-setting-the-standard-for-e-bike-training-in-europe), set a "European certification system" for e-bike mechanics across 12 countries; it was a licensed logo, not digital.
- Digital credentials: none found. [unverified]

**Finding [inference]:** no bike-sector body was found issuing portable, verifiable digital credentials for mechanics. Brand certifications are dealer-portal entitlements. National VET awards are paper. Cytech's "badge" is a directory status. This is a gap, but also a warning sign: no one has proven employer demand for such a credential.

---

## 3. Frameworks a badge tree could align to

### ESCO

Verified via the [ESCO API](https://ec.europa.eu/esco/api/resource/occupation?uri=http://data.europa.eu/esco/occupation/336cf331-8082-4a0c-bf5f-e7c54706211c&language=en), default version, 2026-10-26.

- **Occupation: bicycle mechanic**, `http://data.europa.eu/esco/occupation/336cf331-8082-4a0c-bf5f-e7c54706211c`, ISCO 7234 ("Bicycle and related repairers"), ESCO code 7234.1. DE label: Fahrradmechaniker/in; NL: fietsenmaker; FR: mécanicien en cycles. The URI dereferences (301 to HTTPS).
- **Essential skills used in the pilot sketch below.** Prose names the skill; the URI is listed here once.

| ESCO skill                                                | URI                                                                     |
| --------------------------------------------------------- | ----------------------------------------------------------------------- |
| tune bicycles                                             | `http://data.europa.eu/esco/skill/1f9cd253-7d74-45a2-acf6-0bd2354aed2f` |
| maintain braking system                                   | `http://data.europa.eu/esco/skill/534e2ade-f9dd-470c-a56f-97d2cc896468` |
| perform repairs on bicycles                               | `http://data.europa.eu/esco/skill/fab8e95a-448d-4784-aa50-9ef10e924829` |
| replace defect components                                 | `http://data.europa.eu/esco/skill/87af00b5-30fa-41c8-bfa5-357f22c8d589` |
| use repair manuals                                        | `http://data.europa.eu/esco/skill/6561c8e7-3851-4878-bcf4-d2ffd63d835e` |
| assemble bicycles                                         | `http://data.europa.eu/esco/skill/f89aac44-f964-4b3d-96ab-622a3c249fa9` |
| bicycle mechanics (knowledge)                             | `http://data.europa.eu/esco/skill/53b1dcbc-7c51-43cd-9e3a-9ca78afd2895` |
| _optional:_ apply technical communication skills          | `http://data.europa.eu/esco/skill/c32ad607-0c4d-4e34-b73f-668298f7bf13` |
| _optional:_ maintain records of maintenance interventions | `http://data.europa.eu/esco/skill/182915aa-3470-433a-9b12-347511befcde` |
| _optional:_ repair electric bicycles                      | `http://data.europa.eu/esco/skill/012795fe-5f85-4d12-a10e-9dabda4ea05f` |

The occupation has 13 essential and 19 optional skills. E-bike repair is only _optional_ in ESCO, although the report treats e-bike diagnostics as the core of the shortage (p9, p26). [verified mismatch] ESCO lags the trade.

### EQF

The [EQF descriptors](https://europass.europa.eu/en/description-eight-eqf-levels) run from level 2 ("basic factual knowledge … work under supervision with some autonomy") to level 4 ("self-management … supervise the routine work of others"). National awards sit at EQF 2 (NL Fietstechnicus), EQF 3 (NL Eerste fietstechnicus) and DQR/EQF 4 (DE). [verified]

[inference] An EQF level is assigned to a _qualification_ through a national qualifications framework. A self-issued or community badge cannot _have_ an EQF level. It can only state that its criteria were written against level-2 descriptors. Claiming more would misrepresent the credential.

### Europass / European Digital Credentials for Learning (EDC)

- EDCs use the **European Learning Model (ELM)**, which its own README calls "an extension of the W3C Verifiable Credentials Data Model". ELM is owned by the European Commission ([ELM repository, archived](https://github.com/european-commission-empl/European-Learning-Model); docs now at the [ELM Browser](https://europa.eu/europass/elm-browser/index.html)). ELM links to EQF, ESCO and ISCED-F ([Europass news, 3 May 2023](https://europass.europa.eu/en/news/launch-european-learning-model-new-step-interoperability-learning)). [verified]
- **A seal is mandatory.** "The use of the seal is mandatory and informs the viewer of the credential about the origin of the credential", via eIDAS Trust Service Providers ([Europass EDC page](https://europass.europa.eu/en/european-digital-credentials)). [verified]
- **There is no official OB3-to-ELM mapping.** The Commission's [ELM-support repository](https://code.europa.eu/qualifications-courses-and-credentials/ELM-support) `mapping/` folder holds only `ELM-DS-mapping.xlsx`, `ELM-ELMO-mapping-DS.xlsx` and `MC-Mapping.docx` (Diploma Supplement, ELMO, micro-credentials). A GitHub code search of the archived ELM repo for "Open Badges" returns 0 hits. [verified absence] Bridges exist only as research, e.g. a [TH Lübeck Moodle-badges-to-EDC prototype](https://www.scitepress.org/Papers/2025/134822/134822.pdf) and an [IEEE paper on OB plus ELM](https://ieeexplore.ieee.org/abstract/document/10748225/) [secondary, abstracts only]. One vendor claims 1EdTech "manages" ELM; ELM's own README contradicts that.
- **The EU micro-credentials Recommendation.** The [Council Recommendation of 16 June 2022](https://education.ec.europa.eu/education-levels/higher-education/micro-credentials) (CELEX 32022H0627(02)) defines "standard elements for describing micro-credentials". EUR-Lex blocked automated fetch, so **the element list was not re-read here [unverified]**. From memory it includes learner, title, awarding body, learning outcomes, workload, level, assessment type, participation form and QA. Re-check before mapping.

**How OB3 relates to EDC [inference]:** OB3 and ELM are siblings on the W3C VC data model with different vocabularies, proof expectations and trust anchors. OB3 trusts the issuer key plus out-of-band issuer lists; EDC trusts an eIDAS seal. A converter is a field-mapping job, but the _trust_ cannot be converted. Only an organisation holding an eSeal can turn a learner's OB3 evidence into an EDC. That fits the product vision's split, where institutions belong to the monorepo and not the phone app.

---

## 4. Trust in OB3 / CLR 2.0 (spec text)

Sources: [OB 3.0 spec](https://www.imsglobal.org/spec/ob/v3p0/) (Final Release), [OB 3.0 Implementation Guide](https://www.imsglobal.org/spec/ob/v3p0/impl/), [achievementcredential JSON schema](https://purl.imsglobal.org/spec/ob/v3p0/schema/json/ob_v3p0_achievementcredential_schema.json).

### Issuer identity

- Issuers "may be identified with an HTTP URL that resolves to an issuer profile … Or, they might be identified by a Decentralized Identifier". `did:key`, `did:jwk` and `did:web` are the commonly tested methods. The specs "make no normative requirements strictly limiting which DID methods may be used" (Impl §3.1.1). [verified]
- `did:web` "relies on the DNS registration of a domain holder". The quickstart uses `did:web` for an organisational issuer (Impl §2.1, §3.1.1). [verified]
- **Key ownership is not identity.** "There isn't a existing way in current standards to completely assure that the key that signed a credential proof is associated with the issuer identifier … Displayers may choose to authenticate the issuer identifier against a trusted list of issuers obtained out of band … When such a mechanism isn't available, the displayer should mark issuer data included in a credential as unverified" (Impl §3.3.2). [verified]
- **A JWKS check applies to VC-JWT.** For external (JWT) proofs the guide recommends checking the key against `https://{authority}/.well-known/jwks.json` built from the issuer id. It says the credential "should be considered invalid and not trustworthy if the key provenance cannot be verified via the method described above" (Impl §3.3.2.2, non-normative). [verified]
  - [inference] native-rd issues VC-JWT with a per-device `did:key` ([ob3-compliance-status.md](../architecture/ob3-compliance-status.md) row 7; `credentialBuilder.ts:55-95`). A `did:key` has no `{authority}`, so this check cannot run. A verifier following the guide literally would distrust our badges. A pilot organisation should sign as `did:web` (or an HTTPS issuer) with a published JWKS.
- The spec requires only HTTP-URL key dereferencing: it "allows the use of an HTTP URL … or a DID URL …, but only requires HTTP URL support" (spec §8.5). [verified] So `did:key` support in third-party verifiers is optional.

### Endorsement

- "In 3.0, an endorsement is its own type of credential" (spec §3.9). The use case is peers endorsing "the skills he has acquired", with a platform issuing endorsement VCs "on behalf of its users". [verified]
- `EndorsementCredential` (spec B.1.7) is a full VC with `issuer`, `validFrom` and optional `validUntil`, `evidence`, `credentialStatus`. Its `credentialSubject` is an `EndorsementSubject` (B.1.8) with `id` ("the individual, entity, organization, assertion, or achievement that is endorsed") and an optional Markdown `endorsementComment`. [verified]
- **Three things can be endorsed:** an `Achievement` (definition), an `OpenBadgeCredential` (one person's award) and a `Profile` (an issuer). Each has `endorsement` (Data Integrity) and `endorsementJwt` (VC-JWT) slots. The Impl Guide (§1.6) says endorsements "usually make claims about an Achievement, Issuer Profile or OpenBadgeCredential" and "may be issued by individuals or organizations, potentially even badge recipients themselves". [verified]
- Verification of embedded endorsements is part of the normal verification flow (spec §9.1 step 9, §9.2). [verified]

### Alignment

- `Alignment` (B.1.5) requires `targetName` and `targetUrl`. `targetFramework`, `targetCode`, `targetDescription` and `targetType` are optional. [verified]
- `targetType` is an enum of Credential Engine and CASE terms (`ceasn:Competency`, `CTDL`, `CFItem`, …). **ESCO has no term**, but the enum "can be extended with new, proprietary terms" prefixed `ext:` (B.1.29). [verified] ESCO alignments would use `targetFramework: "ESCO"`, `targetUrl: <ESCO URI>` and either no `targetType` or e.g. `ext:ESCOSkill`. [inference]
- **Repo gap, fixed in [#761](https://github.com/rollercoaster-dev/Rollercoaster.dev-mobile/pull/761) [verified in code].** The OB3 serializer wrote plural property names. `packages/openbadges-core/src/credentials/serializer.ts:242-248` emitted `achievement.alignments`, `achievement.tags` and `achievement.resultDescriptions`. The OB3 schema's `Achievement` properties are `alignment`, `tag` and `resultDescription`, with `additionalProperties: true`. The schema validator therefore passed the plural fields silently, and consumers ignored them. `credentialBuilder.ts` did not set alignments, so nothing shipped broken. It no longer blocks an alignment-based pilot.

### How a self-issued credential gains third-party trust

This agrees with and extends [2026-09-20-ob3-linked-achievements.md](./2026-09-20-ob3-linked-achievements.md), which proposed "OB3 endorsement targeting that credential" for peer review. The spec supports it, and adds two more targets. Strength ratings are [inference].

1. **Self-issued.** The learner's OB3 credential plus evidence. Says "I did this, here's the evidence". Strength: integrity only.
2. **Peer or mentor.** An `EndorsementCredential` on the learner's credential id. Says "I watched or reviewed this attempt". Strength: as good as the endorser's own standing.
3. **Organisation on content.** An `EndorsementCredential` from a hub, VET provider or ECI `did:web` on the `Achievement.id`. Says "these criteria are a sound basis for this skill". Strength: lifts every badge using that definition.
4. **Organisation on issuer.** An `EndorsementCredential` on the issuer `Profile`, or listing in an out-of-band trusted-issuer list. Says "this issuer runs assessments we stand behind". Strength: requires an organisational issuer, not a phone.
5. **Formal.** A national VET award or an EDC with eSeal. A legal qualification. Out of scope; reached via alignment only.

Layers 1 and 2 match the agreed community-learning flow (one learner, one invited peer, each on their own app). Layer 3 works only if achievement IDs are shared HTTPS IDs, because per Impl §3.1.3 a UUID shared "across multiple issuers" carries no common meaning. That is [openbadges-sub-badges.md](./openbadges-sub-badges.md) Finding 3, which this research **confirms is a precondition**. Today `credentialBuilder.ts:86` still derives `urn:ulid:<goalId>`, which is per-user.

---

## 5. ND-first and no-judgment constraints a pilot must respect

The governing wording, quoted:

- [ADR-0012](../decisions/ADR-0012-no-auto-judgment.md): "**The test for any automation:** does it interpret an _absence_ as failure, or count/score the user against a standard? Then it is forbidden." It also says: "no verdicts, no scoring or aggregating absence, no time-based state change, no missed-things ledgers, no app-icon badge counts."
- [ADR-0014](../decisions/ADR-0014-containment-offers-never-refuses.md), which is about step containment, not issuance: "Evidence gates completion; structure only decides what is offered. Containment is informative in both directions: the app offers, never asserts, never refuses."

How these apply to a mechanics pilot [inference]:

- **No locks.** Sequence in the tree (CLR `precedes`) is information, not permission. This repeats the open position in [openbadges-sub-badges.md](./openbadges-sub-badges.md), where `locked` is retired. A learner can attempt brakes before gears.
- **No absence-as-failure.** Brand certifications expire (Bosch: one year). If an _endorser_ sets `validUntil`, that is the endorser's statement. The app may show the date factually. It must never decay a badge, count down, colour it red or say "expired, you fell behind". The learner's own badge never expires by app decision.
- **Provenance is fact, not verdict.** Showing "self-recorded" vs "endorsed by X" is bookkeeping. Ranking learners, scoring or showing "x% complete toward Mechanic" is forbidden.
- **Structure never refuses.** ADR-0014 covers containment, not issuance. Applied here by analogy, a badge-tree position or a missing endorsement should not stop a learner from self-issuing. The safety concern belongs in the achievement's _criteria_ and in who chooses to endorse. Whether this analogy holds is a product decision, not settled by ADR-0014.
- **Peer statements may be partial.** A peer "can recognize partial progress, describe uncertainty" ([community vision](../vision/community-learning-and-peer-validation.md)). An `endorsementComment` must allow "needs another go at bleed technique" without that becoming a fail state.
- **Product boundary.** The app is "Not an institutional tool" and "Not a badge marketplace". Organisational issuance (layers 4–5) belongs to the monorepo or another institutional issuer, not this app. [inference] A pilot that needs this app to become an assessment platform contradicts the vision.
- **ND fit [inference].** Hands-on trades suit evidence-first recognition (photo, video, voice memo, all of which the app supports) better than timed theory tests. This is a design opportunity, not evidence of demand.

---

## 6. Pilot sketch

**Question answered:** yes, a pilot is possible. It should be a **community-recognition pilot** that makes informally learned skills _legible_. It should not be a qualification. That matches report rec 2.6 ("research how … community workshops … can be integrated").

**Shape.** One community repair hub, 5–15 learners, one or two experienced mechanics as peers, one VET-adjacent organisation as content endorser.

- **Issuer (layer 1):** the learner, self-issuing as today (`did:key`, VC-JWT ES256).
- **Achievement publisher:** Rollercoaster.dev, as a shared HTTPS catalog. IDs look like `https://rollercoaster.dev/achievements/bike/<slug>` with `Achievement.version`, per the sub-badges proposal. The catalog is static JSON; nothing has to be hosted on day one.
- **Endorsers:**
  - **Peer (layer 2):** a hub mechanic endorses each learner credential after an in-person review.
  - **Content (layer 3):** the hub, and ideally a VET provider (Innovam/Cyclehub, a Cytech centre, or an ANFA-certified French centre), endorses the five `Achievement` definitions from its own `did:web`.
  - **Stretch:** ESEG endorsement of the catalog, once ESEG exists.

### Badge tree

Five nodes, CLR `isPartOf` to the capstone, no `precedes` gates. All alignments use `targetFramework: "ESCO"` and the ESCO URI as `targetUrl` (URIs in §3). National cross-references are alignment only, with no equivalence claim. The criteria themselves are drafted in [2026-10-26-bike-badge-criteria-authoring.md](./2026-10-26-bike-badge-criteria-authoring.md) §7.

**1. Safety check and handover** (`Competency`)

- Evidence, learner-chosen: photo checklist; voice memo explaining findings to the rider.
- ESCO: tune bicycles; use repair manuals; optional apply technical communication skills.
- Cross-reference: NL Fietstechnicus core task 1 (delivery-ready, inspection).

**2. Wheels and punctures** (`Competency`)

- Evidence: before/after photos; short video of tyre seat check.
- ESCO: perform repairs on bicycles; replace defect components.
- Cross-reference: FR RNCP37007 bloc BC02 (after-sales interventions).

**3. Brakes: rim and mechanical disc** (`Competency`)

- Evidence: video of adjustment and lever-feel test.
- ESCO: maintain braking system.
- Cross-reference: NL core task 2 (maintenance).

**4. Gears and chain** (`Competency`)

- Evidence: video of indexing across the range; chain-wear reading photo.
- ESCO: tune bicycles; replace defect components.
- Cross-reference: UK ST0622 duty "carrying out services and safety checks".

**5. Basic service, start to finish** (`LearningProgram`, capstone)

- Evidence: a service record for one real bike, plus the rider handover.
- ESCO: occupation bicycle mechanic; optional maintain records of maintenance interventions.
- Cross-reference: ECI draft entry-level curriculum, once obtainable (p28).

**Excluded from the pilot:** hydraulic brakes and anything e-bike or battery related. The report flags battery handling by informal repairers as a fire and safety risk (p11). ESCO marks e-bike repair as optional. Those skills belong to brand and VET training.

### Engineering preconditions

From this research, none decided. No effort estimate exists yet; items 2–4 together are months of work and item 4 has no home in this repo.

1. **Done.** Fix the plural property names in `openbadges-core` (`alignment`, `tag`, `resultDescription`). Shipped in [#761](https://github.com/rollercoaster-dev/Rollercoaster.dev-mobile/pull/761).
2. Add the `catalogAchievementId` input to `credentialBuilder` ([openbadges-sub-badges.md](./openbadges-sub-badges.md), step 3).
3. Issue and verify `EndorsementCredential`, at minimum endorsements of a credential id. Already an open item in [2026-09-20-minimal-peer-validation.md](./2026-09-20-minimal-peer-validation.md).
4. Provide an organisational `did:web` signing path for endorsers. This is _outside_ the phone app per the vision. [2026-10-26-credential-key-compromise-recovery.md](./2026-10-26-credential-key-compromise-recovery.md) scopes what that path needs before a pilot and what can wait.
5. Test independent verification of all of the above with the 1EdTech validator. Agreement between two copies of our app proves nothing (peer-validation brief).

---

## Open questions

1. **Will ESEG engage?** ESEG is "being established" and not yet listed. Contact per report p44. It is unknown whether ECI would endorse an open catalog. Competition law favours solutions "open to all companies" (p39), which an open standard is. [inference]
2. **Can we get the draft European entry-level curriculum (p28)?** Aligning to it would matter more than aligning to ESCO alone.
3. **Who signs as an organisation?** A pilot hub or VET partner needs a `did:web` and JWKS. Does that live in the monorepo's openbadges-system, a minimal static issuer, or the partner's own platform?
4. **Do employers care?** No evidence was found that workshops would read a badge. The report's respondent quote "If they can do the job, they get hired" (p28) suggests a practical try-out beats any credential. A pilot should measure this, not assume it.
5. **Does the peer endorsement in practice satisfy ADR-0012?** For example, can an endorser decline without the learner seeing a fail state? This needs a prototype test alongside the community-learning open questions.
6. **Is an EDC bridge worth it?** Only if a partner holds an eIDAS seal and wants Europass delivery. There is no OB3-to-ELM mapping to reuse, so it would be custom work.
7. **Unverified items to re-check:** the micro-credentials Recommendation element list (EUR-Lex blocked); Shimano S-TEC Europe certification details (403); L'Heureux Cyclage training offers (402); the City & Guilds Credly badge (404); whether edubadges now issues OB3.

---

## Relationship to existing research

- **[openbadges-sub-badges.md](./openbadges-sub-badges.md):** _Agrees and extends._ HTTPS catalog IDs, `achievementType`, CLR `isPartOf` and no-lock edges are exactly the pilot's needs. This doc adds that ESCO needs an `ext:` `targetType`. It also turns the "unverifiable authorship" open question into a concrete mechanism: an organisational endorsement of the `Achievement`, which Impl §3.1.3 points toward.
- **[2026-09-20-ob3-linked-achievements.md](./2026-09-20-ob3-linked-achievements.md):** _Agrees._ Endorsement targets a specific credential version, and the learning structure stays separate from signed claims. _Extends_ by noting that endorsements can also target `Achievement` and `Profile`, which is the route to organisational trust.
- **[openbadges-external-earning-research.md](./openbadges-external-earning-research.md):** _Agrees._ The "created from / aligned to … not awarded by" trust language is the right framing if a brand or VET body publishes achievement definitions the app imports. _Contradicts nothing._ But no bike-sector body was found publishing importable OB definitions today, so the import route has no source yet.
