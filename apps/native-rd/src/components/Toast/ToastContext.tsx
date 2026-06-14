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
    // tree and can play its slide-out exit animation, then stop rendering once
    // the animation finishes. The component instance isn't unmounted here — it
    // just paints nothing while `toastState` lingers.
    setToastState((prev) => (prev ? { ...prev, visible: false } : null));
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
