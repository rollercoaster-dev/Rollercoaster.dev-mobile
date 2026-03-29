# Development Plan: Issue #26

## Issue Summary

**Title**: Set up database schema and ORM
**Type**: Feature
**Complexity**: MEDIUM
**Estimated Lines**: ~400 lines

Set up the complete SQLite database schema with Evolu ORM for all core entities (Goal, Step, Evidence, Badge, UserSettings) required for Iteration A. Evolu is already installed and configured. The Goal table exists but needs enhancement. Step, Evidence, Badge, and UserSettings tables need to be created with full CRUD operations.

## Dependencies

| Issue | Title                   | Status | Type    |
| ----- | ----------------------- | ------ | ------- |
| #12   | Initialize Expo project | Closed | Blocker |

**Status**: All dependencies met

## Objective

Complete the database layer for Iteration A by:

- Extending the existing Goal schema with missing fields
- Creating Step, Evidence, Badge, and UserSettings schemas
- Implementing TypeScript types for all entities
- Building CRUD operations for all tables
- Ensuring ULID generation for all IDs (provided by Evolu)
- Setting up a sync-ready schema aligned with ADR-0003 and ADR-0004

## Affected Areas

- `/Users/hailmary/Code/rollercoaster.dev/native-rd/src/db/schema.ts`: Extend Goal schema, add Step, Evidence, Badge, UserSettings
- `/Users/hailmary/Code/rollercoaster.dev/native-rd/src/db/queries.ts`: Add CRUD operations for new tables
- `/Users/hailmary/Code/rollercoaster.dev/native-rd/src/db/index.ts`: Export new types and operations

## Implementation Plan

### Step 1: Extend Goal schema

**Files**: `/Users/hailmary/Code/rollercoaster.dev/native-rd/src/db/schema.ts`
**Commit**: `feat(db): extend Goal schema with icon, color, and sort_order`
**Changes**:

- Add `icon` field (nullable string for emoji/icon identifier)
- Add `color` field (nullable string for hex color code)
- Add `sortOrder` field (nullable number for custom ordering)
- Keep existing fields: id, title, description, status, completedAt
- System columns (createdAt, updatedAt, isDeleted) are auto-managed by Evolu

### Step 2: Create Step schema and CRUD operations

**Files**: `/Users/hailmary/Code/rollercoaster.dev/native-rd/src/db/schema.ts`, `/Users/hailmary/Code/rollercoaster.dev/native-rd/src/db/queries.ts`
**Commit**: `feat(db): add Step schema with CRUD operations`
**Changes**:

- Define `StepId` branded type using `id('Step')`
- Define `StepStatus` enum: `pending`, `completed`
- Add `step` table to Schema:
  - `id`: StepId (ULID, auto-generated)
  - `goalId`: GoalId (foreign key reference)
  - `title`: NonEmptyString1000
  - `ordinal`: nullable number (for ordering steps)
  - `status`: NonEmptyString1000 (StepStatus)
  - `completedAt`: nullable DateIso
- Create queries:
  - `stepsByGoalQuery(goalId)`: All non-deleted steps for a goal, ordered by ordinal
  - `createStep(goalId, title, ordinal?)`: Insert new step
  - `updateStep(id, fields)`: Update title and/or ordinal
  - `completeStep(id)`: Mark step as completed with timestamp
  - `uncompleteStep(id)`: Mark step as pending
  - `deleteStep(id)`: Soft-delete step
  - `reorderSteps(goalId, stepIds)`: Batch update ordinals

### Step 3: Create Evidence schema and CRUD operations

**Files**: `/Users/hailmary/Code/rollercoaster.dev/native-rd/src/db/schema.ts`, `/Users/hailmary/Code/rollercoaster.dev/native-rd/src/db/queries.ts`
**Commit**: `feat(db): add Evidence schema with CRUD operations`
**Changes**:

- Define `EvidenceId` branded type using `id('Evidence')`
- Define `EvidenceType` enum: `photo`, `screenshot`, `text`, `voice_memo`, `video`, `link`, `file`
- Add `evidence` table to Schema:
  - `id`: EvidenceId (ULID, auto-generated)
  - `goalId`: nullable GoalId (exactly one of goalId/stepId must be set)
  - `stepId`: nullable StepId (exactly one of goalId/stepId must be set)
  - `type`: NonEmptyString1000 (EvidenceType)
  - `uri`: NonEmptyString1000 (local file path or URL)
  - `description`: nullable NonEmptyString1000 (caption)
  - `metadata`: nullable NonEmptyString1000 (JSON string for additional metadata)
- Create queries:
  - `evidenceByGoalQuery(goalId)`: All evidence attached to a goal
  - `evidenceByStepQuery(stepId)`: All evidence attached to a step
  - `createEvidence({ goalId?, stepId?, type, uri, description?, metadata? })`: Insert evidence (validate exactly one of goalId/stepId)
  - `updateEvidence(id, fields)`: Update description and/or metadata
  - `deleteEvidence(id)`: Soft-delete evidence
- Add helper function to validate exactly one of goalId/stepId is set

### Step 4: Create Badge schema and CRUD operations

**Files**: `/Users/hailmary/Code/rollercoaster.dev/native-rd/src/db/schema.ts`, `/Users/hailmary/Code/rollercoaster.dev/native-rd/src/db/queries.ts`
**Commit**: `feat(db): add Badge schema with CRUD operations`
**Changes**:

- Define `BadgeId` branded type using `id('Badge')`
- Add `badge` table to Schema:
  - `id`: BadgeId (ULID, auto-generated)
  - `goalId`: GoalId (foreign key reference, one badge per goal)
  - `credential`: NonEmptyString1000 (JSON string of OB3 Verifiable Credential)
  - `imageUri`: NonEmptyString1000 (local file path to baked badge image)
- Create queries:
  - `badgesQuery`: All non-deleted badges, ordered by createdAt desc
  - `badgeByGoalQuery(goalId)`: Get badge for a specific goal
  - `createBadge({ goalId, credential, imageUri })`: Insert badge
  - `updateBadge(id, fields)`: Update credential and/or imageUri (for re-baking)
  - `deleteBadge(id)`: Soft-delete badge
- Note: Badge creation is triggered by goal completion (Issue #59), this step only creates the schema

### Step 5: Create UserSettings schema and CRUD operations

**Files**: `/Users/hailmary/Code/rollercoaster.dev/native-rd/src/db/schema.ts`, `/Users/hailmary/Code/rollercoaster.dev/native-rd/src/db/queries.ts`
**Commit**: `feat(db): add UserSettings schema with CRUD operations`
**Changes**:

- Define `UserSettingsId` branded type using `id('UserSettings')`
- Add `userSettings` table to Schema:
  - `id`: UserSettingsId (ULID, single row expected)
  - `theme`: nullable NonEmptyString1000 (theme name)
  - `density`: nullable NonEmptyString1000 (`compact`, `comfortable`, `spacious`)
  - `animationPref`: nullable NonEmptyString1000 (`full`, `reduced`, `none`)
  - `fontScale`: nullable number (1.0 = default, 0.8-1.5 range)
- Create queries:
  - `userSettingsQuery`: Get the single settings row
  - `getOrCreateUserSettings()`: Ensure settings row exists, return it
  - `updateUserSettings(fields)`: Update settings (upsert if not exists)
- Note: UserSettings is a singleton table (one row per user/device)

### Step 6: Update exports and add type guards

**Files**: `/Users/hailmary/Code/rollercoaster.dev/native-rd/src/db/index.ts`, `/Users/hailmary/Code/rollercoaster.dev/native-rd/src/db/schema.ts`
**Commit**: `feat(db): export all types and queries for new tables`
**Changes**:

- Export all new ID types: `StepId`, `EvidenceId`, `BadgeId`, `UserSettingsId`
- Export all new status/enum types: `StepStatus`, `EvidenceType`
- Export all new queries and CRUD operations
- Add type guards if needed (e.g., `isGoalCompleted`, `isStepCompleted`)
- Add schema validation helpers (e.g., `validateEvidenceAttachment`)

### Step 7: Update documentation

**Files**: `/Users/hailmary/Code/rollercoaster.dev/native-rd/src/db/schema.ts`, `/Users/hailmary/Code/rollercoaster.dev/native-rd/src/db/queries.ts`
**Commit**: `docs(db): add JSDoc comments for all schemas and queries`
**Changes**:

- Add comprehensive JSDoc comments to all schema tables
- Document field meanings, constraints, and relationships
- Add usage examples for complex queries
- Reference data-model.md for context
- Note sync-ready design (ULIDs, soft-deletes, timestamps)

## Testing Strategy

- [ ] Unit test: Create, read, update, delete operations for each table
- [ ] Unit test: Evidence validation (exactly one of goalId/stepId)
- [ ] Unit test: UserSettings singleton behavior
- [ ] Integration test: Create goal → create steps → attach evidence → verify relationships
- [ ] Integration test: Complete goal → verify completedAt timestamp
- [ ] Integration test: Soft-delete cascading (delete goal, verify steps/evidence still queryable but marked deleted)
- [ ] Manual testing: Run queries in GoalsScreen, verify data persists after app restart
- [ ] Manual testing: Verify Evolu CRDT sync ready (check ULIDs, timestamps, isDeleted)

## Definition of Done

- [ ] All 5 tables defined in schema (Goal extended, Step, Evidence, Badge, UserSettings)
- [ ] Full CRUD operations implemented for all tables
- [ ] All types exported from /Users/hailmary/Code/rollercoaster.dev/native-rd/src/db/index.ts
- [ ] Evidence attachment validation implemented
- [ ] UserSettings singleton pattern implemented
- [ ] JSDoc documentation complete
- [ ] Type-check passing (`npm run typecheck`)
- [ ] No lint errors (`npm run lint`)
- [ ] Existing GoalsScreen still works with extended schema
- [ ] Ready for Step CRUD UI (Issue #38) and Badge creation (Issue #59)

## Notes

**Evolu Schema Details:**

- System columns (`createdAt`, `updatedAt`, `isDeleted`, `ownerId`) are automatically added by Evolu
- ULIDs are generated using `id('TableName')` branded types
- Use `NonEmptyString1000`, `nullOr()`, `DateIso` for validation
- Use `.orThrow()`, `.orNull()`, `.from()` for parsing (not Zod's `.safeParse()`)
- Migrations: Evolu schemas are immutable after creation - adding fields later requires migration

**Data Model Alignment:**

- Schema matches `docs/architecture/data-model.md` Iteration A specification
- Sync-ready design per ADR-0003 (Evolu CRDT-based sync)
- ULID strategy per ADR-0004 (globally unique, sortable IDs)
- Evidence can attach to Goal OR Step (flexible evidence pattern)
- Badge stores full OB3 credential JSON (preparation for openbadges-core integration)

**Future Considerations:**

- Iteration B will add: JournalEntry, GoalLink, LearningStack tables
- Iteration B will extend Goal with: `paused` status, `pausedAt` timestamp, `tags` array
- Iteration B will make Step.goalId mutable (steps can move between goals)
- Evidence file storage/sync strategy deferred to Iteration B
- Badge credential creation requires openbadges-core extraction (Issue #58, #59)

**Implementation Order Rationale:**

1. Goal extension first (minimal change, validates pattern)
2. Step next (most frequently used, needed for Issue #38)
3. Evidence next (depends on Goal and Step being complete)
4. Badge next (depends on Goal, prepares for Issue #59)
5. UserSettings last (independent, lower priority)

**Blast Radius:**

- Low: Only affects database layer
- Existing Goal usage in GoalsScreen, GoalDetailScreen, NewGoalModal continues to work
- Step, Evidence, Badge, UserSettings are new - no existing code to break
- Schema changes are additive (extending Goal, adding new tables)
