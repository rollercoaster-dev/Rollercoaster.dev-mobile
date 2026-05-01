# User Flows: Iteration A

**Date:** 2026-02-02 (updated 2026-02-18)
**Status:** Iteration A — current
**Owner:** Joe

---

## Overview

Iteration A is the core loop: create a goal, break it into steps, attach evidence, complete it, earn a badge. These flows cover every screen and interaction in the app.

### Screen Map

```
Welcome (first launch only)
    ↓
Goals (tab) ←→ Badges (tab) ←→ Settings (tab)
    ↓                ↓
[goal card tap]   Badge Detail
    ↓
Focus Mode  ←→  Timeline Journey
    ↑  ↓edit
    └── Edit Mode
    ↓ (all steps done, auto)
Completion Flow
    ↓
Timeline Journey  (or back to Goals)
```

### Navigation

Three bottom tabs.

- **Goals** — active goals list. The default tab.
- **Badges** — earned badges. The backpack.
- **Settings** — theme, accessibility, data export.

---

## Flow 1: First Launch

The user opens the app for the first time.

```
Splash → Welcome Screen → Goals (empty state)
```

### Welcome Screen

Brief — one or two screens max, not a tutorial carousel.

- "Track your goals. Earn your badges. Everything stays on your phone."
- Theme picker shown immediately: "Pick what feels right" with the 7 themes as visual swatches
- Content density option: compact / normal / spacious
- No account creation, no email, no sign-up. The app just works.

### Behind the Scenes

- Generate Ed25519 keypair (for badge signing)
- Store private key in Expo SecureStore
- Create local database
- Apply chosen theme

### Goals (empty state)

- "No badges yet. What have you been up to?"
- Single prominent FAB/button: "New Goal"

### ND Considerations

- Theme choice is the first thing, not an afterthought buried in settings
- No forced decisions — theme and density can be changed anytime
- Zero friction to start — no account, no permissions, no onboarding quiz

---

## Flow 2: Create a Goal

```
Goals → New Goal (modal) → Focus Mode
```

### New Goal (modal)

- Title field (required, autofocused)
- Description field (optional)
- "Create" button
- That's it. No category picker, no due date, no priority level. Just a title.

### After Creation

- Goal appears in the Goals list
- Tap it immediately → Focus Mode (the primary way to work on a goal)

---

## Flow 3: The 3-Mode Goal System

Every goal has three modes, accessible from Focus Mode. The modes are not equal — **Focus Mode is the primary mode** where you actually do the work.

```
Goals list
  └─ [tap goal] → Focus Mode (primary)
                      ├─ [✏️ header icon] → Edit Mode
                      ├─ [tap MiniTimeline] → Timeline Journey
                      └─ [all steps done, auto] → Completion Flow
```

---

### Focus Mode

The main screen for working through a goal. You spend most of your time here.

**Layout:**

```
┌──────────────────────────────┐
│  [Goal Title]        [✏️]    │  ← title + edit icon button
│  ●──●──●──●  ────────────   │  ← MiniTimeline (tap → Timeline Journey)
│                              │
│  ┌────────────────────────┐  │
│  │   Step 2 of 4          │  │  ← StepCard (swipe left/right)
│  │   "Write the tests"    │  │
│  │                        │  │
│  │   [ ] Mark complete    │  │
│  └────────────────────────┘  │
│         ● ● ◉ ●  ●+         │  ← ProgressDots
│                              │
│  [Evidence ▾]  [+ Add] [FAB] │  ← EvidenceDrawer handle + FABMenu
└──────────────────────────────┘
```

**Interactions:**

| Action                     | How                                       |
| -------------------------- | ----------------------------------------- |
| Move between steps         | Swipe left/right on the card              |
| Jump to a step             | Tap the corresponding dot in ProgressDots |
| Complete/uncomplete a step | Tap the checkbox on the StepCard          |
| View current evidence      | Pull up the EvidenceDrawer                |
| Add evidence               | Tap the FAB → pick evidence type          |
| Go to Edit Mode            | Tap the ✏️ edit button in the header      |
| See the full journey       | Tap anywhere on the MiniTimeline          |

**The goal card:** After all step cards, there's a final "goal card" (GoalEvidenceCard) for attaching evidence directly to the goal rather than a specific step.

**Auto-completion:** When every step is marked complete, the screen automatically navigates to Completion Flow after a short delay (400ms). The user doesn't need to find a "Complete Goal" button.

---

### Timeline Journey

A read-only visual overview of the whole goal. Good for seeing the big picture or reviewing what you've done.

**Layout:**

```
┌──────────────────────────────┐
│  [Goal Title]  [Back to Focus│
│  [description]               │
│  ████████░░░░░ 3/5 steps     │  ← ProgressBar
│                              │
│  ● Step 1 ✓ (2 evidence)     │
│  │                           │
│  ● Step 2 ✓ (1 evidence)     │
│  │                           │
│  ◉ Step 3 (current)          │
│  │                           │
│  ○ Step 4                    │
│  │                           │
│  ─── Finish Line ───         │  ← FinishLine component
└──────────────────────────────┘
```

**Interactions:**

| Action                       | How                                  |
| ---------------------------- | ------------------------------------ |
| Return to Focus Mode         | Tap "Back to Focus" button in header |
| Jump to Focus Mode on a step | Tap any step node                    |

---

### Edit Mode

For managing the structure of the goal — title, description, steps. Not for doing the work.

**Layout:**

- Title field (editable, autosaves with debounce)
- Description field (optional)
- Step list with drag-to-reorder
- Delete goal option
- Back button → returns to Focus Mode

**Interactions:**

| Action           | How                                      |
| ---------------- | ---------------------------------------- |
| Edit goal title  | Tap title field, type                    |
| Edit description | Tap description field, type              |
| Add a step       | Tap "Add Step" button                    |
| Reorder steps    | Drag handle on each step row             |
| Delete a step    | Swipe or trash icon                      |
| Delete the goal  | "Delete Goal" button (with confirmation) |

**Autosave:** Title and description save automatically after 500ms of inactivity. No "Save" button needed.

---

## Flow 4: Add Evidence

Evidence can be attached to any step (to prove it was done) or to the goal itself (for overall progress or final results).

```
Focus Mode (any card) → FABMenu → pick type → Capture screen → back to Focus Mode
```

### Evidence Types

| Type       | Capture Screen   | What happens                 |
| ---------- | ---------------- | ---------------------------- |
| Photo      | CapturePhoto     | Opens camera directly        |
| Video      | CaptureVideo     | Opens camera in video mode   |
| Voice Memo | CaptureVoiceMemo | Starts recording immediately |
| Text Note  | CaptureTextNote  | Text editor                  |
| Link       | CaptureLink      | URL field                    |
| File       | CaptureFile      | Document picker              |

### After Capture

- Preview of what you just captured
- Optional caption field (one line, not required)
- "Attach" button → evidence appears in the EvidenceDrawer on that step or goal card

### Viewing Evidence

- Tap any evidence item in the EvidenceDrawer → full-screen viewer
- Photo → PhotoViewerModal
- Video → VideoPlayerModal
- Voice memo → AudioPlayerModal
- Text note → TextNoteViewerModal

### ND Considerations

- Camera and voice memo open directly — fewest taps between "I want to capture this" and recording
- Voice memo is equal to text, not hidden behind "more options"
- Caption is optional — the evidence speaks for itself
- No mandatory metadata. Timestamp is automatic.

---

## Flow 5: Complete a Goal and Earn a Badge

```
Focus Mode (all steps done, auto) → Completion Flow → Timeline Journey → Goals list
```

### Completion Flow

This is a character moment. Arrives automatically when all steps are checked off.

- Badge image shown (generated from goal title and accent color)
- Goal evidence can still be added here: "Add Final Evidence" button
- "View Your Journey →" — shows Timeline Journey with the full arc
- "Reopen Goal" — if you're not done yet, go back to Focus Mode with the goal active again

### Behind the Scenes

- OB3 Verifiable Credential created with all evidence references
- Credential signed with the user's local Ed25519 key
- Badge image baked (credential embedded in PNG)
- Badge record written to database

### ND Considerations

- Completion arrives automatically — no hunting for a "Complete" button
- "Reopen Goal" is always available — scope change is a feature, not a failure
- The moment is warm, not overwhelming. No confetti explosion.
- No forced sharing prompt, no "tell your friends"

---

## Flow 6: Home Screen (Goals tab)

```
┌─────────────────────────┐
│  ⚙️                       │
│                           │
│  [Active Goal 1]          │  ← tap → Focus Mode
│    3/5 steps              │
│                           │
│  [Active Goal 2]          │  ← tap → Focus Mode
│    1/3 steps              │
│                           │
│         [+ New Goal]      │
│                           │
│  ▸ 4 completed            │  ← tap to expand
│                           │
├───────────────────────────┤
│   Goals   Badges  Settings│
└───────────────────────────┘
```

- Active goals listed with title and step progress
- Completed goals hidden by default, expandable
- Tap any goal → Focus Mode directly (no intermediate "goal detail" screen)
- "New Goal" button always visible

---

## Flow 7: Badges tab

- Badge images in a grid or list
- Tap for Badge Detail
- Most recent first
- Empty state: "No badges yet" with link to Goals tab

### Badge Detail

- Badge image
- Goal title (the achievement)
- Date earned
- All evidence (from goal and steps) listed and viewable
- Export options: "Save Image," "Export Credential (JSON)"

---

## Flow 8: Settings

```
Settings
│
├── Appearance
│   ├── Theme (7 swatches, tap to switch instantly)
│   ├── Content Density (compact / normal / spacious)
│   └── Animation (none / minimal / full)
│
├── Accessibility
│   ├── Font (system / Lexend / Atkinson Hyperlegible)
│   ├── Text Size (slider, respects OS Dynamic Type)
│   └── Spacing (letter / line / word spacing adjustments)
│
├── Data
│   ├── Export All Badges (OB3 JSON)
│   ├── Export All Goals (JSON backup)
│   └── Storage Used
│
└── About
    ├── Version
    └── Open Source Licenses
```

- Theme switching is instant preview — no "apply" button
- No account section in Iteration A

---

## Screen Inventory

| Screen                | Type                            | Route              |
| --------------------- | ------------------------------- | ------------------ |
| WelcomeScreen         | Full screen (first launch only) | —                  |
| GoalsScreen           | Tab root                        | `Goals`            |
| NewGoalModal          | Modal                           | `NewGoal`          |
| FocusModeScreen       | Stack screen                    | `FocusMode`        |
| EditModeScreen        | Stack screen                    | `EditMode`         |
| TimelineJourneyScreen | Stack screen                    | `TimelineJourney`  |
| CompletionFlowScreen  | Stack screen                    | `CompletionFlow`   |
| CapturePhoto          | Stack screen                    | `CapturePhoto`     |
| CaptureVideo          | Stack screen                    | `CaptureVideo`     |
| CaptureVoiceMemo      | Stack screen                    | `CaptureVoiceMemo` |
| CaptureTextNote       | Stack screen                    | `CaptureTextNote`  |
| CaptureLink           | Stack screen                    | `CaptureLink`      |
| CaptureFile           | Stack screen                    | `CaptureFile`      |
| BadgesScreen          | Tab root                        | `Badges`           |
| BadgeDetailScreen     | Stack screen                    | `BadgeDetail`      |
| SettingsScreen        | Tab root                        | `Settings`         |

Plus modals/overlays (not stack routes): PhotoViewerModal, VideoPlayerModal, AudioPlayerModal, TextNoteViewerModal, ConfirmDeleteModal.

Note: `VoiceMemoScreen` is a standalone screen directory but voice memo capture is routed via `CaptureVoiceMemo` in the GoalsStack.

---

## Interaction Summary

| Action             | Gesture/Control                         | Where                        |
| ------------------ | --------------------------------------- | ---------------------------- |
| Open a goal        | Tap goal card                           | Goals list                   |
| Create a goal      | Tap "New Goal" button                   | Goals list                   |
| Move between steps | Swipe left/right                        | Focus Mode                   |
| Jump to step       | Tap dot in ProgressDots or MiniTimeline | Focus Mode                   |
| Complete a step    | Tap checkbox on StepCard                | Focus Mode                   |
| Add evidence       | Tap FAB → pick type                     | Focus Mode                   |
| View full timeline | Tap MiniTimeline                        | Focus Mode                   |
| Edit goal/steps    | Tap ✏️ header icon                      | Focus Mode                   |
| Complete goal      | Automatic when all steps done           | Focus Mode → Completion Flow |
| View badge         | Tap badge                               | Badges tab                   |
| Export badge       | Tap export option                       | Badge Detail                 |
| Switch theme       | Tap swatch                              | Settings or Welcome          |

---

## Related Documents

- [ADR-0001: Iteration Strategy](../decisions/ADR-0001-iteration-strategy.md) — scope for iteration A
- [User Stories](../vision/user-stories.md) — Lina, Malik, Tomás
- [Design Principles](../vision/design-principles.md) — ND rules and visual identity
- [Data Model](../architecture/data-model.md) — Goal, Step, Evidence, Badge entities
- [Navigation types](../../src/navigation/types.ts) — authoritative route/param definitions

---

_Updated 2026-02-18. Three modes, one goal, one loop._
