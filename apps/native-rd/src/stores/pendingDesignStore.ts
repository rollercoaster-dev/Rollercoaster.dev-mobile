/**
 * In-memory store for badge designs chosen during goal creation.
 *
 * When a user picks a design in BadgeDesignerScreen (new-goal mode),
 * the serialized design JSON and a pre-captured 512x512 PNG (base64) are
 * stored here keyed by goalId. CompletionFlowScreen reads both later:
 *   - `designJson` is persisted on the badge record for future re-rendering.
 *   - `pngBase64` is decoded to a Buffer and passed to useCreateBadge so the
 *     baked badge image reflects the user's actual design (not a solid-color
 *     fallback).
 *
 * Cleared per-goal after consumption. Resets on app restart (intentional —
 * goal creation and completion happen in the same session).
 */

export interface PendingDesignEntry {
  designJson: string;
  /** Base64-encoded PNG from captureBadge(). Decoded to Buffer at consume-time. */
  pngBase64: string;
}

const store = new Map<string, PendingDesignEntry>();

export const pendingDesignStore = {
  set(goalId: string, entry: PendingDesignEntry) {
    store.set(goalId, entry);
  },
  get(goalId: string): PendingDesignEntry | undefined {
    return store.get(goalId);
  },
  consume(goalId: string): PendingDesignEntry | undefined {
    const value = store.get(goalId);
    store.delete(goalId);
    return value;
  },
  clear() {
    store.clear();
  },
};
