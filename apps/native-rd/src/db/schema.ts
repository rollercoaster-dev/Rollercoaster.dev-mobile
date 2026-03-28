/**
 * Evolu database schema for all core entities
 *
 * Maps to docs/architecture/data-model.md Iteration A
 * Follows ADR-0003 (Evolu sync layer) and ADR-0004 (ULID strategy)
 *
 * System columns (createdAt, updatedAt, isDeleted, ownerId) are auto-added by Evolu.
 * All IDs are ULIDs generated via id('TableName') branded types.
 * Soft-delete pattern used for CRDT sync compatibility.
 */
import { id, NonEmptyString1000, NonEmptyString, nullOr, DateIso, Int } from '@evolu/common';

/** Goal ULID identifier */
export const GoalId = id('Goal');
export type GoalId = typeof GoalId.Type;

/** Goal status enum */
export const GoalStatus = {
  active: 'active',
  completed: 'completed',
} as const;

/** Step ULID identifier */
export const StepId = id('Step');
export type StepId = typeof StepId.Type;

/** Step status enum */
export const StepStatus = {
  pending: 'pending',
  completed: 'completed',
} as const;

/** Evidence ULID identifier */
export const EvidenceId = id('Evidence');
export type EvidenceId = typeof EvidenceId.Type;

/**
 * Evidence type enum
 * Supports multiple media types for documenting progress
 */
export const EvidenceType = {
  photo: 'photo',
  screenshot: 'screenshot',
  text: 'text',
  voice_memo: 'voice_memo',
  video: 'video',
  link: 'link',
  file: 'file',
} as const;

/** URI prefix for inline text evidence (text content stored in the URI field) */
export const TEXT_EVIDENCE_PREFIX = 'content:text;';

/** Badge ULID identifier */
export const BadgeId = id('Badge');
export type BadgeId = typeof BadgeId.Type;

/** UserSettings ULID identifier */
export const UserSettingsId = id('UserSettings');
export type UserSettingsId = typeof UserSettingsId.Type;

/**
 * Evolu database schema
 *
 * All tables use ULID IDs and soft-delete pattern (isDeleted).
 * System columns (createdAt, updatedAt, isDeleted, ownerId) are auto-added.
 */
export const Schema = {
  /**
   * Goal table
   *
   * Represents a user's goal with optional steps, evidence, and badge.
   * Goals can be active or completed, with completion timestamp.
   */
  goal: {
    id: GoalId,
    title: NonEmptyString1000,
    description: nullOr(NonEmptyString1000),
    status: NonEmptyString1000, // 'active' | 'completed'
    completedAt: nullOr(DateIso),
    icon: nullOr(NonEmptyString1000), // Emoji or icon identifier
    color: nullOr(NonEmptyString1000), // Hex color code
    sortOrder: nullOr(Int), // Custom ordering
  },

  /**
   * Step table
   *
   * Represents a step within a goal. Steps are ordered by ordinal.
   * Steps can be pending or completed, with completion timestamp.
   */
  step: {
    id: StepId,
    goalId: GoalId, // Foreign key to goal
    title: NonEmptyString1000,
    ordinal: nullOr(Int), // Ordering within goal
    status: NonEmptyString1000, // 'pending' | 'completed'
    completedAt: nullOr(DateIso),
    plannedEvidenceTypes: nullOr(NonEmptyString1000), // JSON-encoded string[] of EvidenceType values, null = any type
  },

  /**
   * Evidence table
   *
   * Flexible attachment of evidence to Goal OR Step (exactly one).
   * Supports multiple media types: photo, screenshot, text, voice_memo, video, link, file.
   * Application must validate exactly one of goalId/stepId is set.
   */
  evidence: {
    id: EvidenceId,
    goalId: nullOr(GoalId), // Exactly one of goalId/stepId must be set
    stepId: nullOr(StepId), // Exactly one of goalId/stepId must be set
    type: NonEmptyString1000, // EvidenceType enum
    uri: NonEmptyString1000, // Local file path or URL
    description: nullOr(NonEmptyString1000), // Caption
    metadata: nullOr(NonEmptyString1000), // JSON string for additional data
  },

  /**
   * Badge table
   *
   * Stores OB3 Verifiable Credential for completed goals.
   * One badge per goal. Badge creation triggered by goal completion.
   * Credential is full OB3 JSON, imageUri is local path to baked badge image.
   */
  badge: {
    id: BadgeId,
    goalId: GoalId, // One badge per goal
    credential: NonEmptyString, // Full OB3 Verifiable Credential JSON (typically 1500-10000+ chars)
    imageUri: NonEmptyString1000, // Local file path to baked badge image
    design: nullOr(NonEmptyString), // BadgeDesign JSON — visual configuration for the badge designer
  },

  /**
   * UserSettings table
   *
   * Singleton table (one row per user/device) for app preferences.
   * All fields are optional and can be updated independently.
   */
  userSettings: {
    id: UserSettingsId,
    theme: nullOr(NonEmptyString1000), // Theme name
    density: nullOr(NonEmptyString1000), // 'compact' | 'default' | 'comfortable'
    animationPref: nullOr(NonEmptyString1000), // 'full' | 'reduced' | 'none'
    fontScale: nullOr(Int), // Integer percentage: 100 = default, 80-150 range
    keyId: nullOr(NonEmptyString1000), // UUID referencing Ed25519 keypair in SecureStore
    hasSeenWelcome: nullOr(Int), // 1 = seen, null = first launch
  },
};
