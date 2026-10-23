---
name: expert-review
description: Reviews the current branch (or the checked-out PR) of Rollercoaster.dev-mobile with a panel of domain-expert subagents — correctness, tests, UI/design system, ND accessibility, ND guardrails (ADR-0012 no-auto-judgment), Evolu data model, Open Badges/signing, privacy & security, i18n, build & release, production readiness, docs/ADRs — verifies every finding against the code and writes one ranked report. Report only — never edits code or posts to GitHub. Use when asked for an "expert review" / "panel review", or to review a branch or diff before opening or readying a PR.
---

# Claude compatibility entrypoint

Read and follow the canonical [expert-review skill](../../../.agents/skills/expert-review/SKILL.md), resolving the path relative to this file. Pass through the caller's arguments (none, a PR number/URL, or `issue <n>`). All workflow behavior lives there; do not maintain a second implementation here.
