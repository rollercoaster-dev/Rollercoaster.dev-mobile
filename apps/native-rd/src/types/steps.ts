/**
 * UI-level step status for visual components.
 *
 * Distinct from the DB StepStatus (which only has 'pending' | 'completed').
 * The 'in-progress' value is derived at the UI layer from the current selection.
 */
export type StepStatus = "completed" | "in-progress" | "pending";
