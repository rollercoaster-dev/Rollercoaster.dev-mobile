import React, { createContext, useCallback, useContext, useState } from "react";
import { Toast, type ToastAction } from "./Toast";

export interface ToastOptions {
  message: string;
  action?: ToastAction;
  duration?: number;
}

interface ToastContextValue {
  showToast: (options: ToastOptions) => void;
  hideToast: () => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toastState, setToastState] = useState<
    (ToastOptions & { visible: boolean }) | null
  >(null);

  const showToast = useCallback((options: ToastOptions) => {
    setToastState({ ...options, visible: true });
  }, []);

  const hideToast = useCallback(() => {
    // Only flip `visible: false`; keep `toastState` so the Toast stays in the
    // tree and can play its slide-out exit animation. `toastState` is released
    // in `handleExitComplete` once that animation finishes. No-op (same ref) if
    // already hidden or absent, so redundant calls don't re-render the provider.
    setToastState((prev) =>
      prev?.visible ? { ...prev, visible: false } : prev,
    );
  }, []);

  const handleExitComplete = useCallback(() => {
    // Slide-out finished: drop the toast so its message/action closure isn't
    // retained for the rest of the app's lifetime. Guarded on `!visible` so a
    // re-show mid-exit (which flips `visible` back to true) isn't torn down.
    setToastState((prev) => (prev && !prev.visible ? null : prev));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      {toastState && (
        <Toast
          visible={toastState.visible}
          message={toastState.message}
          action={toastState.action}
          duration={toastState.duration}
          onDismiss={hideToast}
          onExitComplete={handleExitComplete}
        />
      )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return ctx;
}
