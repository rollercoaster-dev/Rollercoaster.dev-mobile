# Bike-Mechanic Pilot — Funding and Sponsors

**Date:** 2026-10-26
**Status:** Research, not a decision. Nothing here is applied for, scoped or agreed. No funder was contacted.
**Owner:** Joe

**Scope reference:** [2026-10-26-bike-mechanic-ob3-pilot.md](./2026-10-26-bike-mechanic-ob3-pilot.md) (the pilot being funded) · [Product vision](../vision/product-vision.md) · [LICENSING.md](../../../../LICENSING.md) · [ADR-0005 licensing and trademark](../decisions/ADR-0005-licensing-and-trademark.md) · [ADR-0015 funded scope (Prototype Fund)](../decisions/ADR-0015-funded-scope-prototype-fund.md) · [2026-08-23 Prototype Fund eligibility note](../../../../docs/research/2026-08-23-prototype-fund-eligibility.md)

**Baseline:** `main` at `aad2e486`. All funder pages fetched 2026-10-26. Where a page blocked fetching (Prototype Fund, Mozilla returned 403), the claim comes from the search index of the funder's own domain and is marked [verified, index].

**Glossary:** acronyms and evidence labels are defined in [glossary-community-credentialing.md](./glossary-community-credentialing.md). In short: [verified] read on the funder's own page, [verified, index] funder's page via a search index, [secondary] third party only, [unverified] not confirmed, [inference] my reasoning.

---

## TL;DR

- **The blocker is the applicant, not the licence.** The repo has one owner and no legal entity. All three licences (AGPL, Apache, MIT) are OSI-approved. Only the open-source tech funds take an individual; every education, inclusion and hub-side fund needs a non-profit, often in two countries.
- **Two tech funds fit Joe directly.** NLnet Restack (€5–50k, deadline 3 Nov 2026) and Prototype Fund Class 03 (up to €47.5k, deadline 30 Nov 2026, Germany-resident freelancers only).
- **The pilot itself must be funded through partners.** Erasmus+ KA210 (€30k or €60k, expected March 2027) led by a hub or VET provider, with Joe as subcontractor. Hub-side small grants cover tools and sessions.
- **No bike-industry body offers cash.** ECI, Innovam and Fahrrad Akademie are partners and endorsers. JobRad ServicePro shows the sector does pay for mechanic training, so it is a sponsor pitch for later.

**Two things to settle before acting on this doc:**

1. **Residency.** Prototype Fund is only open to a Germany-resident freelancer. The [2026-08-23 eligibility note](../../../../docs/research/2026-08-23-prototype-fund-eligibility.md) assumes yes but says "confirm". Confirm it; it decides rank 2 below and which national agencies a partner would use.
2. **Whether to chase NLnet on 3 Nov.** That is eight days after this doc's date, for a pilot that is not yet scoped. Applying means writing the pitch this week and committing to a work package before the pilot design exists. The alternative is the inferred 3 Jan 2027 round, with the risk that the €7M budget is gone by then.

**Not worth doing if:** no hub or VET partner is lined up by January 2027. Without a partner organisation, only the two tech grants are reachable, and they fund code, not a pilot.

---

## 1. Applicant facts from the repo

- **Owner:** Joe Czarnecki, "Sole copyright holder as of 2026-05-14" ([LICENSING.md](../../../../LICENSING.md)). The trademark "Rollercoaster.dev" is also his, with filings in progress.
- **Legal entity:** none named anywhere. The project is personal ([AGENTS.md](../../../../AGENTS.md): "Joe's personal project").
- **Licences:** app AGPL-3.0-only; `openbadges-core` Apache-2.0; `design-tokens` MIT; root `LICENSE` AGPL-3.0 for GitHub detection only.
- **Dual-licensing intent:** DCO sign-off is required "to preserve the option to dual-license `apps/native-rd`" commercially later ([LICENSING.md](../../../../LICENSING.md)). This does not conflict with funders that only require results under a FOSS licence. Whether any funder objects to a later commercial licence is [unverified]; see open questions.
- **Founder residency:** unconfirmed, see TL;DR.

**What fits where [inference]:** the Apache-2.0 `openbadges-core` package is the most fundable piece for infrastructure funders, because it is reusable by anyone. The AGPL app suits funders that ask for end-user tools. Education funders pay for the pilot, not the code.

---

## 2. Ranked options

Fit and effort ratings are [inference].

1. **NLnet Restack** (EU, Horizon Europe). €5k–50k to individuals, FOSS required. Deadline 3 Nov 2026, 12:00 CET. Pitch the tech: OB3 endorsement, `did:web` organisational verification and phone-to-phone transfer in `openbadges-core`, framed as local-first internet infrastructure. Fit medium-strong; effort low. Readiness: low, see TL;DR.
2. **Prototype Fund Class 03** (DE, federal research ministry). Up to €47.5k individual or €95k team for 6 months, plus an optional second stage. Deadline 30 Nov 2026, 15:00 CET. Only a Germany-resident freelancer or a team GbR with one member in Germany. Application in German. Fit medium-strong; effort medium. Readiness: blocked on the residency check.
3. **Erasmus+ KA210 small-scale partnership, VET or adult education** (EU, plus the UK from 2027). Lump sum of €30k or €60k. Needs 2 organisations from 2 countries. Expected deadline March 2027. Fit strong for the hub and learning side; effort medium. Readiness: zero, no partner contacted. Joe cannot be the applicant, only a subcontractor or associated partner.
4. **Aktion Mensch** (DE). Up to €300k. Window 1 Jan – 15 Feb 2027. German non-profit only, project framed around disability or social difficulty. Fit medium; effort medium-high.
5. **Hub-side small grants**, for a hub that is already a non-profit: UK National Lottery Awards for All (£300–20k, rolling), Cycling UK Big Bike Revival (2027 sign-up open), NL VSBfonds (rolling), DE anstiftung (tools and equipment only). Fit medium; effort low.

**Suggested funding stack [inference]:**

- **Tech, Joe as an individual:** NLnet Restack (3 Nov or 3 Jan). If German-resident, also Prototype Fund (30 Nov) for a _separate_ work package. Both funders ask about other funding, so the same work cannot be funded twice.
- **Pilot and learning side, partners apply:** an Erasmus+ KA210 in March 2027, led by one hub or VET provider with a partner in a second country. Candidates named in the pilot doc: Innovam/Cyclehub (NL), Fahrrad Akademie/VSF (DE), a Cytech centre (UK). Joe is paid as a subcontractor.
- **Tools and sessions at the hub:** one local small grant in the hub's own country.
- **Credibility and in-kind:** the ECI webinar on 5 Nov 2026 to meet partners; later an ESEG endorsement and parts or tools from brands. Do not count on cash.

**Budget against build [inference]:** the two tech grants together are at most about €100k. The pilot's engineering preconditions (pilot doc §6) plus the before-pilot items in the [key-compromise note](./2026-10-26-credential-key-compromise-recovery.md) §8 are a plausible fit for that. The full Design A there (timestamps, logs, verifier page) is not, and should wait for a second round.

---

## 3. Open-source and public-interest tech

### NLnet: Restack (Open Internet Stack)

- **Funder:** NLnet, with money from the European Commission's DG CONNECT under Horizon Europe grant agreement No. 101299072. [verified] [Restack programme page](https://nlnet.nl/restack/)
- **Amount:** €5,000–50,000 for a first grant, with "significant scale-up" possible for proven projects. Total budget €7M. [verified]
- **Scope:** core internet infrastructure and open alternatives. The page names "local-first" infrastructure and end-user applications as in scope. AI projects are out of scope. Credentials and identity are not named. [verified]
- **Who may apply:** "There are no categorical exclusions of persons". The project needs a "strong European dimension", usually team members in Horizon Europe-eligible countries receiving at least 60% of the money. [verified] [Restack eligibility page](https://nlnet.nl/restack/eligibility/). The UK has been associated to the whole of Horizon Europe since 1 Jan 2024 [verified] ([Commission page on UK association](https://research-and-innovation.ec.europa.eu/strategy/strategy-research-and-innovation/europe-world/international-cooperation/association-horizon-europe/united-kingdom_en)), so a founder in DE, NL or the UK qualifies.
- **Conditions:** all software under a recognised FOSS licence; AGPL and Apache qualify. R&D must be the main aim. [verified] [NLnet funding page](https://nlnet.nl/funding.html), [Restack guide for applicants](https://nlnet.nl/restack/guideforapplicants/)
- **Deadline:** 3 Nov 2026, 12:00 CET. [verified] [NLnet proposal page](https://nlnet.nl/propose/). NLnet runs back-to-back calls with "a deadline on the 3rd of every _odd_ month", which would make the next one 3 Jan 2027 [inference]. Calls continue "until the budget of the programme has been fully allocated (expected early 2027)" [verified].
- **Process:** a web form: a 1,000-character summary, budget breakdown, comparison with other efforts, technical challenges, ecosystem, and a disclosure of any generative-AI use with the prompts. Scoring is technical excellence 30%, relevance and impact 40%, value for money 30%; a project needs 5.0 out of 7 to pass. [verified]
- **Fit: medium-strong.** OB3 endorsement, `did:web` issuer verification and infrastructure-free phone-to-phone transfer are local-first trust infrastructure, and the bike hub is a concrete first deployment. The risk is that reviewers see an education app rather than "internet stack". Lead with `openbadges-core` and the protocols. [inference]
- **Effort: low.** One form, no partner, no entity.

**Other NLnet funds:** NGI Zero Commons Fund and NGI Zero Core have closed their final calls [verified] ([NGI0 page](https://nlnet.nl/NGI0/)). The Open Social Fund is ActivityPub-only and accepts no new proposals [verified] ([Open Social page](https://nlnet.nl/opensocial/)). CodeSupply covers supply-chain security and does not fit.

### Prototype Fund (Germany)

The site returns 403 to fetchers. Everything below is [verified, index]. Sources: [application](https://www.prototypefund.de/en/application), [FAQ](https://www.prototypefund.de/en/faq), [funding](https://www.prototypefund.de/en/funding), [Innovation track](https://www.prototypefund.de/en/innovation).

- **Funder:** the Federal Ministry of Research, Technology and Space.
- **Amount:** up to €47,500 for an individual or €95,000 for a team over 6 months (950 or 1,900 hours at €50). An optional 4-month second stage adds up to about €31.7k individual or €63.3k team; the site gives slightly different second-stage figures on different pages.
- **Who may apply:** individuals or teams of up to four. A solo applicant must live in Germany, be self-employed or freelance, and pay tax there. A team needs a GbR in Germany with at least one member resident; up to a third of members may live elsewhere in Europe. "Applications from companies, associations or other organisations are not permitted."
- **Conditions:** FOSS only, in data security, software infrastructure or alternatives to big tech. It pays only for working hours, not travel or hardware. The formal application must be in German.
- **Deadline:** Class 03 is open 1 Oct – 30 Nov 2026, 15:00 CET. Funding runs June–Nov 2027, second stage Dec 2027 – Mar 2028. Decisions about 8 weeks after the deadline.
- **Fit: medium-strong** if the residency rule is met. A local-first, no-cloud credential wallet is an "alternative to big tech". [inference]
- **Effort: medium.** German paperwork; the 6-month plan has to stand alone.

### Sovereign Tech Agency: Sovereign Tech Fund

- Funds "open digital base technologies" such as libraries, package managers and encryption tools. "We do not finance the development of prototypes", and it does not currently accept user-facing apps. Minimum €50,000; about 6 months from application to contract. [verified] [Sovereign Tech Fund page](https://www.sovereign.tech/programs/fund)
- **Fit: weak.** The pilot is a prototype and the app is user-facing. Revisit only if `openbadges-core` gains real downstream users. [inference]

### Mozilla

- MOSS "is on indefinite hiatus and is not currently accepting applications". [verified] [MOSS page](https://www.mozilla.org/en-US/moss/)
- The only open call is the Human-Scale AI Incubator: up to $500k over three years, closing 20 Nov 2026. [verified, index] It is an AI programme; this pilot has no AI. **Fit: none.**

### Digital Public Goods Alliance

- A registry, not a funder. Recognition needs nine indicators, including SDG relevance, an approved open licence, clear ownership, privacy compliance and "do no harm by design". It lasts one year and must be renewed. Only an authorised representative of the owner may apply. [verified] [DPG submission guide](https://www.digitalpublicgoods.net/submission-guide)
- **Fit: medium as credibility, zero as money.** Worth doing after the pilot, since some education funders recognise DPG status. [inference] Effort low.

### Smaller or weaker open-source leads

- **SIDN fonds Pioneers (NL):** up to €10,000. Natural persons may apply for that amount; above it a legal entity is required. Rolling. Impact "initially in the Netherlands", fitting "Stronger internet". [verified] [SIDN fonds Pioneers page](https://www.sidnfonds.nl/pioneers). **Fit: weak-medium**, and only with a Dutch hub.
- **FLOSS/fund (Zerodha):** from $10k up to $100k a year; individuals worldwide; reviewed quarterly. But "Very new projects or projects with minimal usage are not considered for the time being." [verified] [FLOSS/fund FAQ](https://floss.fund/faq/). **Fit: weak** until the app has users.

---

## 4. Education, VET and skills

None of these accept an individual applicant.

### Erasmus+ KA210 small-scale partnerships (VET or adult education)

- **Amount:** a fixed lump sum of €30,000 or €60,000 for 6–24 months. [verified] [Programme Guide, KA210](https://erasmus-plus.ec.europa.eu/programme-guide/part-b/key-action-2/small-scale-partnerships)
- **Who may apply:** "Any participating organisation established in an EU Member State or third country associated". At least 2 organisations from 2 countries. Widening access for "newcomers, less experienced organisations and small-scale actors" is a stated aim and is scored. [verified]
- **Open-licence rule:** educational resources and tools produced must be freely available under an open licence. [secondary] [Programme Guide, Part A](https://erasmus-plus.ec.europa.eu/programme-guide/part-a/important-characteristics-of-the-erasmus-programme). AGPL output fits [inference].
- **Deadline:** in the 2026 guide, 5 March 12:00 Brussels time, with an optional 1 October round at some national agencies. [verified] The 2027 guide is not published; the guide page still shows the 2026 version. The German agency expects the next deadline "voraussichtlich im März 2027" (probably in March 2027) ([NA beim BIBB, VET partnerships](https://www.na-bibb.de/beantragen/kleinere-partnerschaften/berufsbildung)). [verified] The 2027 call is expected in mid-November 2026 [secondary] ([TU Dresden European Project Center](https://tu-dresden.de/forschung-transfer/services-fuer-forschende/european-project-center/news/2026-10-13-erasmus-call-2027-restriktionen)).
- **Residency and the UK:** each applicant applies to its own country's national agency: NA beim BIBB in Germany for VET and adult education. The UK rejoins Erasmus+ in 2027: UK organisations "will be able to apply to take part in any kind of Erasmus+ projects funded in 2027". [verified] [The UK and Erasmus+](https://erasmus-plus.ec.europa.eu/the-uk-and-erasmus). The NL agency's 2027 date is [unverified].
- **Fit: strong.** A hub and a VET provider in two countries piloting community-learning badges is exactly ECI report rec 2.6. It also fits KA210's newcomer focus. [inference]
- **Effort: medium.** Each organisation needs an EU Login and an Organisation ID. Expect 2–4 weeks of writing, mostly by the lead partner.

### Erasmus+ KA220 cooperation partnerships

- €120k, €250k or €400k for 12–36 months; at least 3 organisations from 3 countries. [verified] [Programme Guide, KA220](https://erasmus-plus.ec.europa.eu/programme-guide/part-b/key-action-2/cooperation-partnerships). Expected deadline March 2027 ([NA beim BIBB, cooperation partnerships](https://www.na-bibb.de/beantragen/kooperationspartnerschaften)). A rule that the applicant must have existed for 2 years is [unverified].
- **Fit: medium**, as a scale-up to several hubs after a first pilot. **Effort: high.**

### Erasmus+ Centres of Vocational Excellence

- Up to €4M over 48 months; at least 8 beneficiaries from 4 countries, each with an employer and a VET provider. 2026 deadline 3 September; 2027 date [unverified]. [verified] [Programme Guide, CoVE](https://erasmus-plus.ec.europa.eu/programme-guide/part-b/key-action-2/centres-of-vocational-excellence)
- **Fit: weak as applicant**, medium as an associated partner if a bike or mobility CoVE forms around the ECI expert group. [inference]

### Germany: federal VET programmes

- **InnoVET PLUS:** no new call; BIBB's release of 8 Oct 2026 names no follow-up programme. [secondary] [BIBB press release](https://www.bibb.de/de/pressemitteilung_229801.php)
- **InternationalVET:** a framework guideline published 28 Aug 2026 funds pilots that bring international VET innovation into German VET. Themes include re-, up- and cross-skilling, partial qualifications, digitalisation and skills shortages. Applicants are VET organisations established in Germany; publications must be open access. No specific call yet [unverified]. [Bundesanzeiger notice](https://www.bundesanzeiger.de/pub/publication/Rg9JwozEgzPIomkaf7T/content/Rg9JwozEgzPIomkaf7T/BAnz%20AT%2028.08.2026%20B2.pdf). **Fit: medium**, with a Dutch or French partner model; watch [berufsbildung-international.de](https://www.berufsbildung-international.de).
- **ESF Plus federal calls:** none of the open calls covers career changers or continuing training ([ESF Plus calls](https://www.esf.de/portal/DE/ESF-Plus-2021-2027/Aufrufe/inhalt.html)). The nearest is "Zusammenhalt stärken – Menschen verbinden", for non-profit providers working with ages 14–27; expressions of interest due 28 Feb 2027 ([programme page](https://www.esf.de/portal/DE/ESF-Plus-2021-2027/Foerderprogramme/bmbfsfj/zusammenhalt_staerken.html)). [secondary] **Fit: weak.**
- **Learner fees, not project money:** career-changer courses at AZAV-certified providers can be paid with an Arbeitsagentur Bildungsgutschein (training voucher). Fahrrad Akademie (VSF and BIKE&CO) launched such a course in March 2026. [secondary] [trade press report](https://pedelec-elektro-fahrrad.de/?p=661948). This matters for a learner pathway, not for funding the pilot.

### Netherlands

- **Regionaal Investeringsfonds mbo:** €250k–2.5M; an mbo college plus an employer must apply; windows 1–31 Jan 2027 and 1–30 Jun 2027; the fund ends in 2027. [secondary] [DUS-I programme page](https://www.dus-i.nl/subsidies/middelbaar-beroepsonderwijs/regionaal-investeringsfonds-mbo). **Fit: weak-medium**; the app would be one component of a college's project.
- **ESF+ NL:** the Sectoren round closed 30 Jun 2026; nothing open. [secondary] [ministry notice](https://www.uitvoeringvanbeleidszw.nl/actueel/nieuws/2026/07/01/wijzigingsregeling-esf-hoofdstuk-sectoren-tweede-tijdvak)

### United Kingdom

- Apart from Erasmus+ from 2027, nothing fits. Knowledge Transfer Partnerships Round 4 closes 27 Jan 2027 but needs a UK university or FE college plus a business. [secondary] [Innovation Funding Service competition page](https://apply-for-innovation-funding.service.gov.uk/competition/2605/overview/4b82d27a-2794-457c-8dc7-7ec4f6911c84)

### EU-wide, not funders

- **Pact for Skills:** a network and charter, not a funding programme. [secondary] [Pact for Skills about page](https://pact-for-skills.ec.europa.eu/about_en). Useful for credibility once a partner organisation exists.
- **Europass / EDC:** no call funds EDC issuers. The pilot research already concludes EDC is not a near-term target.

---

## 5. Mobility and cycling

- **Cycling UK Big Bike Revival (England):** Active Travel England confirmed £8m over three years on 31 Mar 2026. It funds Fix, Learn and Ride events through volunteer groups, non-profits and social enterprises in England, excluding London. 2026 money is allocated; an expression-of-interest form signs groups up for 2027. [secondary] [Cycling UK news](https://www.cyclinguk.org/news/big-bike-revival-secures-three-more-years-funding), [delivery partners page](https://www.cyclinguk.org/bigbikerevival/delivery-partners). The per-application cap (up to £3,500) is [unverified]. **Fit: medium** for an English hub's sessions; low effort.
- **BMV (DE) "innovative cycling projects" guideline:** legal persons including associations and companies; non-investment projects usually funded at 75%. The guideline expires 31 Dec 2026. The older non-investment NRVP guideline expired 31 Dec 2025 with no successor. [secondary] [Förderdatenbank entry](https://www.foerderdatenbank.de/FDB/Content/DE/Foerderprogramm/Bund/BMVI/innovation-radverkehr-deutschland.html), [BMV page](https://www.bmv.de/SharedDocs/DE/Artikel/StV/Radverkehr/nicht-investive-modellprojekte.html). **Fit: weak now.** Watch for a 2027 successor.
- **Interreg North Sea Call 6:** opens 1 Dec 2026, deadline 15 Mar 2027; up to €1M; 3–9 partners from 3 countries, building on an existing 2021–27 North Sea project. [secondary] [Interreg North Sea Call 6 page](https://www.interregnorthsea.eu/call-6). **Fit: weak** for newcomers.
- **Dropped:** EIT Urban Mobility (no skills or cycling topic; startup call needs an equity round) ([calls page](https://www.eiturbanmobility.eu/join-us/call-for-proposals/)); Interreg NWE (follow-on calls only); Horizon Europe Cluster 5 (no active-mobility skills topic found, not exhaustive); Active Travel England Innovation Fund (closed 14 Nov 2025).

---

## 6. Inclusion and community (hub side)

All need a non-profit legal entity. Residency is the organisation's, not the founder's.

- **Aktion Mensch (DE):** window 1 Jan – 15 Feb 2027, decision 30 Jun 2027; non-profit organisations based in Germany; up to €300,000; smaller projects need no own funds. Focus areas are work, housing, community and young people, for people with disabilities or in social difficulty. [verified] [Aktion Mensch funding page](https://www.aktion-mensch.de/foerderung). **Fit: medium** [inference]: neurodivergent learners count only where the project is framed around disability, and the app is a tool, not the funded object. **Effort: medium-high.**
- **anstiftung (DE), open workshops:** only tax-privileged non-profits may apply. It pays for equipment, machines, tools and materials, and travel to its network meetings; not staff or running costs. Informal application of up to 3 pages by email. Users must take part in planning. Applications from marginalised groups and inclusive concepts are preferred. No amount or deadline stated; the guideline is dated 2024. [verified] [anstiftung funding guideline (PDF)](https://anstiftung.de/media/attachments/2024/03/13/foerderrichtlinien_offene-werkstaetten_2024.pdf). **Fit: medium** for a German hub's tools; effort low.
- **DBU (DE):** a theme-open stream and a sustainability-education theme exist; process starts with a short project sketch. [verified] [DBU funding themes](https://www.dbu.de/foerderthemen). Eligibility of individuals and the Germany focus are [unverified]. **Fit: weak-medium**, via repair and circular economy.
- **National Lottery Awards for All England:** £300–20,000, projects up to 2 years, about 16 weeks to a decision, no deadline stated. Constituted groups, charities, CICs and non-profit companies; not individuals, sole traders or organisations outside the UK. [secondary] [programme page](https://www.tnlcommunityfund.org.uk/funding/funding-programmes/national-lottery-awards-for-all-england), [who can apply](https://www.tnlcommunityfund.org.uk/funding/funding-programmes/national-lottery-awards-for-all-england/who-can-apply). **Fit: medium**; low effort.
- **VSBfonds (NL), "Eigen mogelijkheden en vaardigheden" (own abilities and skills):** a foundation or association; rolling, apply 4 months before start; for participants building skills and motivation toward work (pure job placement excluded). [secondary] [VSBfonds programme page](https://www.vsbfonds.nl/donaties/mens-maatschappij/eigen-mogelijkheden-en-vaardigheden). Amount limits conflict between pages [unverified]. **Fit: medium.**
- **Oranje Fonds (NL):** €500–100k, never 100% of a project, rolling, 6–8 week decision; foundations and associations only. Projects focused on education may fall outside its remit. [secondary] [Oranje Fonds application page](https://www.oranjefonds.nl/geld-aanvragen-bij-het-oranje-fonds). **Fit: weak-medium.**
- **Dropped or not checked:** DSEE (only grants up to €1,500), Kansfonds (homelessness and poverty focus), Henry Smith Career Ready (closed). Esmée Fairbairn, Paul Hamlyn, Nesta, NSGK and Fonds 1818 were not checked [unverified]. No neurodiversity-specific adult-skills funder was found in DE, NL or the UK.

---

## 7. Industry sponsors

No bike-industry body publishes an open call or sponsorship offer that an individual or a hub can apply to. The realistic roles are partner, endorser and in-kind supporter.

- **ECI / Shimano NextGen Mechanics / ESEG.** ECI leads the follow-up through its Education and Skills Expert Group. No money or pilot-city application route is published. A public webinar on the report runs 5 Nov 2026, 15:00–16:00 CET ([ECI webinar page](https://cyclingindustries.com/news/details/eci-webinar-europe-needs-105000-more-bike-mechanics-by-2032-how-will-we-get-there/)). [secondary] **Strong** as endorsement and partner-finding; no cash. Effort: low (attend).
- **JobRad ServicePro (DE).** €30 or €60 per invoiced inspection for JobRad partner dealers; one criterion is training at least one apprentice. €16M in total ([JobRad ServicePro page](https://www.jobrad.org/fachhandel/servicepro.html)). No foundation or training fund. [secondary] **Medium** as a sponsor pitch: it already ties money to mechanic training. No application route.
- **Fahrrad Akademie (VSF + BIKE&CO, DE).** Modular career-changer course, AZAV-certified, voucher-fundable ([trade press](https://pedelec-elektro-fahrrad.de/?p=661948)). [secondary] **Strong** as training partner or content endorser; not a funder.
- **Innovam / Cyclehub / OOMT (NL).** Innovam runs a 4-month career-changer course ([Innovam career-changer page](https://www.innovam.nl/zij-instroom)). OOMT offers training and recognition of prior learning but no project grants ([OOMT site](https://www.oomt.nl/)). [secondary] **Strong** as Erasmus+ partner; none as funder.
- **SRAM Community Program.** Worldwide, organisations; partnerships, workshops, unstated funding. 2026–27 window closed; next opens autumn 2027 ([SRAM community applications](https://sram.com/en/life/culture/community/applications)). [secondary] Medium for a hub, later.
- **Bosch eBike Systems.** Dealer certification only. Gave parts to an Austrian vocational school in 2024 ([WKO news](https://www.wko.at/gewerbe-handwerk/mechatroniker/firma-bosch-uebergibt-anschauungsmaterial-an-berufsschule)). [secondary] Weak; in-kind at most. The pilot excludes e-bikes anyway.
- **Bicycle Association (UK) / Bike Hub.** Industry levy of about £4.4M over 12 years, mostly grassroots cycling ([Bicycle Association page](https://www.bicycleassociation.org.uk/?p=39)). No 2026 round found. [secondary] Weak.
- **Bikeleasing-Service, Lease a Bike / Pon, Cyclescheme, ZIV, BOVAG.** Dealer training and referral bonuses only (e.g. [Bikeleasing dealer page](https://bikeleasing.de/en/bicycle-dealer)); no public programme found for the others. [unverified absence] Weak; pitch only.

**Precedent [secondary]:** in the UK, community mechanic courses have been paid by local corporate community funds, for example South Western Railway funding 12 residents' training in Hounslow ([Hounslow Council news](https://www.hounslow.gov.uk/news/article/3114/hounslow_council_welcomes_south_western_railways_cash-boost_to_pump_prime_bike_mechanic_course)). The hub's local utilities and transport operators are worth checking once a hub is chosen.

---

## 8. Deadlines and dates to 2027-01-26

| Date                       | What                                                                | Who applies                             |
| -------------------------- | ------------------------------------------------------------------- | --------------------------------------- |
| **3 Nov 2026, 12:00 CET**  | NLnet Restack round                                                 | Joe, as an individual                   |
| 5 Nov 2026, 15:00 CET      | ECI webinar on the mechanics report (partner-finding, not funding)  | Anyone                                  |
| Mid-Nov 2026 (expected)    | Erasmus+ 2027 call and guide published [secondary]                  | —                                       |
| **30 Nov 2026, 15:00 CET** | Prototype Fund Class 03                                             | Joe, only if German-resident freelancer |
| 1 Dec 2026                 | Interreg North Sea Call 6 opens (closes 15 Mar 2027)                | Existing Interreg partners              |
| 31 Dec 2026                | BMV innovative cycling projects guideline expires                   | Legal persons                           |
| 3 Jan 2027 (inferred)      | Possible next NLnet round, if Restack budget remains [inference]    | Joe                                     |
| 1 Jan – 15 Feb 2027        | Aktion Mensch window                                                | German non-profit                       |
| 1–31 Jan 2027              | NL Regionaal Investeringsfonds mbo window                           | mbo college plus employer               |
| About 5 Mar 2027           | Erasmus+ KA210 / KA220 (expected); partners must be lined up by Jan | Hub or VET organisation                 |

---

## Open questions

1. **Where does Joe live and work?** Decides Prototype Fund eligibility and which country's agencies a partner would use. [ADR-0015](../decisions/ADR-0015-funded-scope-prototype-fund.md) already plans a Prototype Fund (Jahrgang 03) application, so this should be settled, not open.
2. **Is a legal entity worth forming?** Only NLnet, Prototype Fund, SIDN Pioneers (up to €10k) and FLOSS/fund take individuals. Every education, inclusion and hub fund needs an organisation. The cheaper route is to let the hub or a VET provider apply and contract Joe. Forming an e.V. or gGmbH (DE) or a stichting (NL) is slower and many funders want a track record (KA220 possibly 2 years [unverified]). [inference]
3. **Which hub, in which country?** Hub-side funds follow the hub's country: Aktion Mensch and anstiftung need a German non-profit, Awards for All a UK one, VSBfonds and Oranje Fonds a Dutch one.
4. **Does a later commercial dual licence conflict with any grant?** NLnet and Prototype Fund require FOSS release of funded results; whether either restricts a parallel commercial licence of the same code is [unverified]. Check each grant agreement before signing.
5. **Can NLnet and Prototype Fund both fund the project?** Both ask about other funding. They would need clearly separate work packages. [inference]
6. **Will the ECI expert group or Innovam engage?** They are the most credible partners, but nothing published invites outside proposals. The 5 Nov webinar is the low-cost first contact.
7. **Unverified items to re-check:** Prototype Fund pages directly (403 to fetchers); the 2027 Erasmus+ guide and NL national-agency dates; the Big Bike Revival grant cap; VSBfonds amount limits; DBU eligibility; whether Restack has a 3 Jan 2027 round.

---

## Relationship to existing research

- **[2026-10-26-bike-mechanic-ob3-pilot.md](./2026-10-26-bike-mechanic-ob3-pilot.md):** _Extends._ The pilot sketch names a hub, peer mechanics and a VET-adjacent endorser. This doc finds that the same organisations are the ones who must apply for the education and hub money. The engineering preconditions there map onto an NLnet or Prototype Fund work plan.
- **[2026-10-26-credential-key-compromise-recovery.md](./2026-10-26-credential-key-compromise-recovery.md):** _Constrains._ Its before-pilot items fit a tech grant; its full Design A does not. See §2, "Budget against build".
- **[2026-10-16-public-repo-risk-assessment.md](./2026-10-16-public-repo-risk-assessment.md):** _Agrees._ Staying public and open source keeps the project eligible for every FOSS fund here.
