# Simulator Screenshot

Capture a screenshot of the running iOS simulator for visual verification.

## When to Use

- After making UI changes to visually verify the result
- When debugging layout issues
- To validate theme rendering or empty states

## Usage

```bash
bash .claude/skills/simulator-screenshot/screenshot.sh [output_path]
```

Default output: `/tmp/simulator-screenshot-<timestamp>.png`

## Output

JSON to stdout on success:

```json
{"success": true, "path": "/tmp/simulator-screenshot-1234567890.png", "udid": "XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"}
```

## Workflow

1. Run the screenshot script
2. Read the returned PNG path with the Read tool
3. Claude sees the image and can verify the UI

## Prerequisites

- iOS simulator must be booted
- App must be installed and running (`npx expo run:ios`)
- Xcode command line tools installed (`xcrun simctl`)
