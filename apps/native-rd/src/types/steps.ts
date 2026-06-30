/**
 * UI-level step status for visual components.
 *
 * Superset of the DB StepStatus ('pending' | 'paused' | 'completed'): 'paused'
 * is now persisted (#417), while 'in-progress' remains a UI-only value derived
 * at the UI layer from the current selection.
 */
export type StepStatus = "completed" | "in-progress" | "paused" | "pending";
