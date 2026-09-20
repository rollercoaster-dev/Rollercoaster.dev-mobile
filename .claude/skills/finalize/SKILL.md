---
name: finalize
description: Use when publishing a validated and reviewed issue branch as a PR and updating its board and notification state.
---

# Claude compatibility entrypoint

Read and follow the canonical [finalize skill](../../../.agents/skills/finalize/SKILL.md), resolving the path relative to this file. Pass through the caller's issue, plan, worktree, and manager reservation context. All workflow behavior and safety gates live there; do not maintain a second implementation here.
