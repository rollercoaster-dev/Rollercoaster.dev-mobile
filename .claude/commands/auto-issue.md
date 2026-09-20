# /auto-issue <issue-number> [--dry-run]

Read and follow the canonical [auto-issue skill](../../.agents/skills/auto-issue/SKILL.md), resolving this path relative to this command file. Pass the issue number, optional research-only `--dry-run`, and existing manager dispatch/reservation context. It supports ordinary manual issue work and reserved automation using the same setup, implementation, review, and publication instructions.

Automated runs reject `--skip-review` and `--force-pr`; they never bypass reservation, audit, priority, acceptance, or review gates. Never merge, enable auto-merge, enqueue a merge, or approve the resulting PR. This file is a compatibility entrypoint, not a separate workflow.
