# Security Policy

Thanks for taking security seriously. This project handles cryptographic signing and end-to-end encrypted personal data, so reports — especially around `packages/openbadges-core` (Ed25519 signing, PNG baking, key handling) and `apps/native-rd` (Evolu sync, secure storage, badge verification) — are taken seriously.

## Reporting a vulnerability

Please report security issues **privately**. Do not open a public GitHub issue for security-impacting bugs.

**Preferred:** GitHub's private security advisory feature:
[Report a vulnerability](https://github.com/rollercoaster-dev/Rollercoaster.dev-mobile/security/advisories/new)

**Alternative:** Email `joe.czar@outlook.com` with subject `Security: <brief description>`.

## What to include

If possible:

- Affected component (package / file / version)
- Reproduction steps or proof-of-concept
- Impact assessment (what can an attacker do?)
- Suggested remediation, if you have one

## Scope

**In scope:**

- `packages/openbadges-core` — credential signing, key management, badge baking
- `apps/native-rd` — mobile app, local storage (Evolu/SQLite), sync layer, secure store usage
- `packages/design-tokens` — lower security surface, but reports welcome

**Out of scope / low priority:**

- Bugs in third-party dependencies — please report upstream first
- Attacks requiring physical device access with the app already unlocked
- Social-engineering scenarios against the maintainer
- Theoretical issues with no plausible impact path

## Response timeline

This is a solo-maintained indie project. I aim for:

- **Acknowledge** within 7 days
- **Initial assessment** within 14 days
- **Coordinated disclosure** within 90 days of acknowledgment (per industry-standard CVD)

Severe issues (data leak, key compromise, RCE) get faster turnaround.

## Recognition

Reporters who responsibly disclose are credited in release notes and `SECURITY.md` acknowledgments, unless you'd prefer to remain anonymous. Just let me know your preference.
