# Maestro E2E Tests

End-to-end test flows for the native-rd app, designed for agent authoring and execution.

## Prerequisites

- **Maestro CLI**: `brew install maestro` (not in devDependencies — requires separate install)
- **iOS Simulator**: Must be booted with the app installed (`npx expo run:ios`)
- **App ID**: `com.joe.rd.native-rd`

## Running Flows

```bash
# Run all flows
bun run test:e2e

# Run a single flow
bun run test:e2e:single e2e/flows/goal-create.yaml

# JSON output for agent consumption
maestro test --format junit e2e/flows/
```

## Writing Flows

Flows are YAML files in `e2e/flows/`. Each flow maps to a user story from `docs/vision/user-stories.md`.

### Element matching

Maestro matches elements by:

1. **`id:`** — maps to `testID` prop (most stable)
2. **Text content** — maps to `accessibilityLabel` or visible text (simpler but brittle)

Prefer `id:` for interactive elements (buttons, inputs). Use text matching for assertions (`assertVisible`).

### Flow structure

```yaml
appId: com.joe.rd.native-rd
---
- launchApp
- assertVisible: "Screen Title"
- tapOn: "Button Label"
- inputText:
    id: "input-test-id"
    text: "Value to type"
```

## Required vs Optional Flows

Each flow YAML file has a `# Status: required` or `# Status: optional` comment header.

A flow qualifies as **required** when it meets ALL three criteria:

> **Note:** CI enforcement for required flows is not yet implemented — `scripts/run-e2e.sh` currently runs all flows unfiltered and Maestro is not executed in CI (only Jest unit tests run via `test:ci`). CI integration is tracked in epic #889.

1. **Outcome assertions** — It has assertions that verify outcomes, not just that actions were performed
2. **Stable feature** — It tests a stable, implemented feature (not aspirational)
3. **Deterministic** — No race conditions or flaky element matching

A flow is **optional** when it covers aspirational or partially-implemented features. Optional flows are tracked but excluded from CI gates.

## Current Flows

| Flow                         | Status   | User Story           | Description                                                               |
| ---------------------------- | -------- | -------------------- | ------------------------------------------------------------------------- |
| `goal-create.yaml`           | required | Lina's Quiet Victory | Create a goal, verify navigation to Design Badge screen                   |
| `goal-create-complete.yaml`  | required | Lina's Quiet Victory | Create a goal, add a note in Focus Mode, complete it, add final goal note |
| `badge-view.yaml`            | required | Badge tab            | Navigate to badges tab, verify empty state                                |
| `settings-theme-switch.yaml` | required | Theme switch         | Navigate to settings, switch to Night Ride, verify change                 |

## Deferred Flows

| Flow                 | Blocked On                         | Notes                                                                                                                 |
| -------------------- | ---------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `goal-complete.yaml` | Separate goal completion scenarios | Keep for future completion-path variants beyond the main real quick-note flow covered by `goal-create-complete.yaml`. |
