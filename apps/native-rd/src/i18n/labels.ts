import type { TFunction } from "i18next";

import type { EvidenceTypeValue } from "../types/evidence";
import type { ThemeName } from "../themes/compose";

/**
 * Centralized lookups for the `common` namespace keys this app shares across
 * screens. Inline `t(\`evidenceTypes.${type}.label\`)` worked, but every call
 * site duplicated the key shape — these helpers keep the contract in one
 * place so renaming a subtree is a one-file change.
 */

export function evidenceLabel(t: TFunction, type: EvidenceTypeValue): string {
  return t(`evidenceTypes.${type}.label`);
}

export function evidenceShortLabel(
  t: TFunction,
  type: EvidenceTypeValue,
): string {
  return t(`evidenceTypes.${type}.shortLabel`);
}

/**
 * Composite screen-reader label for a theme option: "<name>. <description>".
 * Used by both ThemeSwitcher and ThemeChipGrid so the a11y contract stays
 * single-sourced.
 */
export function themeA11yLabel(t: TFunction, id: ThemeName): string {
  const label = t(`theme.options.${id}.label`);
  const description = t(`theme.options.${id}.description`);
  return `${label}. ${description}`;
}
