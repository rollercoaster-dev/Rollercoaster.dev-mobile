# ADR-0001: Iteration Strategy

**Date:** 2026-02-02
**Status:** Accepted
**Owner:** Joe

---

## Context

The native rollercoaster.dev app has an ambitious vision: personal goal tracking, learning journey management, skill tree visualization, and peer verification — all local-first, neurodivergent-first, built on Open Badges 3.0.

Building everything at once would be overwhelming and would delay shipping something useful. The vision documents (learning graph, planning graph, user stories) describe features spanning months or years of work.

We need a strategy that delivers value early and often, where each iteration is a complete product — not a half-finished step toward the real thing.

## Decision

Build the native app in four iterations. Each iteration ships as a usable, complete product. No iteration is a throwaway prototype. Each adds a layer on top of the last.

---

## Iteration A — Quiet Victory

**Theme:** The core loop. Create, track, earn.
**Status:** ~90% complete (2026-02-28)

**Scope:**

- Create a goal with a title and optional description
- Break a goal into ordered steps
- Attach evidence to goals and steps (photo, text, voice memo, video, link, file)
- Mark steps complete
- Mark goal complete and earn a self-signed Open Badge (using `openbadges-core`)
- View your badges and their evidence
- All data stored locally on device
- All functionality works offline
- All 7 ND themes available from day one
- Export badges (OB3 JSON)

**Current state (2026-02-28):**

| Feature                                | Status    | Notes                                                                                                                                       |
| -------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Create goal (title)                    | Done      | `NewGoalModal` → immediate navigation to `BadgeDesignerScreen`                                                                              |
| Create goal (description)              | Partial   | Description only editable after creation in `EditModeScreen`, not collected at creation time                                                |
| Break into ordered steps               | Done      | `StepList` with drag-and-drop reordering                                                                                                    |
| Evidence: photo                        | Done      | `CapturePhoto` via `expo-image-picker`                                                                                                      |
| Evidence: text                         | Done      | `CaptureTextNote`                                                                                                                           |
| Evidence: voice memo                   | Done      | `VoiceMemoScreen` with pause/resume/playback                                                                                                |
| Evidence: video                        | Done      | `CaptureVideoScreen` with 60s max, front/back                                                                                               |
| Evidence: link                         | Done      | `CaptureLinkScreen` with URL validation                                                                                                     |
| Evidence: file                         | Done      | `CaptureFile` with mime/size validation                                                                                                     |
| Mark steps complete                    | Done      | `FocusModeScreen` toggle                                                                                                                    |
| Mark goal complete + earn badge        | Done      | `CompletionFlowScreen` → `useCreateBadge` (Ed25519 signing, PNG baking)                                                                     |
| OB3 signing                            | Partial   | Uses `eddsa-raw-json-iteration-a` cryptosuite, not spec-compliant `eddsa-rdfc-2022` (intentional — full compliance deferred to Iteration D) |
| Badge designer                         | Done      | Shape, color, icon, weight; new-goal and redesign modes                                                                                     |
| View badges list                       | Done      | `BadgesScreen`                                                                                                                              |
| View badge + evidence                  | Partial   | `BadgeDetailScreen` shows badge image + credential metadata but does NOT surface the goal's evidence                                        |
| Local-first data                       | Done      | Evolu (SQLite + CRDT) + `expo-file-system`                                                                                                  |
| Offline                                | Done      | No network dependency in any path                                                                                                           |
| 14 themes (7 variants × 2 color modes) | Done      | `ThemeSwitcher` in Settings with live preview                                                                                               |
| Export badge JSON                      | Done      | `expo-sharing` share sheet                                                                                                                  |
| Export badge image                     | Done      | `expo-sharing` share sheet                                                                                                                  |
| Task view (next best step)             | Not built | The cross-goal "one next step per active goal" screen described in the product vision is not implemented                                    |
| Welcome screen (#65)                   | Not built | First-launch experience                                                                                                                     |
| Batch export (#67)                     | Not built | Export all badges + goals at once                                                                                                           |
| Character moments (#68)                | Not built | Personality-driven empty states and milestones                                                                                              |

**Badge Designer extended scope (A.5 + A.6):**

A.5 (Phase 1) is complete — basic badge designer with shape, color, icon, and weight controls. A.6 (Phase 2) adds frame generators (guilloche, crosshatch, rosette, microprint), text components (path text, banner, monogram), and shape contour system. 14 issues filed (#178–#191), not yet started.

**Not in scope:**

- Multiple concurrent goals
- Reorganizing steps between goals
- Learning stack / interrupts
- Goal journal
- Skill tree visualization
- Sharing or verification by others
- Sync or cloud features
- AI of any kind

**Definition of done:** A user can create a goal, break it into steps, attach evidence, complete it, and earn a self-signed badge — entirely offline, on their phone.

**User story:** [Lina's Quiet Victory](../vision/user-stories.md#linas-quiet-victory), [Malik's First Scene](../vision/user-stories.md#maliks-first-scene), [Tomás Breaks It Down](../vision/user-stories.md#tomás-breaks-it-down)

---

## Iteration B — Learning Journey

**Theme:** Manage the messy reality of non-linear learning and life interruptions.
**Status:** Not started (2026-02-28). No issues filed, no milestone created.

**Scope (adds to A):**

- Multiple concurrent goals
- Pause and resume goals
- Reorganize steps between goals (move, copy)
- Scope adjustment (shrink a goal, split into smaller goals)
- Goal journal — dated, informal entries for capturing thinking along the way (not evidence, just notes: "I'm stuck," "changed approach because," "realized I should split this")
- Learning stack — track what interrupted what, see the path back to paused goals
- Factual nudges — "You have 3 goals active. Your last badge was linked to Goal X."
- Badge-to-goal linking — when you earn a badge, link it to an active goal
- Multi-device sync (via chosen sync layer — PowerSync or Evolu)

**What already exists toward B (2026-02-28):**

| Feature                   | Data model                                                              | UI                                                                           | Notes                                                        |
| ------------------------- | ----------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------ |
| Multiple concurrent goals | Partial — `goal.sortOrder` field exists but is never written or queried | Partial — goals list renders all goals, but no concurrent goal management UI | `goalsQuery` orders by `createdAt desc`, ignores `sortOrder` |
| Pause/resume              | No — `GoalStatus` only has `active` and `completed`                     | No                                                                           | Would need a `paused` status value                           |
| Reopen completed goal     | Yes — `uncompleteGoal()` in queries.ts                                  | Yes — "Reopen Goal" button in `CompletionFlowScreen`                         | Reverts to `active`, not a distinct `paused` state           |
| Step move between goals   | No                                                                      | No                                                                           | Drag-and-drop reorder within a goal exists                   |
| Goal journal              | No — no journal table                                                   | No                                                                           | —                                                            |
| Learning stack            | No                                                                      | No                                                                           | —                                                            |
| Factual nudges            | No                                                                      | No                                                                           | —                                                            |
| Badge-to-goal linking     | Partial — badges reference goals via `goalId` FK                        | No                                                                           | No UI to link a badge to a different goal                    |
| Multi-device sync         | Partial — Evolu chosen (ADR-0003), `ownerId` auto-added                 | No                                                                           | Sync not enabled or configured                               |

**Not in scope:**

- Skill tree visualization
- Peer verification or sharing
- Mentor roles
- AI features
- Community or cloud features (beyond sync)

**Definition of done:** A user can manage multiple learning goals, pause and resume through life interruptions, journal their thinking, reorganize their work, and sync across devices.

**User story:** [Eva's Big Map](../vision/user-stories.md#evas-big-map)

---

## Iteration C — Skill Tree

**Theme:** Make invisible progress visible. Your badges become a map.
**Status:** Not started (2026-02-28). No code, data model, or issues exist.

**Scope (adds to B):**

- Skill tree view — badges and goals rendered as nodes on a spatial canvas
- Manual node placement — drag, arrange, position
- User-drawn connections between badges and goals (prerequisites, progressions)
- Visual states — earned (solid), in-progress (glow), planned (ghost)
- Create future goals directly from the tree view (tap empty space, add a ghost node)
- Zoom, pan, filter by topic or tag

**Not in scope:**

- AI-suggested connections or recommendation engine
- Auto-layout or smart arrangement
- Peer verification or sharing
- Community features

**Definition of done:** A user can see their badges as a spatial skill tree they built by hand, with clear visual states and connections they drew themselves.

**User story:** [Kai's Scattered Badges](../vision/user-stories.md#kais-scattered-badges)

---

## Iteration D — Community

**Theme:** The personal tool connects to other people.
**Status:** Not started (2026-02-28). No code, data model, or issues exist. OB3 signing upgrade (`eddsa-rdfc-2022`) deferred to this iteration.

**Scope (adds to C):**

- Share a badge with another device (device-to-device, no server required)
- Peer verification — review someone's evidence, verify with a tap
- Verification chain — verifier's own badges add weight to their verification
- Mentor role — a verified badge holder can verify others in that domain
- Badge import — receive a badge issued by an institutional server (monorepo federation)
- Optional cloud community features (discovery, public profiles)
- Upgrade OB3 proof from `eddsa-raw-json-iteration-a` to spec-compliant `eddsa-rdfc-2022` cryptosuite

**Not in scope:**

- Social feeds or follower systems
- Badge marketplace or monetization
- AI verification

**Definition of done:** Two users can share and verify badges between their phones without needing a server or internet connection.

**User story:** [Carmen Passes It On](../vision/user-stories.md#carmen-passes-it-on)

---

## Consequences

**Positive:**

- Users get value from iteration A — no waiting for the full vision
- Each iteration is a natural stopping point if priorities change
- Features are validated by real use before the next layer is added
- Complexity is earned, not assumed
- The data model can evolve — A's simple model doesn't need to anticipate C's skill tree

**Negative / Risks:**

- Data model changes between iterations may require migrations
- Users of A may want B features — need to manage expectations
- Some architectural decisions in A (sync layer choice, database schema) affect all future iterations
- The `openbadges-core` extraction is a prerequisite for A and affects the monorepo

**Mitigations:**

- Choose a sync-ready database from day one (decision in research phase) to avoid rearchitecting in B
- Design the data model for A with B's needs in mind (goals that can be paused, steps that can be moved) even if the UI doesn't expose those features yet
- Document the `openbadges-core` extraction as a separate plan with its own scope

---

## Dependencies

| Iteration | Depends on                                                                                 |
| --------- | ------------------------------------------------------------------------------------------ |
| A         | `openbadges-core` extraction from monorepo                                                 |
| A         | UI library decision — [ADR-0002](./ADR-0002-ui-styling-library.md): react-native-unistyles |
| A         | Sync layer decision (PowerSync or Evolu) — chosen in A, sync ships in B                    |
| B         | Iteration A complete                                                                       |
| C         | Iteration B complete                                                                       |
| D         | Iteration C complete, device-to-device communication research                              |

---

## Related Documents

- [Product Vision](../vision/product-vision.md)
- [User Stories](../vision/user-stories.md)
- [Design Principles](../vision/design-principles.md)
- [ADR-0002: UI Styling Library](./ADR-0002-ui-styling-library.md)
- [Vercel React Native Insights](../../research/vercel-react-native-insights.md)
- [Local-First Sync Comparison](../research/local-first-sync-comparison.md)
- [Learning Graph Vision (monorepo)](https://github.com/rollercoaster-dev/monorepo/blob/main/docs/vision/learning-graph.md)
- [Planning Graph Phase 2 (monorepo)](https://github.com/rollercoaster-dev/monorepo/blob/main/docs/plans/2026-01-29-planning-graph-phase2-design.md)

---

_Accepted 2026-02-02. Baby steps, always._
