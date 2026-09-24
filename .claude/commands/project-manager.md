# /project-manager

Read and run the canonical [project-manager skill](../../.agents/skills/project-manager/SKILL.md).
This is an on-demand run of the same workflow used at 09:00 and 21:00 Europe/Berlin.
Sync GitHub, maintain existing work, audit the next eligible board issue, claim it,
and start a coding worker immediately when capacity allows. Continue independent
workers up to the five-slot PR limit. Report PRs or the exact dispatch blocker.
Never merge.
