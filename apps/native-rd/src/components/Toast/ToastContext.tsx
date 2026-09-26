import React, {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
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
type ToastEntry = ToastOptions & { id: number; visible: boolean };

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toastQueue, setToastQueue] = useState<ToastEntry[]>([]);
  const nextId = useRef(0);
  const active = toastQueue[0];

  const showToast = useCallback((options: ToastOptions) => {
    const id = ++nextId.current;
    setToastQueue((queue) => [...queue, { ...options, id, visible: true }]);
  }, []);

  const hideToast = useCallback(() => {
    setToastQueue((queue) => {
      if (!queue[0]?.visible) return queue;
      return [{ ...queue[0], visible: false }, ...queue.slice(1)];
    });
  }, []);

  const handleExitComplete = useCallback((id: number) => {
    // Only the exiting entry may advance the queue. A late animation callback
    // from a previous toast must not remove the one now on screen.
    setToastQueue((queue) =>
      queue[0]?.id === id && !queue[0].visible ? queue.slice(1) : queue,
    );
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      {active && (
        <Toast
          key={active.id}
          visible={active.visible}
          message={active.message}
          action={active.action}
          duration={active.duration}
          onDismiss={hideToast}
          onExitComplete={() => handleExitComplete(active.id)}
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
