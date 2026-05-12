import { useEffect } from "react";
import { breadcrumb } from "../services/sentry-report";
import type { EvidenceTypeValue } from "../types/evidence";

/**
 * Emit `evidence/start` on mount. Used by the five Capture*Screen mount
 * points to mark the beginning of a capture flow in the breadcrumb trail.
 */
export function useEvidenceStartBreadcrumb(kind: EvidenceTypeValue): void {
  useEffect(() => {
    breadcrumb({ category: "evidence", message: "start", kind });
  }, [kind]);
}
