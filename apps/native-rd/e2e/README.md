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
bun run test:e2e:single e2e/flows/goal-create-complete.yaml

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

## Current Flows

| Flow | User Story | Description |
|------|-----------|-------------|
| `goal-create-complete.yaml` | Lina's Quiet Victory | Create a goal (completion flow is aspirational) |
| `badge-view.yaml` | Badge tab | Navigate to badges tab, verify empty state |
| `settings-theme-switch.yaml` | Theme switch | Navigate to settings, switch to Night Ride theme |
