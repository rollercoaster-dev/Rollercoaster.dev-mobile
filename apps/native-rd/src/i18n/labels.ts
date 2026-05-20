import type { TFunction } from "i18next";

import type { EvidenceTypeValue } from "../types/evidence";
import type { ThemeName } from "../themes/compose";

/**
 * Centralized lookups for the `common` namespace keys this app shares across
 * screens. Every call passes `{ ns: "common" }` so the helpers resolve against
 * the common namespace regardless of which namespace the caller's `t` is bound
 * to via `useTranslation(...)`.
 */

const COMMON_NS = { ns: "common" } as const;

export function evidenceLabel(t: TFunction, type: EvidenceTypeValue): string {
  return t(`evidenceTypes.${type}.label`, COMMON_NS);
}

export function evidenceShortLabel(
  t: TFunction,
  type: EvidenceTypeValue,
): string {
  return t(`evidenceTypes.${type}.shortLabel`, COMMON_NS);
}

/**
 * Composite screen-reader label for a theme option: "<name>. <description>".
 * Used by both ThemeSwitcher and ThemeChipGrid so the a11y contract stays
 * single-sourced.
 */
export function themeA11yLabel(t: TFunction, id: ThemeName): string {
  const label = t(`theme.options.${id}.label`, COMMON_NS);
  const description = t(`theme.options.${id}.description`, COMMON_NS);
  return `${label}. ${description}`;
}
