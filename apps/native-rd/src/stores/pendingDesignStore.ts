/**
 * In-memory store for badge designs chosen during goal creation.
 *
 * When a user picks a design in BadgeDesignerScreen (new-goal mode),
 * the serialized design JSON is stored here keyed by goalId.
 * CompletionFlowScreen reads it later when creating the badge.
 *
 * Cleared per-goal after consumption. Resets on app restart (intentional —
 * goal creation and completion happen in the same session).
 */

const store = new Map<string, string>();

export const pendingDesignStore = {
  set(goalId: string, designJson: string) {
    store.set(goalId, designJson);
  },
  get(goalId: string): string | undefined {
    return store.get(goalId);
  },
  consume(goalId: string): string | undefined {
    const value = store.get(goalId);
    store.delete(goalId);
    return value;
  },
  clear() {
    store.clear();
  },
};
