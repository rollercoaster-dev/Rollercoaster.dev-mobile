import { AccessibilityInfo, findNodeHandle } from "react-native";
import type { RefObject } from "react";

/**
 * A ref target this helper can move accessibility focus to: anything
 * `findNodeHandle` accepts — any native component instance (`View`, `Text`,
 * `Pressable`, …) or an already-resolved native tag (`number`). Kept in lockstep
 * with `findNodeHandle`'s argument type so callers never have to narrow a
 * specific native component ref (e.g. AnimatedSheet's `Text` title) to `View`.
 */
type FocusTarget = Parameters<typeof findNodeHandle>[0];

/**
 * Move VoiceOver/TalkBack focus onto the component (or already-resolved native
 * tag) held by `ref`, after a short delay so the native view has registered
 * with the accessibility tree first (a straight synchronous call is dropped
 * when the view isn't in the tree yet).
 *
 * Accepts a ref to any native component instance (`View`, `Text`, …, resolved
 * via `findNodeHandle`) or a `RefObject<number>` whose `current` is already a
 * native tag — the latter lets callers pass an element tag captured from a
 * `Pressable` press event (`event.nativeEvent.target`) without threading a
 * component ref through prop layers (see EditGoalView / NewGoalWizard
 * evidence-chip restoration).
 *
 * No-ops when the ref is absent, its `current` is null/undefined, or the tag
 * can't be resolved. Returns `undefined` only when `ref` itself is absent;
 * otherwise it always returns a cancel function (the current/tag no-op is
 * decided later, inside the deferred callback). Callers use the cancel function
 * to drop a still-pending focus request if the component unmounts or the sheet
 * reopens before the delay elapses — otherwise an interrupted open→close→open
 * cycle could fire a stale restore after the sheet is back up.
 */
export function focusAccessibilityRef(
  ref: RefObject<FocusTarget> | null | undefined,
  delayMs = 50,
): (() => void) | undefined {
  if (ref == null) return undefined;

  // Resolve the tag inside the delayed callback, not now: a sheet opened this
  // render mounts its title on the *next* commit, so `ref.current` is still
  // null at schedule time and only settles once the delay has let the view
  // (and its native a11y registration) catch up.
  const handle = setTimeout(() => {
    const current = ref.current;
    if (current == null) return;
    // An already-numeric current is a native tag (a captured press target) —
    // skip findNodeHandle, which only resolves component instances.
    const tag = typeof current === "number" ? current : findNodeHandle(current);
    if (tag == null) return;
    AccessibilityInfo.setAccessibilityFocus(tag);
  }, delayMs);
  return () => clearTimeout(handle);
}
