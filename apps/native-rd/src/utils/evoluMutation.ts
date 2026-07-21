import type { Result } from "@evolu/common";

/**
 * Runs an Evolu mutation and normalizes its two failure modes into one path.
 *
 * Evolu's write API reports failures in two different ways: a thrown exception
 * (validation guards in `db/queries.ts` re-throw) *and* a returned
 * `{ ok: false }` Result (the Evolu engine's own write failures). A caller that
 * only wraps the call in `try/catch`, or only checks `.ok`, silently swallows
 * the other mode — which is exactly how a rejected write ends up firing a
 * success-only side effect (clearing a draft, closing a delete modal,
 * navigating away).
 *
 * This helper collapses both into a single `onFailure(error)` callback and
 * returns a `boolean` so callers gate their success-only side effects on the
 * return value:
 *
 * ```ts
 * const ok = runEvoluMutation(
 *   () => deleteGoal(goalId),
 *   (error) => {
 *     reportError(error, { area: "goal.mutate", kind: "delete" });
 *     Alert.alert(t("errors.title"), t("errors.deleteGoalMessage"));
 *   },
 * );
 * if (ok) navigation.navigate("Goals");
 * ```
 *
 * Preferred over Evolu's own `getOrThrow`, whose thrown message
 * (`"getOrThrow"`) is non-descriptive and whose JSDoc explicitly discourages it
 * for application error handling. Generalizes the `if (!result.ok)` pattern
 * already used in `EditModeScreen`.
 */
export function runEvoluMutation<T, E>(
  mutate: () => Result<T, E>,
  onFailure: (error: E | unknown) => void,
): boolean {
  try {
    const result = mutate();
    if (!result.ok) {
      onFailure(result.error);
      return false;
    }
    return true;
  } catch (error) {
    onFailure(error);
    return false;
  }
}
