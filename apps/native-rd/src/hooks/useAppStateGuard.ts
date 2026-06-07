import { useCallback, useEffect, useRef } from "react";
import { AppState, type AppStateStatus } from "react-native";
import { breadcrumb, reportError } from "../services/sentry-report";

/**
 * Defers callbacks that touch Unistyles' shadow tree until the app is in the
 * foreground. Workaround for `ShadowTreeManager::updateShadowTree` SIGSEGVs
 * (Sentry NATIVE-RD-4 / upstream react-native-unistyles#1179) where rapid
 * `setTheme()` / `updateTheme()` calls against a backgrounded shadow tree
 * crash the app on resume.
 *
 * `runWhenActive(fn)` fires `fn` immediately when `AppState` is `'active'`;
 * otherwise it queues `fn` and flushes the queue, in FIFO order, on the next
 * transition to `'active'`. The queue is discarded on unmount so callers
 * that have torn down do not see a late invocation.
 */
export function useAppStateGuard() {
  const isActiveRef = useRef<boolean>(AppState.currentState === "active");
  const queueRef = useRef<(() => void)[]>([]);
  const mountedRef = useRef<boolean>(true);

  useEffect(() => {
    mountedRef.current = true;

    const handleChange = (next: AppStateStatus) => {
      const nowActive = next === "active";
      const wasActive = isActiveRef.current;
      isActiveRef.current = nowActive;

      if (nowActive && !wasActive && mountedRef.current) {
        const pending = queueRef.current;
        queueRef.current = [];
        if (pending.length > 0) {
          breadcrumb({ category: "appstate", message: "flush" });
          if (__DEV__) {
            console.debug(
              `[AppStateGuard] flush ${pending.length} callback(s)`,
            );
          }
        }
        for (const fn of pending) {
          try {
            fn();
          } catch (err) {
            reportError(err, { area: "render" });
          }
        }
      }
    };

    const subscription = AppState.addEventListener("change", handleChange);

    return () => {
      mountedRef.current = false;
      if (queueRef.current.length > 0) {
        breadcrumb({ category: "appstate", message: "drop" });
        if (__DEV__) {
          console.debug(
            `[AppStateGuard] drop ${queueRef.current.length} pending callback(s) on unmount`,
          );
        }
      }
      queueRef.current = [];
      subscription.remove();
    };
  }, []);

  const runWhenActive = useCallback((fn: () => void) => {
    if (!mountedRef.current) return;
    if (isActiveRef.current) {
      fn();
      return;
    }
    queueRef.current.push(fn);
    breadcrumb({ category: "appstate", message: "defer" });
    if (__DEV__) {
      console.debug("[AppStateGuard] defer callback while backgrounded");
    }
  }, []);

  return { runWhenActive };
}
