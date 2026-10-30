# Badge Criteria Authoring — Who Writes a Space's Badge Criteria, and From What (Bike Pilot as Worked Example)

**Date:** 2026-10-26
**Status:** Research, not a decision. Nothing here is scoped or agreed.
**Owner:** Joe

**Scope reference:** [2026-10-26-bike-mechanic-ob3-pilot.md](./2026-10-26-bike-mechanic-ob3-pilot.md) (badge tree, open question 2, "who signs") · [openbadges-sub-badges.md](./openbadges-sub-badges.md) ("Unverifiable authorship") · [Community Learning and Peer Validation](../vision/community-learning-and-peer-validation.md) · [ADR-0012 no-auto-judgment](../decisions/ADR-0012-no-auto-judgment.md)

**Baseline:** `main` at `aad2e486`. **Framing:** the app stays generic. The bike repair hub is the first worked example of a credentialing pattern that any community space could use: a makerspace, a youth centre, a Berufsschule (German vocational school), a repair hub. Roles are named generically (space, drafting group, reviewer, endorser, learner, peer). All web sources were fetched 2026-10-26.

**Glossary:** acronyms and evidence labels are defined in [glossary-community-credentialing.md](./glossary-community-credentialing.md). In short: [verified] read in the primary source, [secondary] search summary or third party, [unverified] not found, [inference] my reasoning. Licence notes are a research reading, **not legal advice**. Quotes in Dutch, German, French and Spanish carry an English gloss in brackets.

---

## TL;DR

- **The space authors, with outside review.** Practitioners and learners at the space draft; one outside reviewer checks; an organisation endorses the published `Achievement`; learners self-issue; a peer endorses the attempt. Every national VET system examined splits drafting from validation the same way.
- **There is a direct community precedent.** L'Heureux Cyclage, a network of community bike workshops, is a registered certifier of the French title RNCP41665 _Mécanicien réemploi cycle_ (level 3, active until 2030).
- **OB3 already models the split.** `Achievement.creator` is separate from the credential `issuer`, and the spec's "Skill Assertion" is a shared definition "designed to be generic to allow for assessment by any issuer". [verified]
- **Build criteria from ESCO plus national texts by code, in our own words.** Quote only sources with a clear reuse basis (ESCO, UK OGL, French open data, DE and ES statute). Cytech, Park Tool, the ANFA grids and the ECI draft curriculum are not public and cannot be quoted.
- **Every official scheme conflicts with ADR-0012 somewhere.** Clocks, percentage scores and distinction tiers all have to go. Keep the observable outcome; the peer's "what I'd need to see next" replaces "fail".

**Main risk [inference]:** coordination, not content. The model needs 2–3 mechanics and 1–2 learners to draft, an outside reviewer, and an organisation willing to sign, all unpaid at a volunteer hub. Open question 3 covers it.

**Not worth doing if:** no organisation outside the hub will endorse the published definitions. Self-endorsement by the space adds nothing a learner's own signature does not.

---

## 1. Existing material at entry level

Reuse codes: **Q** = can quote verbatim with attribution. **A** = can adapt or translate. **R** = can align by reference (code plus URL). R is assumed for everything, because citing a code is not copying [inference]. European and UK sources here; AU, ES and US are in the appendix.

### ESCO occupation _bicycle mechanic_

- **Entry-level content:** 13 essential skills, including tune bicycles, maintain braking system, perform repairs on bicycles, replace defect components, use repair manuals, assemble bicycles, maintain work area cleanliness and maintain customer service. _Repair electric bicycles_ is optional ([ESCO API](https://ec.europa.eu/esco/api/resource/occupation?uri=http://data.europa.eu/esco/occupation/336cf331-8082-4a0c-bf5f-e7c54706211c&language=en)). [verified]
- **Assessment style:** none, it is a taxonomy.
- **Reuse: Q A R.** "downloaded, used, reproduced and reused for any purpose … free of charge". Use must be acknowledged with "This service uses the ESCO classification of the European Commission", and "Any modified or adapted version of ESCO must be clearly indicated as such" ([ESCO FAQ](https://esco.ec.europa.eu/en/about-esco/faq)). [verified]

### NL Fietstechnicus (MBO 2, crebo 25231, EQF 2)

- **Entry-level content:** core task B1-K1 _Maakt fietsen afleveringsklaar_ (makes bikes ready for delivery), with work process W2 _Inspecteert fiets_ (inspects the bike) and W4 recording the work done. B1-K2 maintenance. B1-K3 repairs. B1-K4 sales. Intended result: the bike "functioneert … veilig en betrouwbaar" (works safely and reliably) ([qualification file PDF](https://kwalificatie-mijn.s-bb.nl/Details/DownloadDocument/1838336), valid from 01-08-2015; [English supplement](https://s-bb.nl/doc/pdf/952051/en-GB)). [verified] I did not check whether a later revision exists.
- **Assessment style:** behaviour statements per work process. Several are timed: "binnen de gestelde tijd (flat rate)" (within the set time). Safety-critical work "krijgen een eindcontrole door een leidinggevende" (gets a final check by a supervisor) (B1-K3). Graded 1–10 with 6 as pass. [verified]
- **Reuse: R.** No reuse statement found; SBB terms [unverified]. Whether Dutch copyright law's exemption for official acts (Auteurswet art. 11) covers a ministerially established file is [unverified].

### DE Fahrradmonteur/in (2 years, EQF 3)

- **Entry-level content:** FahrmAusbV 2004 §5: safety, planning and checking own work, "Warten, Prüfen und Einstellen von Fahrrädern und Systemen" (servicing, testing and adjusting bikes and systems), assembly and repair ([statute text](https://www.gesetze-im-internet.de/fahrmausbv/BJNR099300004.html); level per [DQR entry](https://www.dqr.de/dqr/shareddocs/qualifikationen-neu/en/Bicycle-mechanic.html)). [verified]
- **Assessment style:** intermediate exam §9: two practical tasks within 3 h plus 60 min written. Candidates show they can "Arbeitsschritte planen, Arbeitsmittel anwenden, technische Unterlagen nutzen" (plan work steps, use tools, use technical documents) and observe safety. Final exam §10: up to 7 h practical (build a bike from parts plus two repairs) plus written. [verified]
- **Reuse: Q A R.** Statutory text carries no copyright in Germany ([§5 UrhG](https://www.gesetze-im-internet.de/urhg/__5.html)). [verified] The KMK framework curriculum and BIBB guides are separate publications and are not covered.

### DE Zweiradmechatroniker/in, Fahrradtechnik (3.5 years)

- **Entry-level content:** Anlage B, item 1: j) "Verkehrs- und Betriebssicherheit von Fahrzeugen kontrollieren" (check road and operating safety), l)–m) prepare the handover and "Kunden in die Bedienung einweisen, Übergabe protokollieren" (brief the customer, record the handover). Item 4a) "Bremssysteme prüfen und beurteilen" (test and assess brake systems). Item 5c) gear systems ([annex](https://www.gesetze-im-internet.de/zweiradausbv/anlage.html)). [verified]
- **Assessment style:** Part 1 (§8): two customer-order tasks, each with a short technical discussion (at most 10 min), 180 min in total, plus 120 min written. It explicitly covers checking "mechanical brakes" and wheels or the drivetrain ([§8](https://www.gesetze-im-internet.de/zweiradausbv/__8.html)). [verified]
- **Reuse: Q A R** (statutory, as above).

### FR Mécanicien cycles, RNCP37007 (ANFA/CPNE, level 3)

- **Entry-level content:** BC01 _Préparation et assemblage cycle_ (preparation and assembly: inspection on receipt, assembly to manufacturer specification). BC02 _Interventions après-vente cycles_ (after-sales work: gathering the customer's information, inspecting for faults the customer did not notice, checking wear on brakes, transmission and tyres, a personalised handover). BC02 includes e-bike motor and battery replacement ([France Compétences entry](https://www.francecompetences.fr/recherche/rncp/37007/)). [verified]
- **Assessment style:** practical _mises en situation_ (set-piece tasks) per bloc plus an oral interview. The jury is two professionals and an independent trainer. Blocs can be earned one at a time. The 2016 CQP referential phrases criteria as observable results: "Les contrôles garantissant la sécurité de l'usager sont réalisés" (the checks that guarantee the user's safety have been done), scored on an ANFA grid, with 3 h and 1 h 30 time limits ([ANFA referential PDF, 5th ed. 2016](https://www.anfa-auto.fr/sites/default/files/2018-06/referentiel_cqp_mc_definitif.pdf)). [verified]
- **Reuse: fiche Q A R; ANFA referential and grids R only.** The RNCP/RS dataset is published under **Licence Ouverte 2.0** ([data.gouv.fr dataset, `license: lov2`](https://www.data.gouv.fr/datasets/repertoire-national-des-certifications-professionnelles-et-repertoire-specifique)). [verified] No licence was found for the ANFA documents, and the grids are "fournie par l'ANFA" (supplied by ANFA) and not public.

### FR Mécanicien réemploi cycle, RNCP41665

- **Entry-level content:** BC02 _Réparer des vélos en situation de réemploi_ (repair bikes for reuse): diagnosis, compatible used parts, repair, and a quality check "avec une attention particulière aux éléments de sécurité" (with particular attention to safety parts). BC03: advising the customer, including routine maintenance advice ([France Compétences entry](https://www.francecompetences.fr/recherche/rncp/41665/)). [verified]
- **Assessment style:** a practical situation before a jury plus a practical bike exam. Blocs earned are "acquis définitivement" (held for life). Certifiers: **L'Heureux Cyclage** and Études et Chantiers IdF. Active until 27-11-2030. [verified]
- **Reuse: Q A R** (Licence Ouverte 2.0, as above).

### UK ST0622 Bicycle mechanic (Level 2, 18 months)

- **Entry-level content:** Duty 4 "Carry out a bicycle service and safety checks". S5 "Service cable operated brake systems…", S6 "Bleed hydraulic brake systems", S7 derailleurs, S10 "Identify chain wear", S17 QA of own work, S18 handover, B1 "safety first", K13 lithium-ion handling. The authoring employers are listed on the page ([Skills England standard page](https://skillsengland.education.gov.uk/apprenticeships/st0622-v1-2)). [verified]
- **Assessment style:** EPA plan v1.1: practical demonstration (strip, repair and rebuild in **3 h to pass, 2.5 h for distinction**; build a wheel in 2 h or 90 min; a customer handover), an interview backed by a portfolio, and a 30-question multiple-choice test. Accepted portfolio evidence includes photos, video clips and handover records ([EPA plan PDF](https://www.skillsengland.education.gov.uk/media/ianc4kix/st0622_bicycle-mechanic_l2_epa-plan_adjustment_for-publication_9mar23.pdf)). [verified] I did not check the v1.2 EPA plan.
- **Reuse: Q A R.** "Crown copyright … re-use … free of charge … under the terms of the Open Government Licence" v3.0, logos excluded. [verified]

### UK Cytech Technical One / Theory One (ACT)

- **Entry-level content:** "the minimum standard to which all mechanics should work towards". Theory One is online; the upgrade is "a short practical assessment" with a provider ([Cytech page](https://www.cycleassociation.uk/services/increase-sales/cytech-training/)). Technical One is a 2-day practical ([Life Cycle course page](https://www.lifecycle.org.uk/cytech-courses)). [verified] Content areas (health and safety, pre-delivery inspection, torque, tyres and tubes, consumer law) appear only in a [BikeBiz article on Bike for Good](https://bikebiz.com/glasgow-based-cycling-charity-and-social-enterprise-bike-for-good-bringing-cytech-training-to-scotland/). [secondary]
- **Assessment style:** practical plus online theory. No published marking scheme. [verified absence on those pages]
- **Reuse: R only.** No public syllabus. Only ACT-authorised providers may deliver it. **Blocker for quoting.**

### Community hub curricula

- **Entry-level content:** Bike Works' _Frameworks_ is a "250 page modular youth development and bike mechanics curriculum", free to download ([Bike Works resources](https://bikeworks.org/programs/virtual-community-resources/)). [verified] The Bike Collectives wiki hosts earn-a-bike curricula (Community Cycles: flats, brakes, shifters, "assessing" what a bike needs) ([wiki page](https://wiki2.bikelover.org/wiki/Community_Cycles_Youth_Earn-A-Bike_Curriculum), 503 on fetch). [secondary] The Bike Project and The Recyclery: no published curriculum found. [unverified]
- **Assessment style:** mostly hours-based (earn-a-bike) or informal sign-off. No published criteria found.
- **Reuse: R.** Frameworks is free but carries no licence statement [verified absence]. The wiki licence is [unverified].

### ECI NextGen Mechanics draft entry-level curriculum

- Not public. See §2. **Reuse: none.**

**Naming note.** The brief said "CQP technicien cycles (ANFA)". ANFA's entry title is _Mécanicien cycles_: a CQP since 2005, a titre since 2019, now RNCP37007. A level-4 _Technicien-vendeur cycles_ (RNCP41464) exists but was not opened. [verified for RNCP37007; RNCP41464 not opened]

**What the sources agree on at entry level [inference].** Across NL, DE, FR, UK and AU the common entry core is the same four things:

1. Inspect a bike and say whether it is safe.
2. Tyres and wheels.
3. Cable brakes.
4. Chain and derailleur.

Each one wraps the same process steps: prepare, consult the documentation, do the work, check your own work, record it, hand over. That is the pilot's badge tree. Hydraulic brakes and e-bikes are where the sources diverge. They are elective in AU, core in FR BC02, an EPA task in the UK and optional in ESCO. That makes them a sensible scope boundary as well as a safety one.

---

## 2. The ECI draft entry-level curriculum

- **What the report says.** "A draft entry-level curriculum has already been developed at European level, but its impact depends on how it is positioned" (p28). Rec 3.3 says to use "the draft baseline qualification and the results of the city pilots" as the basis for VET capacity. Section 2 says to "Pilot the entry level qualifications in cities and regions that have offered to partner with NGM" ([report PDF](https://cyclingindustries.com/wp-content/uploads/2026/09/Nextgen-Mechanics-Report-.pdf)). [verified]
- **Who holds it.** The report never names an author, a holder or a link. The surrounding text places it inside the NextGen Mechanics initiative, whose steering group should "continue in a formal role under ECI's governance" (rec 5.2), and the forthcoming ESEG (p44). [verified text; holder is inference]
- **Is it public?** No. Neither the report nor an extended web search found a published document. Press coverage does not link one either ([BikeRadar report](https://www.bikeradar.com/news/europe-needs-105000-bike-mechanics) [secondary]). [unverified, absence]
- **Licence.** The report PDF itself states no licence (text search for copyright and licence terms, 2026-10-26). [verified absence]
- **Implication.** Aligning to it is not possible today. Ask the ESEG contact named on p44 whether a community pilot may read it and cite it by reference. The report's own recommendation 1.7, to "Set up advisory groups of experienced mechanics and employers to keep curricula grounded", supports a practitioner-drafted criteria set. [verified quote; implication inference]

---

## 3. Who usually authors competency criteria

### National VET: practitioners draft, someone else validates

- **DE.** Drafting: "ein paritätisch benanntes Sachverständigengremium des Bundes" (a federal expert panel with equal employer and union nomination), after the social partners agree the key parameters ([BIBB process page](https://www.bibb.de/de/136147.php)). [verified] Validation: BIBB and the ministry, issued as a regulation.
- **NL.** Drafting: "Het bedrijfsleven is eerst aan zet" (industry moves first). The sector chamber "bepaalt welke deskundigen SBB erbij betrekt" (decides which experts SBB brings in). Industry checks the occupation is recognisable; education checks it can be taught and examined ([SBB process page](https://www.s-bb.nl/onderwijs/kwalificatiestructuur/kwalificatiedossier/kwalificatiedossier-ontwikkelen)). [verified] Validation: the sector chamber validates; "De minister van OCW stelt het kwalificatiedossier vast" (the education minister establishes the file). The bike file was "Gevalideerd door: Sectorkamer mobiliteit…" (validated by the mobility sector chamber) (file p1). [verified]
- **UK.** Drafting: an employer group. ST0622 lists 13, from Evans Cycles and Decathlon to Recycle Bicycles ([Skills England standard page](https://skillsengland.education.gov.uk/apprenticeships/st0622-v1-2)). [verified] Validation: Skills England approves; an independent EPAO assesses.
- **FR.** Drafting: social partners via the CPNE (RNCP37007), or **a community-workshop network** (RNCP41665, L'Heureux Cyclage) ([RNCP37007](https://www.francecompetences.fr/recherche/rncp/37007/), [RNCP41665](https://www.francecompetences.fr/recherche/rncp/41665/)). [verified] Validation: France compétences registers it for 5 years; the jury mixes professionals with an independent trainer.
- **AU.** Drafting: a Jobs and Skills Council. The bicycle units bear "Mining and Automotive Skills Alliance" ([AURBTJ101 unit PDF](https://training.gov.au/assets/AUR/AURBTJ101_R1.pdf)). [verified] Validation: endorsed nationally on training.gov.au.

**Pattern [inference].** No system lets the people who run the training also be the only voice on what counts. Every one separates _drafting by practitioners_ from _validation by a body with a wider view_. RNCP41665 shows the drafting side can be a community network rather than an employer body.

### Makerspaces and other community spaces: the space authors, an authorised person signs off

- **UNSW Making, Laser Cutter badge.** The badge certifies completion of the online components and "demonstrated competency in the safe operation" of one machine. "Competency will be assessed by an authorised instructor." A safety badge is required first ([UNSW badge page](https://www.making.unsw.edu.au/access/badges/b/laser-cutter-badge/)). [verified]
- **Dalhousie, 3D Printer and Laser Cutter Safety (Credly).** The criteria combine "scored 85% or higher on an online theory … quiz" with "safe handling and use (in-person) which was verified by an instructor or lab supervisor" ([Credly badge page](https://www.credly.com/org/dalhousie-university/badge/3d-printer-and-laser-cutter-safety)). [verified]
- **Cities of Learning.** Each activity gets an auto-generated OB 2.0 badge whose description is copied from the activity, and badges "without evidence can be issued … by scanning a QR code" ([activity worksheet](https://edu.mruni.eu/de/activities/11686)). [secondary] A counter-example: when nobody drafts criteria, the badge records attendance, not competence.
- **Research on badge systems.** The Design Principles Documentation Project studied 29 funded badge systems. External endorsement was "the most difficult practice to enact", and badges worked better where the information was "unique" and the learning "social and networked" ([EDUCAUSE summary](https://library.educause.edu/resources/2015/6/where-badges-work-better), 403 on fetch). [secondary]
- **Open Recognition.** The [Bologna Open Recognition Declaration](https://openrecognition.org/bord/) calls for recognition "whether in formal, non-formal and informal settings, with bridges between all three", and invites people to contribute "to the design … of local and/or global systems of recognition". [verified] This is the values case for space-authored criteria. It says nothing about quality.

### What OB3 offers for authorship

- `Achievement.creator`: "The person or organization that created the achievement definition". §2.4.1: "We may now separate the issuer from the creator of the Achievement/BadgeClass". Verifiers "SHOULD NOT trust that an issuer has accurately represented the creator … when that entity is authored by another party" ([OB 3.0 spec](https://www.imsglobal.org/spec/ob/v3p0/)). [verified]
- §2.5 Skill Assertions: "multiple issuers use a shared achievement definition … with each issuer doing their own assessment". A credential "may be considered valid as issued by any issuer, including self-issuance by the subject". [verified]
- `Criteria.narrative` (B.1.6): "A narrative of what is needed to earn the achievement. Markdown is allowed." It serves both "would-be recipients" and "those inspecting earned achievements". [verified]
- **Consequence [inference].** A self-signed learner credential can carry `creator: <space Profile>`, but the learner's signature cannot prove that the space wrote the definition. That is the "unverifiable authorship" gap in [openbadges-sub-badges.md](./openbadges-sub-badges.md). The fix is the layer-3 endorsement from the [pilot doc](./2026-10-26-bike-mechanic-ob3-pilot.md): the space or reviewer signs an `EndorsementCredential` whose subject is the `Achievement.id`. That signature is what makes authorship checkable.

---

## 4. Writing criteria that fit ND-first and ADR-0012

### Guidance found

- **CAST UDL 3.0**, Guideline 5 _Expression & Communication_: 5.1 "Use multiple media for communication" and 5.4 "Address biases related to modes of expression and communication" ([CAST guidelines](https://udlguidelines.cast.org/action-expression/)). [verified] For criteria, this means _what_ is shown is fixed while _how_ it is shown is open: video, photo, a voice memo, or live in front of the peer.
- **ASQA principles and rules of evidence** (AU): the principles are fairness (including "reasonable adjustments … to consider the individual student's needs"), flexibility, validity and reliability; the rules of evidence are validity, sufficiency, authenticity and currency ([ASQA page](https://www.asqa.gov.au/node/5693)). [secondary] The site timed out, so this comes from search summaries only.
- **Cedefop, _Defining, writing and applying learning outcomes_, 2nd ed. 2022** ([publication page](https://cedefop.europa.eu/p/4209)) is the European reference for writing outcomes. [secondary] The page returned 403 and its content was not read.
- **Two useful patterns from the primary texts.** The ST0622 portfolio accepts "photographic record", "video clips", "handover records" and says "A qualitative as opposed to quantitative approach is required" (EPA plan). The ANFA CQP phrases each criterion as a finished, observable state: "Les différents réglages sont réalisés" (the adjustments have been made). [verified]
- **"Not yet."** No primary text defining "not yet" as an assessment outcome was retrieved. AU VET's "not yet competent" and Digital Promise's micro-credential practice both appear only in secondary results. [unverified] We don't need an external authority for this. The [community vision](../vision/community-learning-and-peer-validation.md) already says a peer "can recognize partial progress, describe uncertainty, or explain what they would need to see next without overruling the learner".

### Rewrite rules (derived; [inference] unless noted)

1. **One observable end state per criterion**, in the form "the bike / the learner …", the way the ANFA CQP does it. Avoid verbs that only happen inside someone's head ("understands", "knows").
2. **No clock.** Drop "within 3 hours", "binnen de gestelde tijd" and "use time efficiently". Keep the safety substance that sometimes hides behind them, such as "plan the work to avoid damage".
3. **No score.** Drop percentages, points and distinction tiers. Do not use `RubricCriterionLevel.points` (B.1.18). If levels are ever needed, describe them in words and never rank them.
4. **Evidence menu, not one format.** List two or three acceptable kinds of evidence (UDL 5.1). Live observation by the peer always counts. The ST0622 evidence list is a good starting point.
5. **Explanation can be shown, not only said.** "Explains to the rider" can be done by speaking, writing, pointing and demonstrating, or recording a voice memo.
6. **State the scope boundary inside the criteria.** "Out of scope for this badge: …". Recognising the boundary and handing on is a criterion in its own right. This is the NL final-check idea and ST0622 S18 "identifies … further work".
7. **The peer's words carry the judgement; the app carries none.** The criteria text ends with what a peer can write. It never states what the app does when evidence is missing. ADR-0012's test: "does it interpret an _absence_ as failure, or count/score the user against a standard? Then it is forbidden."
8. **The second-person check is the space's rule, not the app's.** "Have a second person check safety-critical work before the bike is ridden" mirrors the NL file's final check by a supervisor (B1-K3) [verified]. It is an operating rule of the space, written into the criteria. The app does not enforce it [inference].

### Source wording vs. criteria wording (examples)

- ST0622 task 1: "completed within 3-hours to pass (within 2.5-hours … distinction)". Becomes: "The bike leaves with every agreed job done and checked." No time.
- NL B1-K1-W2: "Voert de inspectie … binnen de gestelde tijd … uit" (carries out the inspection within the set time). Becomes: "Checks the bike in the space's set order and writes down what they found, including what was fine."
- AURBTJ101 2.3: "Remove, repair, refit and inflate tyres and tubes without causing damage". Becomes: "The tyre is seated evenly on both sides with no tube visible under the bead, inflated within the range on the sidewall."
- Dalhousie: "scored 85% or higher on an online … quiz". Dropped. Safety knowledge is shown in the conversation with the peer and in naming the scope boundary.

---

## 5. A generic authoring model for any space

**Roles.** Generic names, with the bike-pilot example in brackets. OB3 artefacts are [inference].

- **Space.** The community space as an organisation (the repair hub). Owns the badge set, its safety rules and its versions. Artefact: `Achievement.creator` names the space's `Profile`.
- **Drafting group.** 2–3 experienced practitioners and 1–2 learners or recent learners from the space. Writes criteria, evidence options and scope boundaries using §4's rules, and tries them on one real attempt before publishing. Artefact: `Achievement` JSON at an HTTPS id, with `version`.
- **Reviewer.** One person outside the space with domain standing (a VET trainer, a practitioner at another hub, a vocational-school teacher). Checks the criteria against the aligned frameworks and for safety gaps; signs off a version. Artefact: optional `EndorsementCredential` on the `Achievement.id`.
- **Endorser.** An organisation willing to stand behind the definition (the space itself, a VET provider, later ESEG). Endorses the `Achievement` from its own key. Artefact: `EndorsementCredential` (did:web) on the `Achievement.id`; pilot layer 3.
- **Learner.** The person earning it. Chooses the evidence and self-issues. Artefact: `OpenBadgeCredential`, issuer is the learner; layer 1.
- **Peer.** Someone who watched or reviewed the attempt (an experienced mechanic at the hub). States what they saw, and what they'd need to see next. Artefact: `EndorsementCredential` on the credential id; layer 2.

**Cycle:** draft; try on one real attempt; reviewer sign-off; publish a version; endorse; use; revise as a new `version`. Older credentials keep their version. Revision follows the vision's rule that "a changed claim does not silently inherit" recognition.

**Why not one of the alternatives [inference]:**

- _Rollercoaster.dev authors._ That makes the app an institution, which the vision rules out ("Not an institutional tool").
- _A VET body authors._ None is engaged yet, and VET texts carry clocks and grades that would need rewriting anyway.
- _The learner authors._ Fine for personal goals, but it gives a space nothing shareable to endorse.

---

## 6. What generalises beyond bikes, and what is bike-specific

**Generalises to any space:**

- The six roles, the draft-review-endorse cycle, and keeping creator and issuer separate.
- The §4 rewrite rules: one observable end state, no clock, no score, an evidence menu, the peer's words over app state.
- **A safety gate is the space's physical rule, not an app lock.** UNSW makes a safety badge a prerequisite for using the laser cutter. A space can refuse someone the tool. The app still never locks a badge node (ADR-0012; `precedes` stays information). The criteria state the rule, and the space enforces it at the door. [inference]
- A "scope boundary" field in every badge. Each space names what its badges don't cover: a woodshop, the table saw; a youth centre, unsupervised soldering.
- Aligning to the nearest ESCO occupation or skill plus a cross-reference to the national qualification by code. ESCO covers trades, makers and youth work alike.
- An optional "second-person check" rule for safety-critical work.

**Bike-specific:**

- **The safety boundary.** Hydraulic brakes, anything e-bike (motor, controller, battery handling) and structural frame or fork damage are out of scope. The [pilot doc](./2026-10-26-bike-mechanic-ob3-pilot.md) records the ECI report's battery fire-risk concern (p11). ST0622 K13 treats lithium-ion handling as its own knowledge item, and FR BC02 puts battery replacement inside a regulated qualification. [verified sources]
- The ESCO bicycle-mechanic occupation, the NL, DE, FR, UK and AU codes, and torque and brake-test specifics.
- The ECI/ESEG endorsement route.

---

## 7. Recommendation

**Authoring model (one line):** the space's drafting group (practitioners and learners) drafts, one external reviewer checks, an organisation endorses the `Achievement`, learners self-issue, and peers endorse attempts.

**Align to:**

- ESCO (all five badges, with attribution).
- NL Fietstechnicus B1-K1 to K3.
- DE FahrmAusbV §5 and §9.
- FR RNCP41665 BC02 (the community-workshop precedent) and RNCP37007 BC02 (excluding its e-bike content).
- UK ST0622 S5, S7, S10, S17 and S18.
- AU AURBTJ101, AURBTB101 and AURBTQ001 (appendix).

All by code and URL. Quote only ESCO, OGL, Licence Ouverte and statutory texts. Add the ECI draft once it can be obtained.

**Draft outline.** Criteria are written per §4. The evidence menu for every badge is: live observation by a peer, photo or video, a voice memo, or a written note. ESCO skill URIs are listed in the [pilot doc](./2026-10-26-bike-mechanic-ob3-pilot.md) §3; skills are named in prose here.

**1. Safety check and handover** (`Competency`). ESCO: tune bicycles; use repair manuals; optional apply technical communication skills. Cross-reference: NL B1-K1-W2/W4; DE ZweiradAusbV Anl. B 1 j/m; UK S17, S18.

- Checks a bike in the space's set order and records each finding, including what was fine.
- Sorts the findings into "not safe to ride today" and "can wait", and says why for each.
- Names anything out of scope (hydraulic brakes, e-bike parts, frame or fork damage) and hands it to an experienced person instead of working on it.
- Explains the findings to the rider in a way the rider confirms they understood.
- Leaves tools and the work area as they found them (ESCO: maintain work area cleanliness).

**2. Wheels and punctures** (`Competency`). ESCO: perform repairs on bicycles; replace defect components. Cross-reference: AU AURBTJ101 (core); FR RNCP37007 BC02; ES RD 587/2026 RA 2 d.

- Removes and refits a wheel. Afterwards it is centred in the frame, the axle is secured as the bike's system requires, and the brake still works.
- Finds what caused the puncture (tyre, rim tape or valve) before repairing it.
- Repairs or replaces the tube. The tyre is seated evenly on both sides with no tube trapped, and inflated within the range printed on the sidewall.
- Spins the wheel and confirms it doesn't rub. Says whether the tyre is worn enough to replace.

**3. Brakes: rim and mechanical disc** (`Competency`). ESCO: maintain braking system. Cross-reference: AU AURBTB101; UK S5; DE ZweiradAusbV Anl. B 4a; NL B1-K2.

- Inspects pads, cable, housing, lever and braking surface, and names the parts that are worn or damaged.
- Replaces pads and a cable with its housing. The routing lets the bars turn fully without the brake engaging.
- Adjusts the brake so the pads meet only the braking surface, the lever stops short of the bar under a firm pull, and the wheel spins freely when released.
- Tests the brake in a safe place, then has a second person check it before the bike is ridden (the NL final check).
- Out of scope: hydraulic systems, including bleeding.

**4. Gears and chain** (`Competency`). ESCO: tune bicycles; replace defect components. Cross-reference: UK S7, S10; AU AURBTQ001; DE ZweiradAusbV Anl. B 5c.

- Measures chain wear with a checker or ruler and says whether the chain needs replacing.
- Fits a chain at the right length and joins it with no stiff links.
- Sets the rear derailleur limits so the chain cannot leave the largest or smallest sprocket.
- Indexes the rear shifting so each click moves one sprocket cleanly across the whole range, in the stand and on a short ride.
- Cleans and lubricates the drivetrain, and wipes off the excess.

**5. Basic service, start to finish** (`LearningProgram`, capstone; CLR `isPartOf`, no `precedes` gate). ESCO: occupation bicycle mechanic; optional maintain records of maintenance interventions. Cross-reference: NL B1-K2; DE FahrmAusbV §10 (2); FR RNCP41665 BC02/BC03.

- Takes in a real bike: listens to what the rider wants and writes down the agreed work.
- Carries out the work the bike needs, drawing on badges 1–4, and keeps a record of what was done and which parts were used.
- Has the finished bike checked by a second person before it is ridden.
- Hands the bike back: explains what was done, what to watch for next, and anything referred on as out of scope.

**Example `criteria.narrative` (badge 2, Markdown):**

```markdown
**What this badge recognises:** you can fix a puncture so the wheel is safe to ride.

**You've shown it when:**

- the wheel is back in the frame, centred and secured, and the brake still works
- you found what caused the puncture before fixing it
- the tyre sits evenly on both sides, no tube is trapped, and the pressure is within the range on the tyre
- the wheel spins without rubbing, and you've said whether the tyre needs replacing

**Show it however suits you:** a peer watching, photos or a short video, a voice memo, or a written note.

**Not covered here:** tubeless sealant set-up, hub or spoke work, anything on an e-bike.

**For the peer:** say what you saw. If something isn't there yet, say what you'd want to see next time.
```

---

## Open questions

1. **Can the pilot see the ECI draft curriculum?** Ask the ESEG contact named on p44. Can we cite it by reference before it is published?
2. **Is the space the endorser of its own criteria, or only the reviewer's organisation?** Self-endorsement by the space adds little trust. A second organisation adds trust but costs coordination.
3. **Who does the unpaid work?** Which learners join the drafting group, are they paid or credited, and who covers the reviewer's time? The vision's mentor-path question ("points, weighting, rewards … are not agreed") applies here too. This is the main risk to the model.
4. **Should the second-person safety check appear in the credential?** For example, as evidence naming the checker. Is that disclosure acceptable to the learner?
5. **Australian units: confirm CC BY-ND for AUR.** If confirmed, quote verbatim only, and never ship a translated or edited version.
6. **SBB reuse terms.** The NL file is the closest match to entry level. Confirm with SBB before quoting it.
7. **Does any national body accept a community badge as VAE or RPL evidence?** RNCP41665 lists VAE but certified 0 people that way in 2023–2025 (France Compétences). That route is unproven.
8. **Unverified items to re-check:** ASQA's principles (site timed out), the Cedefop handbook (403), the Bike Collectives wiki licence (503), the AU Assessment Requirements, the ST0622 v1.2 EPA plan, and whether the NL file has a post-2015 revision.

---

## Relationship to existing research

- **[2026-10-26-bike-mechanic-ob3-pilot.md](./2026-10-26-bike-mechanic-ob3-pilot.md):** _Extends._ This answers its open question 2 (ECI draft: not public, ask ESEG) and gives the badge tree's "who authors" a concrete model. _Agrees_ with its safety exclusions and its layer-3 content endorsement. _Adds_ RNCP41665 as a precedent of a community workshop network acting as certifier, and AU and ES texts as further alignment targets.
- **[openbadges-sub-badges.md](./openbadges-sub-badges.md):** _Extends_ "Unverifiable authorship". `Achievement.creator` names the author, and an `EndorsementCredential` on the `Achievement.id` makes the authorship checkable. _Agrees_ that `precedes` is information, not permission, and adds that a physical safety gate stays outside the app.
- **[Community Learning and Peer Validation](../vision/community-learning-and-peer-validation.md):** _Agrees._ "What I'd need to see next" and the peer's own attributed statement are the criteria's only judgement channel. _Adds nothing_ to the agreed requirements.
- **[ADR-0012](../decisions/ADR-0012-no-auto-judgment.md):** _Applies._ Clocks, scores and distinction tiers from VET sources are removed. Absence of evidence produces no state.

---

## Appendix: sources outside Europe and the UK

Useful as further alignment targets and wording examples; not needed for a European pilot.

### AU AUR20320 Cert II Bicycle Mechanical Technology

- **Entry-level content:** core units include AURBTJ101 _Remove, repair and refit bicycle tyres_ and AURBTA104 _Assemble new boxed bicycles_. Electives include AURBTB101 _Service and repair bicycle mechanical braking systems_, AURBTQ001 _Service bicycle drivetrain systems_ and AURBTB002 (hydraulic) ([qualification PDF, generated 17 Mar 2026](https://training.gov.au/assets/AUR/AUR20320_R2.pdf)). AURBTJ101 performance criterion 1.3 "Identify hazards … and manage risks", 2.3 refit "without causing damage", 3.1 "confirm bicycle is ready for use" ([AURBTJ101 unit PDF](https://training.gov.au/assets/AUR/AURBTJ101_R1.pdf); [AURBTB101 unit PDF](https://training.gov.au/assets/AUR/AURBTB101_R1.pdf)). [verified]
- **Assessment style:** competency-based. The Assessment Requirements documents were not retrievable [unverified]. The unit criteria include "use time efficiently" (AURBTJ101 1.5, AURBTB101 1.5). [verified]
- **Reuse: Q R, probably not A.** The units show "© Commonwealth of Australia". The training.gov.au copyright page is JS-only and unread. Another package's header states "Creative Commons Attribution-No Derivative Works 3.0 Australia" ([PSP12 header PDF](https://training.gov.au/TrainingComponentFiles/PSP12/PSP12_Header_R1.0.pdf)). [verified for PSP12; AUR unverified]

### ES Montaje integral y mantenimiento de bicicletas y VMP

- **Content:** RD 587/2026, a 690 h specialisation course whose learning outcomes are each written as "Se ha …" (has been …) criteria, for example "Se han sustituido y alineado los componentes deteriorados de los neumáticos" (the worn tyre components have been replaced and aligned). **Not entry level**: access requires a prior Técnico title (art. 11), and it covers e-bikes and hydraulics ([BOE-A-2026-15852 PDF](https://www.boe.es/boe/dias/2026/07/21/pdfs/BOE-A-2026-15852.pdf)). [verified]
- **Assessment style:** learning outcomes and assessment criteria per module. The method is left to the provider.
- **Reuse: Q A R.** "No son objeto de propiedad intelectual las disposiciones legales o reglamentarias" (legal and regulatory provisions are not subject to intellectual property) ([LPI art. 13](https://www.boe.es/buscar/act.php?id=BOE-A-1996-8930)). [verified]

### US BIEA ABT curriculum

- **Content:** BIKE 1000–1040: safety, tools, tyre and tube repair, braking and drivetrain basics ([BIEA curriculum page](https://www.biea.org/abtcurriculum)). [verified]
- **Assessment style:** rubric-scored "physical demonstration" plus written exams, graded A–F; targets such as "80% … Satisfactory". [verified]
- **Reuse: R.** No licence stated.

### Park Tool School (BBB-4TG)

- **Content:** novice tier covers tyres and tubes, chains, derailleurs, rim and disc caliper brakes, headsets, plus "Basic Mechanical Skills" (torque, tools, work safety) ([instructor manual table of contents](https://www.parktool.com/en-us/trade-resources/become-a-park-tool-school/bbb-4tg-instructor-manual-table-of-contents)). [verified]
- **Assessment style:** certificates of completion. No assessment is described ([Become a Park Tool School page](https://www.parktool.com/en-us/trade-resources/become-a-park-tool-school)). [verified]
- **Reuse: R only.** A paid manual. Participation needs a distributor account, with possible "exceptions for non-profits". Only the support files may be customised "for use in your store". **Blocker for quoting.**
