import type { TFunction } from "i18next";

export function formatEvidenceLabel(
  t: TFunction<"common">,
  count: number,
): string {
  if (count === 0) return t("evidenceCount.addEvidence");
  return t("evidenceCount.items", { count });
}
