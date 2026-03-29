import { useCallback, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";

/**
 * Shared hook for copy-to-clipboard with brief "Copied!" feedback.
 * Web: uses navigator.clipboard. Native: logs to console (expo-clipboard later).
 */
export function useCopyToken() {
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const copyToken = useCallback((path: string) => {
    if (
      Platform.OS === "web" &&
      typeof navigator !== "undefined" &&
      navigator.clipboard
    ) {
      navigator.clipboard.writeText(path).catch(() => {
        console.warn(`[Story] Clipboard write failed for ${path}`);
      });
    } else {
      console.log(`[Story] Copied: ${path}`);
    }
    setCopiedToken(path);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setCopiedToken(null), 1500);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return { copiedToken, copyToken };
}
