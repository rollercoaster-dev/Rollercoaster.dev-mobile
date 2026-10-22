import React, { useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { View, type GestureResponderEvent, type ViewProps } from "react-native";

/**
 * Screen-level sheet isolation contract (#686).
 *
 * `AnimatedSheet` is an in-tree overlay, and its `accessibilityViewIsModal` is
 * iOS-only and hides only the overlay's own siblings. Content outside the
 * screen's subtree — the screen's sub-header and the navigator's tab bar —
 * stays reachable on iOS, and nothing at all is hidden from TalkBack. So every
 * open sheet registers here, and background regions opt in to hiding while any
 * sheet is open. A module store rather than a context provider: the tab bar
 * lives outside every screen, and Storybook/Jest render sheets without one.
 */
let openSheetCount = 0;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function isAnySheetOpen() {
  return openSheetCount > 0;
}

/**
 * Count this sheet as open while `open` is true. Called by `AnimatedSheet`
 * itself, so consumers never register by hand.
 */
export function useOpenSheetRegistration(open: boolean) {
  useEffect(() => {
    if (!open) return;
    openSheetCount += 1;
    emit();
    return () => {
      openSheetCount -= 1;
      emit();
    };
  }, [open]);
}

/**
 * Accessibility props that remove a background region from VoiceOver
 * (`accessibilityElementsHidden`) and TalkBack (`no-hide-descendants`) while
 * any sheet is open. Accessibility-tree only — no layout or visual change.
 *
 * Never apply these to an ancestor of a sheet: they would hide the sheet too.
 */
export function useSheetBackgroundA11yProps(): Pick<
  ViewProps,
  "accessibilityElementsHidden" | "importantForAccessibility"
> {
  const hidden = useSyncExternalStore(
    subscribe,
    isAnySheetOpen,
    isAnySheetOpen,
  );
  return {
    accessibilityElementsHidden: hidden,
    importantForAccessibility: hidden ? "no-hide-descendants" : "auto",
  };
}

/**
 * A `View` whose subtree is hidden from assistive technology while any sheet is
 * open. Wrap everything a screen renders behind its sheet, with the sheet
 * itself mounted as a sibling outside the wrapper.
 */
export function SheetBackground(props: ViewProps) {
  const a11yProps = useSheetBackgroundA11yProps();
  return <View {...props} {...a11yProps} />;
}

/**
 * Remembers which control opened a sheet so `AnimatedSheet` can hand focus
 * back to it on every dismissal path. Call `rememberTrigger` from the opening
 * press handler and pass `restoreFocusRef` to the sheet.
 *
 * Stores the press target's native tag rather than a component ref, so the
 * trigger can sit layers deep (a card footer, a list row) without threading a
 * ref through each one.
 */
export function useSheetTrigger() {
  const restoreFocusRef = useRef<number | null>(null);
  // Stable identity, so callers can list the trigger in hook dependencies.
  return useMemo(
    () => ({
      restoreFocusRef,
      /** Record the pressed control; call with no event to clear it. */
      rememberTrigger: (event?: GestureResponderEvent) => {
        // RN types nativeEvent.target as string, but it's the numeric react
        // tag at runtime — the exact input setAccessibilityFocus expects.
        restoreFocusRef.current =
          (event?.nativeEvent?.target as unknown as number | undefined) ?? null;
      },
    }),
    [],
  );
}
