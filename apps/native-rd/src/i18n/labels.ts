import type { Namespace, TFunction } from "i18next";

import type { EvidenceTypeValue } from "../types/evidence";
import type { ThemeName } from "../themes/compose";

/**
 * Centralized lookups for the `common` namespace keys this app shares across
 * screens. Every call passes `{ ns: "common" }` so the helpers resolve against
 * the common namespace regardless of which namespace the caller's `t` is bound
 * to via `useTranslation(...)`. The `NS` generic widens acceptance to both
 * scalar (`useTranslation("foo")`) and array (`useTranslation(["foo", "common"])`)
 * hook forms — the runtime ns override makes the binding irrelevant.
 */

const COMMON_NS = { ns: "common" } as const;

export function evidenceLabel<NS extends Namespace>(
  t: TFunction<NS>,
  type: EvidenceTypeValue,
): string {
  return t(`evidenceTypes.${type}.label`, COMMON_NS);
}

export function evidenceShortLabel<NS extends Namespace>(
  t: TFunction<NS>,
  type: EvidenceTypeValue,
): string {
  return t(`evidenceTypes.${type}.shortLabel`, COMMON_NS);
}

/**
 * Composite screen-reader label for a theme option: "<name>. <description>".
 * Used by both ThemeSwitcher and ThemeChipGrid so the a11y contract stays
 * single-sourced.
 */
export function themeA11yLabel<NS extends Namespace>(
  t: TFunction<NS>,
  id: ThemeName,
): string {
  const label = t(`theme.options.${id}.label`, COMMON_NS);
  const description = t(`theme.options.${id}.description`, COMMON_NS);
  return `${label}. ${description}`;
}
